#![allow(deprecated)]

use chrono::Utc;
use sqlx::{PgPool, Row};
use std::sync::Arc;
use twilight_http::{request::AuditLogReason, Client as HttpClient};
use twilight_model::{
    application::interaction::{
        application_command::CommandOptionValue, modal::ModalInteractionData, Interaction, InteractionData,
    },
    channel::message::{
        component::{ActionRow, Button, ButtonStyle, Component, TextInput, TextInputStyle},
        Embed, MessageFlags,
    },
    http::interaction::{InteractionResponse, InteractionResponseType, InteractionResponseData},
    id::{
        marker::{GuildMarker, RoleMarker, UserMarker},
        Id,
    },
    util::Timestamp,
};
use twilight_util::builder::{
    command::{CommandBuilder, RoleBuilder, StringBuilder, UserBuilder},
    embed::{EmbedBuilder, EmbedFooterBuilder},
};

use crate::utils::{parse_duration, COLOR_ERROR, COLOR_PURPLE, COLOR_SUCCESS, FOOTER_TEXT};

pub fn register_ban() -> twilight_model::application::command::Command {
    CommandBuilder::new("ban", "Bannir un membre du serveur", twilight_model::application::command::CommandType::ChatInput)
        .option(UserBuilder::new("membre", "Le membre à bannir").required(true))
        .option(StringBuilder::new("temps", "Durée du bannissement (ex: 7d, 30d, permanent)").required(false))
        .option(StringBuilder::new("raison", "Motif de la sanction").required(false))
        .build()
}

pub fn register_mute() -> twilight_model::application::command::Command {
    CommandBuilder::new("mute", "Rendre muet un membre temporairement", twilight_model::application::command::CommandType::ChatInput)
        .option(UserBuilder::new("membre", "Le membre à rendre muet").required(true))
        .option(StringBuilder::new("temps", "Durée du mute (ex: 10m, 1h, 1d)").required(true))
        .option(StringBuilder::new("raison", "Motif de la sanction").required(false))
        .build()
}

pub fn register_kick() -> twilight_model::application::command::Command {
    CommandBuilder::new("kick", "Expulser un membre du serveur", twilight_model::application::command::CommandType::ChatInput)
        .option(UserBuilder::new("membre", "Le membre à expulser").required(true))
        .option(StringBuilder::new("raison", "Motif de la sanction").required(false))
        .build()
}

pub fn register_promote() -> twilight_model::application::command::Command {
    CommandBuilder::new("promote", "Promouvoir un membre du staff (rôles + annonce)", twilight_model::application::command::CommandType::ChatInput)
        .option(UserBuilder::new("membre", "Le membre promu").required(true))
        .option(RoleBuilder::new("role", "Le nouveau rôle attribué").required(true))
        .option(RoleBuilder::new("autre_role", "L'ancien rôle à retirer").required(false))
        .option(StringBuilder::new("raison", "Félicitations ou description").required(false))
        .build()
}

pub fn register_demote() -> twilight_model::application::command::Command {
    CommandBuilder::new("demote", "Rétrograder un staff ou mettre fin à ses fonctions (rôles + annonce)", twilight_model::application::command::CommandType::ChatInput)
        .option(UserBuilder::new("membre", "Le membre concerné").required(true))
        .option(RoleBuilder::new("role", "Le rôle à retirer").required(true))
        .option(RoleBuilder::new("autre_role", "Rôle de remplacement à donner").required(false))
        .option(StringBuilder::new("raison", "Motif").required(false))
        .build()
}

fn gen_sanction_id() -> String {
    format!("{:06x}", rand::random::<u32>() & 0x00ffffff)
}

async fn reply_with(http: &HttpClient, i: &Interaction, data: InteractionResponseData) -> anyhow::Result<()> {
    let resp = InteractionResponse { kind: InteractionResponseType::ChannelMessageWithSource, data: Some(data) };
    http.interaction(i.application_id).create_response(i.id, &i.token, &resp).await?;
    Ok(())
}

async fn reply_embed(http: &HttpClient, i: &Interaction, embed: Embed, ephemeral: bool) -> anyhow::Result<()> {
    let flags = ephemeral.then_some(MessageFlags::EPHEMERAL);
    reply_with(http, i, InteractionResponseData { embeds: Some(vec![embed]), flags, ..Default::default() }).await
}

async fn reply_text(http: &HttpClient, i: &Interaction, content: String) -> anyhow::Result<()> {
    reply_with(http, i, InteractionResponseData { content: Some(content), flags: Some(MessageFlags::EPHEMERAL), ..Default::default() }).await
}

/// Refuse de sanctionner le bot, le propriétaire ou un membre dont le rôle est égal ou supérieur à celui du modérateur.
/// En cas d'échec de lecture Discord on refuse (mieux vaut bloquer qu'ouvrir).
async fn check_hierarchy(
    http: &HttpClient,
    guild: Id<GuildMarker>,
    author: Id<UserMarker>,
    target: Id<UserMarker>,
) -> Result<(), &'static str> {
    const FAIL: &str = "Impossible de vérifier la hiérarchie des rôles, sanction annulée.";
    let g = http.guild(guild).await.map_err(|_| FAIL)?.model().await.map_err(|_| FAIL)?;
    if target == g.owner_id {
        return Err("Le propriétaire du serveur ne peut pas être sanctionné.");
    }
    let me = http.current_user().await.map_err(|_| FAIL)?.model().await.map_err(|_| FAIL)?;
    if target == me.id {
        return Err("Je ne peux pas me sanctionner moi-même.");
    }
    if author == g.owner_id {
        return Ok(());
    }
    let pos: std::collections::HashMap<_, _> = g.roles.iter().map(|r| (r.id, r.position)).collect();
    let top = |roles: &[Id<RoleMarker>]| roles.iter().filter_map(|r| pos.get(r).copied()).max().unwrap_or(-1);
    let a = http.guild_member(guild, author).await.map_err(|_| FAIL)?.model().await.map_err(|_| FAIL)?;
    // Cible hors du serveur (ban d'un ex-membre) : rien à comparer.
    let Ok(t) = http.guild_member(guild, target).await else { return Ok(()) };
    let t = t.model().await.map_err(|_| FAIL)?;
    if top(&t.roles) >= top(&a.roles) {
        return Err("Ce membre a un rôle égal ou supérieur au tien.");
    }
    Ok(())
}

pub async fn run_sanction(
    interaction: Interaction,
    http: Arc<HttpClient>,
    db: PgPool,
    sanction_type: &str,
) -> anyhow::Result<()> {
    let guild_id = match interaction.guild_id {
        Some(id) => id,
        None => return Ok(()),
    };

    let author_id = match interaction.author_id() {
        Some(id) => id,
        None => return Ok(()),
    };

    let mut target_id = None;
    let mut duration_str = None;
    let mut reason = "Aucune raison spécifiée".to_string();

    if let Some(InteractionData::ApplicationCommand(cmd_data)) = &interaction.data {
        for option in &cmd_data.options {
            match option.name.as_str() {
                "membre" => {
                    if let CommandOptionValue::User(u_id) = &option.value {
                        target_id = Some(*u_id);
                    }
                }
                "temps" => {
                    if let CommandOptionValue::String(s) = &option.value {
                        duration_str = Some(s.clone());
                    }
                }
                "raison" => {
                    if let CommandOptionValue::String(s) = &option.value {
                        reason = s.clone();
                    }
                }
                _ => {}
            }
        }
    }

    let target_id = match target_id {
        Some(id) => id,
        None => return Ok(()),
    };

    if target_id == author_id {
        let embed = EmbedBuilder::new()
            .description("Vous ne pouvez pas vous sanctionner vous-même !")
            .color(COLOR_ERROR)
            .build();
        return reply_embed(&http, &interaction, embed, true).await;
    }

    if let Err(why) = check_hierarchy(&http, guild_id, author_id, target_id).await {
        let embed = EmbedBuilder::new().description(format!("❌ {why}")).color(COLOR_ERROR).build();
        return reply_embed(&http, &interaction, embed, true).await;
    }

    let sanction_id = gen_sanction_id();
    let gid_i64 = guild_id.get() as i64;
    let uid_i64 = target_id.get() as i64;
    let mid_i64 = author_id.get() as i64;

    sqlx::query(
        r#"
        INSERT INTO sanctions (id, guild_id, user_id, mod_id, sanction_type, duration, reason, created_at, appealed)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), FALSE)
        "#
    )
    .bind(&sanction_id)
    .bind(gid_i64)
    .bind(uid_i64)
    .bind(mid_i64)
    .bind(sanction_type)
    .bind(&duration_str)
    .bind(&reason)
    .execute(&db)
    .await?;

    let dm_channel = http.create_private_channel(target_id).await?.model().await?;
    let dm_embed = EmbedBuilder::new()
        .description(format!("{}\n\n{}", format!("## {} | Notification de sanction : {}", crate::utils::emoji::SANCTION, sanction_type.to_uppercase()), format!(
            "Vous avez reçu une sanction sur le serveur **Paranoia SMP**.\n\n\
            🆔 **ID Sanction :** `{}`\n\
            ⚖️ **Type :** `{}`\n\
            ⏳ **Durée :** `{}`\n\
            📝 **Motif :** {}\n\n\
            Si vous estimez qu'il s'agit d'une erreur, vous pouvez contester cette sanction en cliquant sur le bouton ci-dessous.",
            sanction_id,
            sanction_type,
            duration_str.as_deref().unwrap_or("Permanente / Non spécifiée"),
            reason
        )))
        .color(COLOR_ERROR)
        .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
        .build();

    let appeal_btn = Button {
        id: None,
        custom_id: Some(format!("appeal_open:{}", sanction_id)),
        disabled: false,
        emoji: None,
        label: Some("⚖️ Faire un appel".to_string()),
        style: ButtonStyle::Primary,
        url: None,
        sku_id: None,
    };

    let _ = http
        .create_message(dm_channel.id)
        .embeds(&[dm_embed])
        .components(&[Component::ActionRow(ActionRow {
            id: None,
            components: vec![Component::Button(appeal_btn)],
        })])
        .await;

    match sanction_type {
        "ban" => {
            let _ = http.create_ban(guild_id, target_id).reason(&reason).await;
        }
        "mute" => {
            let duration = duration_str.as_deref().and_then(parse_duration).unwrap_or(chrono::Duration::hours(1));
            let timeout_until = Utc::now() + duration;
            if let Ok(ts) = Timestamp::from_secs(timeout_until.timestamp()) {
                let _ = http.update_guild_member(guild_id, target_id)
                    .communication_disabled_until(Some(ts))
                    .await;
            }
        }
        "kick" => {
            let _ = http.remove_guild_member(guild_id, target_id).reason(&reason).await;
        }
        _ => {}
    }

    let confirm_embed = EmbedBuilder::new()
        .description(format!("{}\n\n{}", format!("## {} | Sanction appliquée : {}", crate::utils::emoji::SANCTION, sanction_type.to_uppercase()), format!(
            "✅ <@{}> a été sanctionné avec succès.\n\n\
            🆔 **ID Sanction :** `{}`\n\
            📝 **Motif :** {}",
            target_id, sanction_id, reason
        )))
        .color(COLOR_SUCCESS)
        .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
        .build();

    reply_embed(&http, &interaction, confirm_embed, false).await
}

/// Promote/demote : applique réellement les rôles puis annonce. `promote` = `role` ajouté (et `autre_role` retiré); sinon `role` retiré (et `autre_role` ajouté).
async fn run_rank(interaction: Interaction, http: Arc<HttpClient>, promote: bool) -> anyhow::Result<()> {
    let Some(guild) = interaction.guild_id else { return Ok(()) };
    let (mut member, mut role, mut other, mut reason) = (None, None, None, None::<String>);
    if let Some(InteractionData::ApplicationCommand(d)) = &interaction.data {
        for o in &d.options {
            match (o.name.as_str(), &o.value) {
                ("membre", CommandOptionValue::User(u)) => member = Some(*u),
                ("role", CommandOptionValue::Role(r)) => role = Some(*r),
                ("autre_role", CommandOptionValue::Role(r)) => other = Some(*r),
                ("raison", CommandOptionValue::String(s)) => reason = Some(s.clone()),
                _ => {}
            }
        }
    }
    let (Some(member), Some(role)) = (member, role) else { return Ok(()) };
    let (add, remove) = if promote { (Some(role), other) } else { (other, Some(role)) };
    let audit: String = format!("{} par {}", if promote { "Promotion" } else { "Rétrogradation" }, interaction.author_id().map(|a| a.to_string()).unwrap_or_default())
        .chars().take(400).collect();

    // On retire avant d'ajouter; la première erreur (hiérarchie, permission) est renvoyée au staff sans annonce.
    let mut failure = None;
    if let Some(r) = remove {
        if let Err(e) = http.remove_guild_member_role(guild, member, r).reason(&audit).await {
            failure = Some(format!("retrait de <@&{r}> : {e}"));
        }
    }
    if let (None, Some(a)) = (&failure, add) {
        if let Err(e) = http.add_guild_member_role(guild, member, a).reason(&audit).await {
            failure = Some(format!("ajout de <@&{a}> : {e}"));
        }
    }
    if let Some(f) = failure {
        return reply_text(&http, &interaction, format!("❌ Échec du {f}
Vérifie que mon rôle est au-dessus des rôles concernés.")).await;
    }

    let reason = reason.unwrap_or_else(|| if promote { "Félicitations pour ton investissement au sein du staff !" } else { "Merci pour ton aide et bonne continuation." }.to_string());
    let avatar = match http.user(member).await.ok() {
        Some(r) => r.model().await.ok().and_then(|u| u.avatar.map(|h| format!("https://cdn.discordapp.com/avatars/{member}/{h}.{}", if h.is_animated() { "gif" } else { "png" }))),
        None => None,
    }
    .unwrap_or_else(|| format!("https://cdn.discordapp.com/embed/avatars/{}.png", (member.get() >> 22) % 6));
    let author = interaction.author_id();
    let card = rank_card(promote, member, role, add, remove, &reason, &avatar, author);
    // Les composants V2 ne passent pas par twilight 0.17 : appel brut (le jeton d'interaction suffit), repli sur un embed classique.
    let sent = reqwest::Client::new()
        .post(format!("https://discord.com/api/v10/interactions/{}/{}/callback", interaction.id, interaction.token))
        .json(&serde_json::json!({ "type": 4, "data": card }))
        .send()
        .await
        .is_ok_and(|r| r.status().is_success());
    if sent {
        return Ok(());
    }
    let (title, color) = if promote { ("Promotion au sein du Staff !", COLOR_SUCCESS) } else { ("Changement au sein du Staff", COLOR_ERROR) };
    let icon = if promote { crate::utils::emoji::PROMOTE } else { crate::utils::emoji::DEMOTE };
    let embed = EmbedBuilder::new()
        .description(format!("{}\n\n{}", format!("## {} | {title}", icon), format!("<@{member}> · <@&{role}>\n\n*{reason}*")))
        .color(color)
        .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
        .build();
    reply_embed(&http, &interaction, embed, false).await
}

/// Carte « événement » (composants V2) pour une promotion ou une rétrogradation.
#[allow(clippy::too_many_arguments)]
fn rank_card(
    promote: bool,
    member: Id<UserMarker>,
    role: Id<RoleMarker>,
    add: Option<Id<RoleMarker>>,
    remove: Option<Id<RoleMarker>>,
    reason: &str,
    avatar: &str,
    author: Option<Id<UserMarker>>,
) -> serde_json::Value {
    let text = |c: String| serde_json::json!({ "type": 10, "content": c });
    let divider = serde_json::json!({ "type": 14, "divider": true, "spacing": 2 });
    let gap = serde_json::json!({ "type": 14, "divider": false, "spacing": 2 });
    let (up, down) = (crate::utils::emoji::PROMOTE, crate::utils::emoji::DEMOTE);
    let (accent, headline, lead) = if promote {
        (0xfbbf24, format!("# {up} PROMOTION {up}"), format!("## <@{member}>\nest promu au rang de <@&{role}>"))
    } else {
        (0xef4444, format!("# {down} CHANGEMENT DE RANG {down}"), format!("## <@{member}>\nquitte ses fonctions de <@&{role}>"))
    };
    let (from, to) = if promote { (remove, add.or(Some(role))) } else { (Some(role), add) };
    let fmt = |r: Option<Id<RoleMarker>>| r.map(|r| format!("<@&{r}>")).unwrap_or_else(|| "*aucun*".to_string());
    let now = chrono::Utc::now().timestamp();
    let by = author.map(|a| format!("<@{a}>")).unwrap_or_else(|| "le staff".to_string());
    let reason: String = reason.chars().take(500).collect::<String>().lines().map(|l| format!("> {l}")).collect::<Vec<_>>().join("\n");
    serde_json::json!({
        "flags": 32768,
        "components": [{
            "type": 17,
            "accent_color": accent,
            "components": [
                text(headline), gap.clone(),
                { "type": 9, "components": [text(lead)], "accessory": { "type": 11, "media": { "url": avatar } } },
                divider.clone(),
                text(format!("### Évolution\n{} ➜ {}", fmt(from), fmt(to))), gap.clone(),
                text(format!("### Message\n{reason}")), divider,
                text(format!("-# Annoncé par {by} · <t:{now}:F>")),
            ]
        }]
    })
}

pub async fn run_promote(interaction: Interaction, http: Arc<HttpClient>) -> anyhow::Result<()> {
    run_rank(interaction, http, true).await
}

pub async fn run_demote(interaction: Interaction, http: Arc<HttpClient>) -> anyhow::Result<()> {
    run_rank(interaction, http, false).await
}

pub async fn handle_appeal_button(
    interaction: Interaction,
    http: Arc<HttpClient>,
    sanction_id: &str,
) -> anyhow::Result<()> {
    let modal = InteractionResponse {
        kind: InteractionResponseType::Modal,
        data: Some(InteractionResponseData {
            custom_id: Some(format!("modal_appeal:{}", sanction_id)),
            title: Some("Contestation de Sanction".to_string()),
            components: Some(vec![
                Component::ActionRow(ActionRow {
                    id: None,
                    components: vec![Component::TextInput(TextInput {
                        id: None,
                        custom_id: "pseudo_mc".to_string(),
                        label: Some("Votre pseudo Minecraft (optionnel)".to_string()),
                        max_length: Some(32),
                        min_length: Some(0),
                        placeholder: Some("Ex: Leoo955".to_string()),
                        required: Some(false),
                        style: TextInputStyle::Short,
                        value: None,
                    })],
                }),
                Component::ActionRow(ActionRow {
                    id: None,
                    components: vec![Component::TextInput(TextInput {
                        id: None,
                        custom_id: "arguments".to_string(),
                        label: Some("Vos arguments et justifications".to_string()),
                        max_length: Some(1000),
                        min_length: Some(15),
                        placeholder: Some("Expliquez pourquoi vous estimez que cette sanction doit être levée...".to_string()),
                        required: Some(true),
                        style: TextInputStyle::Paragraph,
                        value: None,
                    })],
                }),
            ]),
            ..Default::default()
        }),
    };

    http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &modal)
        .await?;

    Ok(())
}

pub async fn handle_appeal_modal_submit(
    interaction: Interaction,
    http: Arc<HttpClient>,
    db: PgPool,
    sanction_id: &str,
    modal_data: &ModalInteractionData,
    channel_log_id: u64,
) -> anyhow::Result<()> {
    let mut pseudo_mc = None;
    let mut arguments = String::new();

    let inputs = crate::utils::extract_modal_inputs(&modal_data.components);
    for (custom_id, val) in inputs {
        match custom_id.as_str() {
            "pseudo_mc" => {
                if !val.trim().is_empty() {
                    pseudo_mc = Some(val.trim().to_string());
                }
            }
            "arguments" => {
                arguments = val.trim().to_string();
            }
            _ => {}
        }
    }

    let author_id = interaction.author_id().unwrap();
    let appeal_id = format!("appeal_{}", sanction_id);

    sqlx::query(
        r#"
        INSERT INTO appeals (id, sanction_id, pseudo_mc, arguments, status, created_at)
        VALUES ($1, $2, $3, $4, 'pending', NOW())
        ON CONFLICT (id) DO UPDATE SET arguments = EXCLUDED.arguments, status = 'pending'
        "#
    )
    .bind(&appeal_id)
    .bind(sanction_id)
    .bind(&pseudo_mc)
    .bind(&arguments)
    .execute(&db)
    .await?;

    sqlx::query(
        r#"UPDATE sanctions SET appealed = TRUE WHERE id = $1"#
    )
    .bind(sanction_id)
    .execute(&db)
    .await?;

    let staff_embed = EmbedBuilder::new()
        .description(format!("{}\n\n{}", format!("## {} | Nouvelle Contestation : Sanction #{}", crate::utils::emoji::SANCTION, sanction_id), format!(
            "**Auteur :** <@{}>\n**Pseudo Minecraft :** {}\n\n**Arguments :**\n```\n{}\n```",
            author_id,
            pseudo_mc.as_deref().unwrap_or("Non renseigné"),
            arguments
        )))
        .color(COLOR_PURPLE)
        .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
        .build();

    let staff_buttons = vec![
        Button {
            id: None,
            custom_id: Some(format!("appeal_staff_accept:{}", sanction_id)),
            disabled: false,
            emoji: None,
            label: Some("Accepter l'appel".to_string()),
            style: ButtonStyle::Success,
            url: None,
            sku_id: None,
        },
        Button {
            id: None,
            custom_id: Some(format!("appeal_staff_reject:{}", sanction_id)),
            disabled: false,
            emoji: None,
            label: Some("Rejeter l'appel".to_string()),
            style: ButtonStyle::Danger,
            url: None,
            sku_id: None,
        },
    ];

    let _ = http
        .create_message(Id::new(channel_log_id))
        .embeds(&[staff_embed])
        .components(&[Component::ActionRow(ActionRow {
            id: None,
            components: staff_buttons.into_iter().map(Component::Button).collect(),
        })])
        .await;

    reply_text(&http, &interaction, "Votre demande d'appel a été envoyée à l'équipe de modération. Vous recevrez une réponse prochainement.".into()).await
}

pub async fn handle_staff_appeal_decision(
    interaction: Interaction,
    http: Arc<HttpClient>,
    db: PgPool,
    action: &str,
    sanction_id: &str,
) -> anyhow::Result<()> {
    let appeal_id = format!("appeal_{}", sanction_id);
    let new_status = if action == "accept" { "accepted" } else { "rejected" };

    sqlx::query(
        r#"UPDATE appeals SET status = $1 WHERE id = $2"#
    )
    .bind(new_status)
    .bind(&appeal_id)
    .execute(&db)
    .await?;

    let sanction = sqlx::query(
        r#"SELECT user_id, sanction_type FROM sanctions WHERE id = $1"#
    )
    .bind(sanction_id)
    .fetch_optional(&db)
    .await?;

    if let Some(s) = sanction {
        let user_id_i64: i64 = s.try_get("user_id").unwrap_or(0);
        let target_user_id = Id::<UserMarker>::new(user_id_i64 as u64);
        if let Ok(dm) = http.create_private_channel(target_user_id).await {
            let dm_channel = dm.model().await?;
            let (status_text, color) = if action == "accept" {
                ("✅ Votre appel a été **accepté** par le staff. Votre sanction a été levée.", COLOR_SUCCESS)
            } else {
                ("❌ Votre appel a été **rejeté** par le staff. La sanction est maintenue.", COLOR_ERROR)
            };

            let dm_msg = EmbedBuilder::new()
                .description(format!("{}\n\n{}", format!("## {} | Décision concernant votre appel", crate::utils::emoji::SANCTION), format!(
                    "Dossier de sanction : `#{}`\n\n{}",
                    sanction_id, status_text
                )))
                .color(color)
                .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
                .build();

            let _ = http.create_message(dm_channel.id).embeds(&[dm_msg]).await;
        }
    }

    reply_text(&http, &interaction, format!("Décision enregistrée : appel **{}**.", new_status)).await
}
pub fn register_warn() -> twilight_model::application::command::Command {
    CommandBuilder::new("warn", "Avertir un membre", twilight_model::application::command::CommandType::ChatInput)
        .option(UserBuilder::new("membre", "Le membre a avertir").required(true))
        .option(StringBuilder::new("raison", "Motif de l'avertissement").required(true))
        .build()
}

pub fn register_warnings() -> twilight_model::application::command::Command {
    CommandBuilder::new("warnings", "Voir les avertissements d'un membre", twilight_model::application::command::CommandType::ChatInput)
        .option(UserBuilder::new("membre", "Le membre").required(true))
        .build()
}

pub fn register_clear() -> twilight_model::application::command::Command {
    CommandBuilder::new("clear", "Supprimer des messages", twilight_model::application::command::CommandType::ChatInput)
        .option(twilight_util::builder::command::IntegerBuilder::new("nombre", "Nombre de messages (max 100)").required(true))
        .build()
}

pub async fn run_warn(interaction: Interaction, http: Arc<HttpClient>, db: PgPool) -> anyhow::Result<()> {
    let target_id = if let Some(InteractionData::ApplicationCommand(cmd_data)) = &interaction.data {
        if let Some(CommandOptionValue::User(u_id)) = cmd_data.options.iter().find(|o| o.name == "membre").map(|o| &o.value) {
            *u_id
        } else { return Ok(()); }
    } else { return Ok(()); };

    let reason = if let Some(InteractionData::ApplicationCommand(cmd_data)) = &interaction.data {
        if let Some(CommandOptionValue::String(r)) = cmd_data.options.iter().find(|o| o.name == "raison").map(|o| &o.value) {
            r.clone()
        } else { String::new() }
    } else { String::new() };

    let guild_id = interaction.guild_id.unwrap().get().to_string();
    let author_id = interaction.author_id().unwrap().get().to_string();

    sqlx::query(r#"INSERT INTO "Warn" (id, "userId", "guildId", "reason", "authorId") VALUES ($1, $2, $3, $4, $5)"#)
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(target_id.get().to_string())
        .bind(&guild_id)
        .bind(&reason)
        .bind(&author_id)
        .execute(&db).await?;

    let embed = EmbedBuilder::new().description(format!("{}\n\n{}", format!("## {} | Avertissement", crate::utils::emoji::SANCTION), format!("<@{}> a été averti.\n**Raison:** {}", target_id, reason))).color(COLOR_ERROR).build();
    reply_embed(&http, &interaction, embed, false).await
}

pub async fn run_warnings(interaction: Interaction, http: Arc<HttpClient>, db: PgPool) -> anyhow::Result<()> {
    let target_id = if let Some(InteractionData::ApplicationCommand(cmd_data)) = &interaction.data {
        if let Some(CommandOptionValue::User(u_id)) = cmd_data.options.iter().find(|o| o.name == "membre").map(|o| &o.value) {
            *u_id
        } else { return Ok(()); }
    } else { return Ok(()); };

    let guild_id = interaction.guild_id.unwrap().get().to_string();

    let rows = sqlx::query(r#"SELECT reason, "authorId", "createdAt" FROM "Warn" WHERE "userId" = $1 AND "guildId" = $2 ORDER BY "createdAt" DESC LIMIT 10"#)
        .bind(target_id.get().to_string())
        .bind(&guild_id)
        .fetch_all(&db).await?;

    let mut desc = String::new();
    for row in rows {
        let r: String = row.try_get("reason").unwrap_or_default();
        let a: String = row.try_get("authorId").unwrap_or_default();
        desc.push_str(&format!("- **{}** (par <@{}>)\n", r, a));
    }
    if desc.is_empty() { desc = "Aucun avertissement.".to_string(); }

    let embed = EmbedBuilder::new().description(format!("{}\n\n{}", format!("## {} | Avertissements de <@{}>", crate::utils::emoji::SANCTION, target_id), desc)).color(COLOR_ERROR).build();
    reply_embed(&http, &interaction, embed, false).await
}

pub async fn run_clear(interaction: Interaction, http: Arc<HttpClient>) -> anyhow::Result<()> {
    let mut count = 0;
    if let Some(InteractionData::ApplicationCommand(cmd_data)) = &interaction.data {
        if let Some(CommandOptionValue::Integer(c)) = cmd_data.options.iter().find(|o| o.name == "nombre").map(|o| &o.value) {
            count = *c;
        }
    }
    if count <= 0 || count > 100 { return Ok(()); }
    
    if let Some(ch_id) = interaction.channel_id {
        let messages = http.channel_messages(ch_id).limit(count as u16).await?.models().await?;
        let msg_ids: Vec<_> = messages.iter().map(|m| m.id).collect();
        if !msg_ids.is_empty() {
            let _ = http.delete_messages(ch_id, &msg_ids).await;
        }
    }
    let embed = EmbedBuilder::new().description(format!("✅ {} messages supprimés.", count)).color(COLOR_SUCCESS).build();
    reply_embed(&http, &interaction, embed, true).await
}

pub fn register_unban() -> twilight_model::application::command::Command {
    CommandBuilder::new("unban", "Débannir un membre", twilight_model::application::command::CommandType::ChatInput)
        .option(UserBuilder::new("membre", "Le membre à débannir").required(true))
        .build()
}

pub fn register_unmute() -> twilight_model::application::command::Command {
    CommandBuilder::new("unmute", "Retirer le mute d'un membre", twilight_model::application::command::CommandType::ChatInput)
        .option(UserBuilder::new("membre", "Le membre à unmute").required(true))
        .build()
}

pub fn register_cases() -> twilight_model::application::command::Command {
    CommandBuilder::new("cases", "Historique des sanctions d'un membre", twilight_model::application::command::CommandType::ChatInput)
        .option(UserBuilder::new("membre", "Le membre").required(true))
        .build()
}

fn target_option(interaction: &Interaction) -> Option<Id<UserMarker>> {
    let Some(InteractionData::ApplicationCommand(d)) = &interaction.data else { return None };
    d.options.iter().find_map(|o| match (&*o.name, &o.value) {
        ("membre", CommandOptionValue::User(u)) => Some(*u),
        _ => None,
    })
}

/// `unban` ou `unmute` : lève la sanction côté Discord et la journalise.
pub async fn run_lift(interaction: Interaction, http: Arc<HttpClient>, db: PgPool, kind: &str) -> anyhow::Result<()> {
    let (Some(guild_id), Some(mod_id), Some(target)) = (interaction.guild_id, interaction.author_id(), target_option(&interaction)) else {
        return Ok(());
    };
    let done = if kind == "unban" {
        http.delete_ban(guild_id, target).await.is_ok()
    } else {
        http.update_guild_member(guild_id, target).communication_disabled_until(None).await.is_ok()
    };
    if !done {
        let e = EmbedBuilder::new().description("Impossible de lever la sanction (membre non banni/mute ou permissions manquantes).").color(COLOR_ERROR).build();
        return reply_embed(&http, &interaction, e, true).await;
    }
    sqlx::query("INSERT INTO sanctions (id, guild_id, user_id, mod_id, sanction_type, created_at, appealed) VALUES ($1, $2, $3, $4, $5, NOW(), FALSE)")
        .bind(gen_sanction_id())
        .bind(guild_id.get() as i64)
        .bind(target.get() as i64)
        .bind(mod_id.get() as i64)
        .bind(kind)
        .execute(&db)
        .await?;
    let e = EmbedBuilder::new().description(format!("✅ `{kind}` appliqué à <@{target}>.")).color(COLOR_SUCCESS).footer(EmbedFooterBuilder::new(FOOTER_TEXT)).build();
    reply_embed(&http, &interaction, e, false).await
}

pub async fn run_cases(interaction: Interaction, http: Arc<HttpClient>, db: PgPool) -> anyhow::Result<()> {
    let (Some(guild_id), Some(target)) = (interaction.guild_id, target_option(&interaction)) else { return Ok(()) };
    let rows = sqlx::query(
        "SELECT id, sanction_type, reason, mod_id, created_at FROM sanctions WHERE guild_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 15",
    )
    .bind(guild_id.get() as i64)
    .bind(target.get() as i64)
    .fetch_all(&db)
    .await?;
    let mut desc = String::new();
    for r in rows {
        let id: String = r.try_get("id")?;
        let kind: String = r.try_get("sanction_type")?;
        let reason: Option<String> = r.try_get("reason")?;
        let mod_id: i64 = r.try_get("mod_id")?;
        let at: chrono::DateTime<Utc> = r.try_get("created_at")?;
        desc.push_str(&format!("`{id}` **{kind}** <t:{}:d> par <@{mod_id}> — {}\n", at.timestamp(), reason.unwrap_or_else(|| "—".into())));
    }
    if desc.is_empty() {
        desc = "Aucune sanction.".into();
    }
    let e = EmbedBuilder::new().description(format!("{}\n\n{}", format!("## {} | Historique de <@{target}>", crate::utils::emoji::SANCTION), desc)).color(COLOR_PURPLE).build();
    reply_embed(&http, &interaction, e, true).await
}

pub fn register_slowmode() -> twilight_model::application::command::Command {
    CommandBuilder::new("slowmode", "Définir le mode lent du salon (0 pour le retirer)", twilight_model::application::command::CommandType::ChatInput)
        .default_member_permissions(twilight_model::guild::Permissions::MANAGE_CHANNELS)
        .option(twilight_util::builder::command::IntegerBuilder::new("secondes", "Délai entre deux messages (0 à 21600)").required(true).min_value(0).max_value(21600))
        .build()
}

pub async fn run_slowmode(interaction: Interaction, http: Arc<HttpClient>) -> anyhow::Result<()> {
    let secs = match &interaction.data {
        Some(InteractionData::ApplicationCommand(d)) => d.options.iter().find_map(|o| match (&*o.name, &o.value) {
            ("secondes", CommandOptionValue::Integer(n)) => Some(*n),
            _ => None,
        }),
        _ => None,
    };
    let (Some(secs), Some(ch)) = (secs.filter(|n| (0..=21600).contains(n)), interaction.channel_id) else { return Ok(()) };
    http.update_channel(ch).rate_limit_per_user(secs as u16).await?;
    let text = if secs == 0 { "Mode lent désactivé.".to_string() } else { format!("Mode lent réglé sur {secs} s.") };
    reply_embed(&http, &interaction, EmbedBuilder::new().description(text).color(COLOR_SUCCESS).build(), true).await
}

#[cfg(test)]
mod rank_tests {
    use super::*;

    #[test]
    fn rank_card_shows_both_roles_and_quotes_reason() {
        let (u, new, old) = (Id::new(1), Id::new(2), Id::new(3));
        let c = rank_card(true, u, new, None, Some(old), "ligne 1\nligne 2", "https://x/a.png", None).to_string();
        assert!(c.contains("<@&3> ➜ <@&2>") && c.contains("> ligne 1\\n> ligne 2") && c.contains("PROMOTION"));
        let d = rank_card(false, u, new, Some(old), None, "ok", "https://x/a.png", None).to_string();
        assert!(d.contains("<@&2> ➜ <@&3>") && d.contains("CHANGEMENT DE RANG"));
    }
}
