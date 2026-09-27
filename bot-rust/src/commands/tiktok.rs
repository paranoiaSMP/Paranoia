use sqlx::{PgPool, Row};
use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::{
    application::interaction::{application_command::CommandOptionValue, Interaction, InteractionData},
    channel::message::component::{ActionRow, Button, ButtonStyle, Component},
    http::interaction::{InteractionResponse, InteractionResponseType, InteractionResponseData},
    id::{marker::ChannelMarker, Id},
};
use twilight_util::builder::{
    command::{ChannelBuilder, CommandBuilder, RoleBuilder, StringBuilder, SubCommandBuilder},
    embed::{EmbedBuilder, EmbedFooterBuilder},
};

use crate::utils::{COLOR_ERROR, COLOR_INFO, COLOR_PURPLE, COLOR_SUCCESS, FOOTER_TEXT};

pub fn register() -> twilight_model::application::command::Command {
    CommandBuilder::new(
        "tiktok",
        "Gestion et surveillance des créateurs TikTok",
        twilight_model::application::command::CommandType::ChatInput,
    )
    .option(
        SubCommandBuilder::new("add", "Ajouter un créateur à surveiller")
            .option(StringBuilder::new("username", "Nom d'utilisateur TikTok").required(true))
            .option(ChannelBuilder::new("channel", "Salon d'annonce des vidéos/lives").required(true))
            .option(RoleBuilder::new("role", "Rôle à notifier lors des sorties").required(false)),
    )
    .option(
        SubCommandBuilder::new("remove", "Retirer un créateur de la surveillance")
            .option(StringBuilder::new("username", "Nom d'utilisateur TikTok").required(true)),
    )
    .option(SubCommandBuilder::new("list", "Lister tous les comptes actuellement surveillés"))
    .option(SubCommandBuilder::new("check", "Forcer une vérification immédiate de tous les comptes"))
    .build()
}

pub async fn run(interaction: Interaction, http: Arc<HttpClient>, db: PgPool) -> anyhow::Result<()> {
    let mut subcommand = "";
    let mut username = String::new();
    let mut channel_id = None;
    let mut role_id = None;

    if let Some(InteractionData::ApplicationCommand(cmd_data)) = &interaction.data {
        for option in &cmd_data.options {
            subcommand = option.name.as_str();
            if let CommandOptionValue::SubCommand(sub_opts) = &option.value {
                for sub_opt in sub_opts {
                    match sub_opt.name.as_str() {
                        "username" => {
                            if let CommandOptionValue::String(s) = &sub_opt.value {
                                username = s.trim().trim_start_matches('@').to_string();
                            }
                        }
                        "channel" => {
                            if let CommandOptionValue::Channel(c) = &sub_opt.value {
                                channel_id = Some(*c);
                            }
                        }
                        "role" => {
                            if let CommandOptionValue::Role(r) = &sub_opt.value {
                                role_id = Some(*r);
                            }
                        }
                        _ => {}
                    }
                }
            }
        }
    }

    let response_data = match subcommand {
        "add" => {
            if let Some(chan) = channel_id {
                let chan_i64 = chan.get() as i64;
                let role_i64 = role_id.map(|r| r.get() as i64);

                sqlx::query(
                    r#"
                    INSERT INTO tiktok_targets (username, channel_id, role_id, is_live)
                    VALUES ($1, $2, $3, FALSE)
                    ON CONFLICT (username) DO UPDATE
                    SET channel_id = EXCLUDED.channel_id, role_id = EXCLUDED.role_id
                    "#
                )
                .bind(&username)
                .bind(chan_i64)
                .bind(role_i64)
                .execute(&db)
                .await?;

                let embed = EmbedBuilder::new()
                    .title("TikTok Ajouté")
                    .description(format!(
                        "✅ Le compte TikTok **@{}** sera désormais surveillé dans <#{}> !",
                        username, chan
                    ))
                    .color(COLOR_SUCCESS)
                    .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
                    .build();

                InteractionResponseData {
                    embeds: Some(vec![embed]),
                    ..Default::default()
                }
            } else {
                InteractionResponseData {
                    content: Some("Salon requis.".to_string()),
                    flags: Some(twilight_model::channel::message::MessageFlags::EPHEMERAL),
                    ..Default::default()
                }
            }
        }
        "remove" => {
            let res = sqlx::query(
                r#"DELETE FROM tiktok_targets WHERE username = $1"#
            )
            .bind(&username)
            .execute(&db)
            .await?;

            let (msg, color) = if res.rows_affected() > 0 {
                (format!("✅ Le compte **@{}** a été retiré de la surveillance.", username), COLOR_SUCCESS)
            } else {
                (format!("Le compte **@{}** n'était pas dans la liste.", username), COLOR_ERROR)
            };

            let embed = EmbedBuilder::new()
                .description(msg)
                .color(color)
                .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
                .build();

            InteractionResponseData {
                embeds: Some(vec![embed]),
                ..Default::default()
            }
        }
        "list" => {
            let rows = sqlx::query(r#"SELECT username, channel_id, role_id, is_live FROM tiktok_targets"#)
                .fetch_all(&db)
                .await?;

            let mut embed_builder = EmbedBuilder::new()
                .title("📋 Comptes TikTok surveillés")
                .color(COLOR_PURPLE)
                .footer(EmbedFooterBuilder::new(FOOTER_TEXT));

            if rows.is_empty() {
                embed_builder = embed_builder.description("*Aucun compte n'est actuellement surveillé.*");
            } else {
                let mut lines = Vec::new();
                for r in rows {
                    let uname: String = r.try_get("username").unwrap_or_default();
                    let cid: i64 = r.try_get("channel_id").unwrap_or(0);
                    let rid: Option<i64> = r.try_get("role_id").ok();
                    let is_live: bool = r.try_get("is_live").unwrap_or(false);

                    let live_tag = if is_live { "🔴 **EN LIVE**" } else { "⚪ Hors-ligne" };
                    let role_tag = rid.map(|id| format!("(<@&{}>)", id)).unwrap_or_default();
                    lines.push(format!("• **@{}** → <#{}> {} {}", uname, cid, role_tag, live_tag));
                }
                embed_builder = embed_builder.description(lines.join("\n"));
            }

            InteractionResponseData {
                embeds: Some(vec![embed_builder.build()]),
                ..Default::default()
            }
        }
        "check" => {
            let http_clone = Arc::clone(&http);
            let db_clone = db.clone();
            tokio::spawn(async move {
                let _ = check_all_tiktok(&http_clone, &db_clone).await;
            });

            let embed = EmbedBuilder::new()
                .description("🔄 Vérification des flux TikTok lancée en arrière-plan !")
                .color(COLOR_INFO)
                .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
                .build();

            InteractionResponseData {
                embeds: Some(vec![embed]),
                flags: Some(twilight_model::channel::message::MessageFlags::EPHEMERAL),
                ..Default::default()
            }
        }
        _ => InteractionResponseData {
            content: Some("Sous-commande inconnue.".to_string()),
            flags: Some(twilight_model::channel::message::MessageFlags::EPHEMERAL),
            ..Default::default()
        },
    };

    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(response_data),
    };

    http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &response)
        .await?;

    Ok(())
}

pub async fn check_all_tiktok(http: &HttpClient, db: &PgPool) -> anyhow::Result<()> {
    let rows = sqlx::query(r#"SELECT username, channel_id, role_id, last_video_id, is_live FROM tiktok_targets"#)
        .fetch_all(db)
        .await?;

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    for r in rows {
        let username: String = r.try_get("username").unwrap_or_default();
        let channel_id: i64 = r.try_get("channel_id").unwrap_or(0);
        let role_id: Option<i64> = r.try_get("role_id").ok();
        let was_live: bool = r.try_get("is_live").unwrap_or(false);

        let live_url = format!("https://www.tiktok.com/@{}/live", username);
        if let Ok(resp) = client.get(&live_url).send().await {
            if let Ok(body) = resp.text().await {
                let is_live_now = body.contains(r#""status":2"#) || body.contains(r#""liveRoom":{"status":2"#);

                if is_live_now && !was_live {
                    let mention = role_id.map(|rid| format!("<@&{}> ", rid)).unwrap_or_default();
                    let embed = EmbedBuilder::new()
                        .title(format!("🔴 @{} est actuellement en LIVE sur TikTok !", username))
                        .description(format!("Venez rejoindre le live dès maintenant !\n\n🔗 https://www.tiktok.com/@{}/live", username))
                        .color(0xfe2c55)
                        .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
                        .build();

                    let btn = Button {
                        id: None,
                        custom_id: None,
                        disabled: false,
                        emoji: None,
                        label: Some("Rejoindre le Live".to_string()),
                        style: ButtonStyle::Link,
                        url: Some(live_url.clone()),
                        sku_id: None,
                    };

                    let _ = http
                        .create_message(Id::<ChannelMarker>::new(channel_id as u64))
                        .content(&mention)
                        .embeds(&[embed])
                        .components(&[Component::ActionRow(ActionRow { id: None, components: vec![Component::Button(btn)] })])
                        .await;

                    let _ = sqlx::query(
                        "UPDATE tiktok_targets SET is_live = TRUE WHERE username = $1"
                    )
                    .bind(&username)
                    .execute(db)
                    .await;
                } else if !is_live_now && was_live {
                    let _ = sqlx::query(
                        "UPDATE tiktok_targets SET is_live = FALSE WHERE username = $1"
                    )
                    .bind(&username)
                    .execute(db)
                    .await;
                }
            }
        }

        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
    }

    Ok(())
}
