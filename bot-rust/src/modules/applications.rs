#![allow(deprecated)]

use sqlx::{PgPool, Row};
use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::application::command::{Command, CommandType};
use twilight_model::application::interaction::modal::ModalInteractionData;
use twilight_model::application::interaction::Interaction;
use twilight_model::channel::message::component::{ActionRow, Button, ButtonStyle, Component, TextInput, TextInputStyle};
use twilight_model::guild::Permissions;
use twilight_model::http::interaction::{InteractionResponse, InteractionResponseData, InteractionResponseType};
use twilight_model::id::Id;
use twilight_util::builder::command::CommandBuilder;
use twilight_util::builder::embed::{EmbedBuilder, EmbedFieldBuilder, EmbedFooterBuilder};

use crate::modules::{setting, staff, wallet};

pub const MODAL: &str = "app_modal";
pub const ACCEPT: &str = "app_accept:";
pub const REFUSE: &str = "app_refuse:";

pub fn register() -> Command {
    CommandBuilder::new("candidature", "Postuler pour rejoindre le staff", CommandType::ChatInput).build()
}

fn input(id: &str, label: &str, style: TextInputStyle, min: u16, max: u16, required: bool, placeholder: &str) -> Component {
    Component::ActionRow(ActionRow {
        id: None,
        components: vec![Component::TextInput(TextInput {
            id: None,
            custom_id: id.to_string(),
            label: Some(label.to_string()),
            max_length: Some(max),
            min_length: Some(min),
            placeholder: Some(placeholder.to_string()),
            required: Some(required),
            style,
            value: None,
        })],
    })
}

pub async fn run(interaction: Interaction, http: Arc<HttpClient>, db: PgPool) -> anyhow::Result<()> {
    let Some(author) = interaction.author_id() else { return Ok(()) };
    let pending: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM "ModApplication" WHERE "discordId" = $1 AND status = 'PENDING'"#)
        .bind(author.to_string())
        .fetch_one(&db)
        .await
        .unwrap_or(0);
    if pending > 0 {
        return staff::reply_private(&http, &interaction, Some("Ta candidature est déjà en cours d'examen. Tu auras une réponse en message privé.".into()), vec![]).await;
    }

    let response = InteractionResponse {
        kind: InteractionResponseType::Modal,
        data: Some(InteractionResponseData {
            custom_id: Some(MODAL.to_string()),
            title: Some("Candidature staff".to_string()),
            components: Some(vec![
                input("age", "Ton âge", TextInputStyle::Short, 1, 3, true, "Ex. 17"),
                input("minecraft", "Pseudo Minecraft (facultatif)", TextInputStyle::Short, 0, 16, false, "Ex. Steve"),
                input("experience", "Ton expérience de modération", TextInputStyle::Paragraph, 20, 1000, true, "Serveurs, rôles, durée…"),
                input("motivation", "Pourquoi toi ?", TextInputStyle::Paragraph, 30, 1000, true, "Ce que tu apporterais au studio"),
                input("dispo", "Tes disponibilités", TextInputStyle::Short, 3, 200, true, "Ex. soirs et week-ends"),
            ]),
            ..Default::default()
        }),
    };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &response).await?;
    Ok(())
}

fn review_buttons(id: &str, disabled: bool) -> Vec<Component> {
    let b = |custom: String, label: &str, style: ButtonStyle| {
        Component::Button(Button { id: None, custom_id: Some(custom), disabled, emoji: None, label: Some(label.to_string()), style, url: None, sku_id: None })
    };
    vec![Component::ActionRow(ActionRow {
        id: None,
        components: vec![b(format!("{ACCEPT}{id}"), "Accepter", ButtonStyle::Success), b(format!("{REFUSE}{id}"), "Refuser", ButtonStyle::Danger)],
    })]
}

pub async fn handle_modal(interaction: Interaction, http: Arc<HttpClient>, db: PgPool, modal: &ModalInteractionData) -> anyhow::Result<()> {
    let Some(author) = interaction.author_id() else { return Ok(()) };
    let fields: std::collections::HashMap<String, String> = crate::utils::extract_modal_inputs(&modal.components).into_iter().collect();
    let get = |k: &str| fields.get(k).map(|s| s.trim().to_string()).unwrap_or_default();
    let name = crate::utils::get_interaction_user_name(&interaction);
    let site_user = wallet::user_id(&db, &author.to_string()).await;

    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        r#"INSERT INTO "ModApplication" (id, "discordName", "minecraftName", platform, experience, motivation, additions, other, status, "createdAt", "updatedAt", "applicantId", "discordId")
           VALUES ($1, $2, $3, 'Discord', $4, $5, $6, $7, 'PENDING', NOW(), NOW(), $8, $9)"#,
    )
    .bind(&id)
    .bind(&name)
    .bind(Some(get("minecraft")).filter(|s| !s.is_empty()))
    .bind(get("experience"))
    .bind(get("motivation"))
    .bind(get("dispo"))
    .bind(format!("Âge : {}", get("age")))
    .bind(&site_user)
    .bind(author.to_string())
    .execute(&db)
    .await?;

    if let Some(channel) = setting("applications", "reviewChannelId").and_then(|c| c.trim().parse::<u64>().ok()) {
        let embed = EmbedBuilder::new()
            .title(format!("Candidature de {name}"))
            .description(format!("<@{author}>{}", if site_user.is_some() { " · compte du site lié" } else { "" }))
            .color(0x7c3aed)
            .field(EmbedFieldBuilder::new("Âge", get("age")).inline())
            .field(EmbedFieldBuilder::new("Minecraft", Some(get("minecraft")).filter(|s| !s.is_empty()).unwrap_or_else(|| "-".into())).inline())
            .field(EmbedFieldBuilder::new("Disponibilités", get("dispo")).inline())
            .field(EmbedFieldBuilder::new("Expérience", get("experience")))
            .field(EmbedFieldBuilder::new("Motivation", get("motivation")))
            .footer(EmbedFooterBuilder::new(format!("En attente · {}", &id[..8])))
            .build();
        let components = review_buttons(&id, false);
        let _ = http.create_message(Id::new(channel)).embeds(&[embed]).components(&components).await;
    }

    staff::reply_private(&http, &interaction, Some("Candidature envoyée. L'équipe te répondra en message privé.".into()), vec![]).await
}

pub async fn handle_review(interaction: Interaction, http: Arc<HttpClient>, db: PgPool, custom_id: &str) -> anyhow::Result<()> {
    let allowed = interaction
        .member
        .as_ref()
        .and_then(|m| m.permissions)
        .is_some_and(|p| p.contains(Permissions::MANAGE_GUILD) || p.contains(Permissions::ADMINISTRATOR));
    if !allowed {
        return staff::reply_private(&http, &interaction, Some("Seuls les responsables peuvent décider.".into()), vec![]).await;
    }
    let (accept, id) = match (custom_id.strip_prefix(ACCEPT), custom_id.strip_prefix(REFUSE)) {
        (Some(id), _) => (true, id.to_string()),
        (_, Some(id)) => (false, id.to_string()),
        _ => return Ok(()),
    };
    let reviewer = interaction.author_id().map(|u| u.to_string()).unwrap_or_default();

    let row = sqlx::query(
        r#"UPDATE "ModApplication" SET status = $1, "reviewedBy" = $2, "updatedAt" = NOW()
           WHERE id = $3 AND status = 'PENDING' RETURNING "discordId", "discordName""#,
    )
    .bind(if accept { "ACCEPTED" } else { "REFUSED" })
    .bind(&reviewer)
    .bind(&id)
    .fetch_optional(&db)
    .await?;
    let Some(row) = row else {
        return staff::reply_private(&http, &interaction, Some("Cette candidature a déjà été traitée.".into()), vec![]).await;
    };
    let candidate: Option<String> = row.try_get("discordId").ok().flatten();

    if let Some(user) = candidate.as_deref().and_then(|c| c.parse::<u64>().ok()).map(Id::new) {
        let text = if accept {
            "Bonne nouvelle : ta candidature au staff de Paranoia Studio est acceptée. Un responsable va te contacter."
        } else {
            "Ta candidature au staff de Paranoia Studio n'a pas été retenue cette fois. Merci d'avoir postulé, tu pourras retenter plus tard."
        };
        if let Ok(res) = http.create_private_channel(user).await {
            if let Ok(dm) = res.model().await {
                let _ = http.create_message(dm.id).content(text).await;
            }
        }
        if accept {
            if let (Some(guild), Some(role)) = (interaction.guild_id, setting("applications", "acceptRoleId").and_then(|r| r.trim().parse::<u64>().ok())) {
                let _ = http.add_guild_member_role(guild, user, Id::new(role)).await;
            }
        }
    }

    let mut embeds = interaction.message.as_ref().map(|m| m.embeds.clone()).unwrap_or_default();
    if let Some(first) = embeds.first_mut() {
        first.color = Some(if accept { 0x22c55e } else { 0xef4444 });
        if let Some(footer) = first.footer.as_mut() {
            footer.text = format!("{} par {} · {}", if accept { "Acceptée" } else { "Refusée" }, crate::utils::get_interaction_user_name(&interaction), &id[..8]);
        }
    }
    let response = InteractionResponse {
        kind: InteractionResponseType::UpdateMessage,
        data: Some(InteractionResponseData { embeds: Some(embeds), components: Some(review_buttons(&id, true)), ..Default::default() }),
    };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &response).await?;
    Ok(())
}
