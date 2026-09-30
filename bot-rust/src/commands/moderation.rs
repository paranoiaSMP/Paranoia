#![allow(deprecated, unused_imports)]

use chrono::Utc;
use sqlx::{PgPool, Row};
use std::sync::Arc;
use twilight_http::{request::AuditLogReason, Client as HttpClient};
use twilight_model::{
    application::interaction::{
        application_command::CommandOptionValue, modal::{ModalInteractionComponent, ModalInteractionData}, Interaction, InteractionData,
    },
    channel::message::{
        component::{ActionRow, Button, ButtonStyle, Component, TextInput, TextInputStyle},
    },
    guild::Permissions,
    http::interaction::{InteractionResponse, InteractionResponseType, InteractionResponseData},
    id::{
        marker::UserMarker,
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
        .default_member_permissions(Permissions::BAN_MEMBERS)
        .option(UserBuilder::new("membre", "Le membre à bannir").required(true))
        .option(StringBuilder::new("temps", "Durée du bannissement (ex: 7d, 30d, permanent)").required(false))
        .option(StringBuilder::new("raison", "Motif de la sanction").required(false))
        .build()
}

pub fn register_mute() -> twilight_model::application::command::Command {
    CommandBuilder::new("mute", "Rendre muet un membre temporairement", twilight_model::application::command::CommandType::ChatInput)
        .default_member_permissions(Permissions::MODERATE_MEMBERS)
        .option(UserBuilder::new("membre", "Le membre à rendre muet").required(true))
        .option(StringBuilder::new("temps", "Durée du mute (ex: 10m, 1h, 1d)").required(true))
        .option(StringBuilder::new("raison", "Motif de la sanction").required(false))
        .build()
}

pub fn register_kick() -> twilight_model::application::command::Command {
    CommandBuilder::new("kick", "Expulser un membre du serveur", twilight_model::application::command::CommandType::ChatInput)
        .default_member_permissions(Permissions::KICK_MEMBERS)
        .option(UserBuilder::new("membre", "Le membre à expulser").required(true))
        .option(StringBuilder::new("raison", "Motif de la sanction").required(false))
        .build()
}

pub fn register_promote() -> twilight_model::application::command::Command {
    CommandBuilder::new("promote", "Annoncer la promotion d'un membre du staff", twilight_model::application::command::CommandType::ChatInput)
        .default_member_permissions(Permissions::ADMINISTRATOR)
        .option(UserBuilder::new("membre", "Le membre promu").required(true))
        .option(RoleBuilder::new("role", "Le nouveau rôle attribué").required(true))
        .option(StringBuilder::new("raison", "Félicitations ou description").required(false))
        .build()
}

pub fn register_demote() -> twilight_model::application::command::Command {
    CommandBuilder::new("demote", "Annoncer la rétrogradation ou le départ d'un staff", twilight_model::application::command::CommandType::ChatInput)
        .default_member_permissions(Permissions::ADMINISTRATOR)
        .option(UserBuilder::new("membre", "Le membre concerné").required(true))
        .option(StringBuilder::new("ancien_role", "L'ancien rôle occupé").required(true))
        .option(StringBuilder::new("motif", "Motif de la rétrogradation").required(false))
        .build()
}

fn gen_sanction_id() -> String {
    format!("{:06x}", rand::random::<u32>() & 0x00ffffff)
}

pub fn extract_text_inputs(components: &[ModalInteractionComponent]) -> Vec<(String, String)> {
    let mut res = Vec::new();
    for comp in components {
        match comp {
            ModalInteractionComponent::TextInput(input) => {
                res.push((input.custom_id.clone(), input.value.clone()));
            }
            ModalInteractionComponent::ActionRow(row) => {
                for inner in &row.components {
                    if let ModalInteractionComponent::TextInput(input) = inner {
                        res.push((input.custom_id.clone(), input.value.clone()));
                    }
                }
            }
            _ => {}
        }
    }
    res
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
        let resp = InteractionResponse {
            kind: InteractionResponseType::ChannelMessageWithSource,
            data: Some(InteractionResponseData {
                embeds: Some(vec![embed]),
                flags: Some(twilight_model::channel::message::MessageFlags::EPHEMERAL),
                ..Default::default()
            }),
        };
        http.interaction(interaction.application_id)
            .create_response(interaction.id, &interaction.token, &resp)
            .await?;
        return Ok(());
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
        .title(format!("⚠️ Notification de sanction : {}", sanction_type.to_uppercase()))
        .description(format!(
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
        ))
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
        .title(format!("Sanction appliquée : {}", sanction_type.to_uppercase()))
        .description(format!(
            "✅ <@{}> a été sanctionné avec succès.\n\n\
            🆔 **ID Sanction :** `{}`\n\
            📝 **Motif :** {}",
            target_id, sanction_id, reason
        ))
        .color(COLOR_SUCCESS)
        .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
        .build();

    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData {
            embeds: Some(vec![confirm_embed]),
            ..Default::default()
        }),
    };

    http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &response)
        .await?;

    Ok(())
}

pub async fn run_promote(interaction: Interaction, http: Arc<HttpClient>) -> anyhow::Result<()> {
    let mut member_id = None;
    let mut role_id = None;
    let mut reason = "Félicitations pour ton investissement au sein du staff !".to_string();

    if let Some(InteractionData::ApplicationCommand(cmd_data)) = &interaction.data {
        for option in &cmd_data.options {
            match option.name.as_str() {
                "membre" => {
                    if let CommandOptionValue::User(u) = &option.value {
                        member_id = Some(*u);
                    }
                }
                "role" => {
                    if let CommandOptionValue::Role(r) = &option.value {
                        role_id = Some(*r);
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

    let (member_id, role_id) = match (member_id, role_id) {
        (Some(m), Some(r)) => (m, r),
        _ => return Ok(()),
    };

    let embed = EmbedBuilder::new()
        .title("🎉 Promotion au sein du Staff !")
        .description(format!(
            "Félicitations à <@{}> qui est promu au rang de <@&{}> !\n\n*{}*",
            member_id, role_id, reason
        ))
        .color(COLOR_SUCCESS)
        .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
        .build();

    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData {
            embeds: Some(vec![embed]),
            ..Default::default()
        }),
    };

    http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &response)
        .await?;

    Ok(())
}

pub async fn run_demote(interaction: Interaction, http: Arc<HttpClient>) -> anyhow::Result<()> {
    let mut member_id = None;
    let mut old_role = String::new();
    let mut reason = "Merci pour ton aide et bonne continuation.".to_string();

    if let Some(InteractionData::ApplicationCommand(cmd_data)) = &interaction.data {
        for option in &cmd_data.options {
            match option.name.as_str() {
                "membre" => {
                    if let CommandOptionValue::User(u) = &option.value {
                        member_id = Some(*u);
                    }
                }
                "ancien_role" => {
                    if let CommandOptionValue::String(s) = &option.value {
                        old_role = s.clone();
                    }
                }
                "motif" => {
                    if let CommandOptionValue::String(s) = &option.value {
                        reason = s.clone();
                    }
                }
                _ => {}
            }
        }
    }

    let member_id = match member_id {
        Some(m) => m,
        None => return Ok(()),
    };

    let embed = EmbedBuilder::new()
        .title("👋 Fin de fonction au sein du Staff")
        .description(format!(
            "<@{}> quitte ses fonctions de **{}**.\n\n*{}*",
            member_id, old_role, reason
        ))
        .color(COLOR_ERROR)
        .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
        .build();

    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData {
            embeds: Some(vec![embed]),
            ..Default::default()
        }),
    };

    http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &response)
        .await?;

    Ok(())
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

    let inputs = extract_text_inputs(&modal_data.components);
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
        .title(format!("⚖️ Nouvelle Contestation : Sanction #{}", sanction_id))
        .description(format!(
            "**Auteur :** <@{}>\n**Pseudo Minecraft :** {}\n\n**Arguments :**\n```\n{}\n```",
            author_id,
            pseudo_mc.as_deref().unwrap_or("Non renseigné"),
            arguments
        ))
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

    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData {
            content: Some("Votre demande d'appel a été envoyée à l'équipe de modération. Vous recevrez une réponse prochainement.".to_string()),
            flags: Some(twilight_model::channel::message::MessageFlags::EPHEMERAL),
            ..Default::default()
        }),
    };

    http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &response)
        .await?;

    Ok(())
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
                .title("⚖️ Décision concernant votre appel")
                .description(format!(
                    "Dossier de sanction : `#{}`\n\n{}",
                    sanction_id, status_text
                ))
                .color(color)
                .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
                .build();

            let _ = http.create_message(dm_channel.id).embeds(&[dm_msg]).await;
        }
    }

    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData {
            content: Some(format!("Décision enregistrée : appel **{}**.", new_status)),
            flags: Some(twilight_model::channel::message::MessageFlags::EPHEMERAL),
            ..Default::default()
        }),
    };

    http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &response)
        .await?;

    Ok(())
}
pub fn register_warn() -> twilight_model::application::command::Command {
    CommandBuilder::new("warn", "Avertir un membre", twilight_model::application::command::CommandType::ChatInput)
        .default_member_permissions(Permissions::MODERATE_MEMBERS)
        .option(UserBuilder::new("membre", "Le membre a avertir").required(true))
        .option(StringBuilder::new("raison", "Motif de l'avertissement").required(true))
        .build()
}

pub fn register_warnings() -> twilight_model::application::command::Command {
    CommandBuilder::new("warnings", "Voir les avertissements d'un membre", twilight_model::application::command::CommandType::ChatInput)
        .default_member_permissions(Permissions::MODERATE_MEMBERS)
        .option(UserBuilder::new("membre", "Le membre").required(true))
        .build()
}

pub fn register_clear() -> twilight_model::application::command::Command {
    CommandBuilder::new("clear", "Supprimer des messages", twilight_model::application::command::CommandType::ChatInput)
        .default_member_permissions(Permissions::MANAGE_MESSAGES)
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

    sqlx::query(r#"INSERT INTO "Warn" ("userId", "guildId", "reason", "authorId") VALUES (, , , )"#)
        .bind(target_id.get().to_string())
        .bind(&guild_id)
        .bind(&reason)
        .bind(&author_id)
        .execute(&db).await?;

    let embed = EmbedBuilder::new().title("⚠️ Avertissement").description(format!("<@{}> a été averti.\n**Raison:** {}", target_id, reason)).color(COLOR_ERROR).build();
    let res = InteractionResponse { kind: InteractionResponseType::ChannelMessageWithSource, data: Some(InteractionResponseData { embeds: Some(vec![embed]), ..Default::default() }) };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &res).await?;
    Ok(())
}

pub async fn run_warnings(interaction: Interaction, http: Arc<HttpClient>, db: PgPool) -> anyhow::Result<()> {
    let target_id = if let Some(InteractionData::ApplicationCommand(cmd_data)) = &interaction.data {
        if let Some(CommandOptionValue::User(u_id)) = cmd_data.options.iter().find(|o| o.name == "membre").map(|o| &o.value) {
            *u_id
        } else { return Ok(()); }
    } else { return Ok(()); };

    let guild_id = interaction.guild_id.unwrap().get().to_string();

    let rows = sqlx::query(r#"SELECT reason, "authorId", "createdAt" FROM "Warn" WHERE "userId" =  AND "guildId" =  ORDER BY "createdAt" DESC LIMIT 10"#)
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

    let embed = EmbedBuilder::new().title(format!("Avertissements de <@{}>", target_id)).description(desc).color(COLOR_ERROR).build();
    let res = InteractionResponse { kind: InteractionResponseType::ChannelMessageWithSource, data: Some(InteractionResponseData { embeds: Some(vec![embed]), ..Default::default() }) };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &res).await?;
    Ok(())
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
    let res = InteractionResponse { kind: InteractionResponseType::ChannelMessageWithSource, data: Some(InteractionResponseData { embeds: Some(vec![embed]), flags: Some(twilight_model::channel::message::MessageFlags::EPHEMERAL), ..Default::default() }) };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &res).await?;
    Ok(())
}
