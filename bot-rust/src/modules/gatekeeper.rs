#![allow(deprecated)]
#![allow(dead_code)]

use std::io::Cursor;
use std::sync::Arc;
use ab_glyph::{FontRef, PxScale};
use image::{Rgba, RgbaImage};
use imageproc::drawing::{draw_line_segment_mut, draw_text_mut};
use rand::Rng;
use sqlx::PgPool;
use twilight_http::Client as HttpClient;
use twilight_model::{
    application::{
        command::Command,
        interaction::{
            application_command::CommandOptionValue,
            modal::ModalInteractionData,
            Interaction, InteractionData,
        },
    },
    channel::{
        message::{
            component::{ActionRow, Button, ButtonStyle, Component, TextInput, TextInputStyle},
            EmojiReactionType, MessageFlags,
        },
        ChannelType,
    },
    gateway::payload::incoming::MemberAdd,
    guild::Permissions,
    http::{
        attachment::Attachment,
        channel_position::Position,
        permission_overwrite::{PermissionOverwrite, PermissionOverwriteType},
        interaction::{InteractionResponse, InteractionResponseData, InteractionResponseType},
    },
    id::{
        marker::{ChannelMarker, RoleMarker, UserMarker},
        Id,
    },
};
use twilight_util::builder::{
    command::{ChannelBuilder, CommandBuilder, RoleBuilder, UserBuilder},
    embed::{EmbedBuilder, EmbedFooterBuilder, ImageSource},
};

use crate::utils::{COLOR_ERROR, COLOR_PURPLE, COLOR_SUCCESS, FOOTER_TEXT};

pub const PREFIX: &str = "gatekeeper_";
const FONT_DATA: &[u8] = include_bytes!("../../assets/DejaVuSans-Bold.ttf");

/// Commande de configuration du salon et du rôle pour la vérification automatique
pub fn register_config() -> Command {
    CommandBuilder::new(
        "config_verification",
        "Configure le salon et le rôle pour la vérification anti-bot automatique",
        twilight_model::application::command::CommandType::ChatInput,
    )
    .default_member_permissions(Permissions::ADMINISTRATOR)
    .option(
        ChannelBuilder::new("salon", "Salon où envoyer le captcha aux nouveaux arrivants")
            .channel_types([ChannelType::GuildText])
            .required(true),
    )
    .option(RoleBuilder::new("role", "Rôle attribué aux membres ayant validé le captcha").required(true))
    .build()
}

/// Commande pour tester immédiatement la vérification captcha
pub fn register_test() -> Command {
    CommandBuilder::new(
        "test_captcha",
        "Teste le système de vérification captcha anti-bot sur un membre ou vous-même",
        twilight_model::application::command::CommandType::ChatInput,
    )
    .default_member_permissions(Permissions::ADMINISTRATOR)
    .option(UserBuilder::new("membre", "Membre sur lequel tester (par défaut : vous-même)").required(false))
    .build()
}

pub async fn run_config(
    interaction: Interaction,
    http: Arc<HttpClient>,
    db: &PgPool,
) -> anyhow::Result<()> {
    let (mut channel_id, mut role_id) = (None, None);
    if let Some(InteractionData::ApplicationCommand(data)) = &interaction.data {
        for opt in &data.options {
            match &opt.value {
                CommandOptionValue::Channel(c) => channel_id = Some(*c),
                CommandOptionValue::Role(r) => role_id = Some(*r),
                _ => {}
            }
        }
    }
    let (Some(channel_id), Some(role_id), Some(guild_id)) = (channel_id, role_id, interaction.guild_id) else {
        reply_ephemeral(&http, &interaction, "Veuillez spécifier le salon et le rôle.").await?;
        return Ok(());
    };

    let defer = InteractionResponse {
        kind: InteractionResponseType::DeferredChannelMessageWithSource,
        data: Some(InteractionResponseData { flags: Some(MessageFlags::EPHEMERAL), ..Default::default() }),
    };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &defer).await?;

    // Rôle « Pas vérifié » sans aucune permission : réutilisé s'il existe déjà.
    let existing = crate::modules::setting_number("gatekeeper", "unverifiedRoleId", 0) as u64;
    let unverified = if existing != 0 {
        Id::<RoleMarker>::new(existing)
    } else {
        http.create_role(guild_id).name("Pas vérifié").permissions(Permissions::empty()).await?.model().await?.id
    };

    // Salon visible uniquement par les non vérifiés, lecture seule, placé en première position.
    let view = Permissions::VIEW_CHANNEL | Permissions::READ_MESSAGE_HISTORY;
    let overwrites = [
        PermissionOverwrite { id: guild_id.cast(), kind: PermissionOverwriteType::Role, allow: None, deny: Some(Permissions::VIEW_CHANNEL) },
        PermissionOverwrite { id: unverified.cast(), kind: PermissionOverwriteType::Role, allow: Some(view), deny: Some(Permissions::SEND_MESSAGES) },
    ];
    let mut warn = String::new();
    for ow in &overwrites {
        if let Err(e) = http.update_channel_permission(channel_id, ow).await {
            warn = format!("\n⚠️ Permissions du salon non modifiées ({e}).");
        }
    }
    let _ = http.update_guild_channel_positions(guild_id, &[Position { id: channel_id, lock_permissions: None, parent_id: None, position: Some(Some(0)) }]).await;

    let new_cfg = serde_json::json!({
        "channelId": channel_id.get().to_string(),
        "verifiedRoleId": role_id.get().to_string(),
        "unverifiedRoleId": unverified.get().to_string(),
    });
    let _ = sqlx::query(r#"UPDATE "BotModule" SET config = $1 WHERE id = 'gatekeeper'"#).bind(&new_cfg).execute(db).await;
    crate::modules::update_module_config("gatekeeper", new_cfg);

    let _ = http
        .interaction(interaction.application_id)
        .create_followup(&interaction.token)
        .content(&format!(
            "{} Vérification configurée.\n• Salon : <#{channel_id}> (visible seulement par <@&{unverified}>)\n• Rôle membre : <@&{role_id}>\n\n\
            À faire côté serveur : refuser **Voir les salons** à @everyone sur les autres salons/catégories, et placer le rôle du bot au-dessus de ces deux rôles.{warn}",
            crate::utils::emoji::OK
        ))
        .flags(MessageFlags::EPHEMERAL)
        .await;
    Ok(())
}

/// /reglement : ouvre un formulaire (texte multiligne) puis poste le règlement dans le salon choisi.
pub fn register_rules() -> Command {
    CommandBuilder::new("reglement", "Poste le règlement du serveur dans un salon", twilight_model::application::command::CommandType::ChatInput)
        .default_member_permissions(Permissions::ADMINISTRATOR)
        .option(ChannelBuilder::new("salon", "Salon du règlement (par défaut : ici)").channel_types([ChannelType::GuildText]))
        .build()
}

pub async fn run_rules(interaction: Interaction, http: Arc<HttpClient>) -> anyhow::Result<()> {
    let channel = match &interaction.data {
        Some(InteractionData::ApplicationCommand(d)) => d.options.iter().find_map(|o| match &o.value {
            CommandOptionValue::Channel(c) => Some(*c),
            _ => None,
        }),
        _ => None,
    }
    .or(interaction.channel.as_ref().map(|c| c.id));
    let Some(channel) = channel else { return Ok(()) };

    let input = Component::ActionRow(ActionRow {
        id: None,
        components: vec![Component::TextInput(TextInput {
            id: None,
            custom_id: "rules_text".into(),
            label: Some("Règlement".into()),
            max_length: Some(3500),
            min_length: Some(10),
            placeholder: Some("1. Respect de tous\n2. Pas de pub…".into()),
            required: Some(true),
            style: TextInputStyle::Paragraph,
            value: None,
        })],
    });
    let resp = InteractionResponse {
        kind: InteractionResponseType::Modal,
        data: Some(InteractionResponseData {
            custom_id: Some(format!("gatekeeper_rules:{channel}")),
            title: Some("Règlement du serveur".into()),
            components: Some(vec![input]),
            ..Default::default()
        }),
    };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &resp).await?;
    Ok(())
}

async fn post_rules(interaction: Interaction, http: &Arc<HttpClient>, modal: &ModalInteractionData, channel: u64) -> anyhow::Result<()> {
    let text = crate::utils::extract_modal_inputs(&modal.components).into_iter().find(|(k, _)| k == "rules_text").map(|(_, v)| v).unwrap_or_default();
    let embed = EmbedBuilder::new()
        .description(format!("## {} | Règlement\n\n{text}", crate::utils::emoji::TITLE))
        .color(COLOR_PURPLE)
        .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
        .build();
    let msg = match http.create_message(Id::<ChannelMarker>::new(channel)).embeds(&[embed]).await {
        Ok(_) => format!("{} Règlement posté dans <#{channel}>.", crate::utils::emoji::OK),
        Err(e) => format!("Impossible de poster dans <#{channel}> : {e}"),
    };
    let resp = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData { content: Some(msg), flags: Some(MessageFlags::EPHEMERAL), ..Default::default() }),
    };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &resp).await?;
    Ok(())
}

pub async fn run_test(interaction: Interaction, http: Arc<HttpClient>) -> anyhow::Result<()> {
    let target_user = match &interaction.data {
        Some(InteractionData::ApplicationCommand(data)) => {
            data.options.iter().find_map(|opt| match &opt.value {
                CommandOptionValue::User(u) if opt.name == "membre" => Some(*u),
                _ => None,
            })
        }
        _ => None,
    };

    let caller_id = interaction.author_id().unwrap_or_else(|| Id::new(0));
    let user_id = target_user.unwrap_or(caller_id);

    let configured_channel = crate::modules::setting_number("gatekeeper", "channelId", 0);
    let channel_id = if configured_channel != 0 {
        Id::<ChannelMarker>::new(configured_channel as u64)
    } else {
        interaction.channel.as_ref().map(|c| c.id).unwrap_or_else(|| Id::new(1))
    };

    let role_id = crate::modules::setting_number("gatekeeper", "verifiedRoleId", 0) as u64;

    // Différer la réponse du slash command pour la confirmation admin
    let defer_resp = InteractionResponse {
        kind: InteractionResponseType::DeferredChannelMessageWithSource,
        data: Some(InteractionResponseData {
            flags: Some(MessageFlags::EPHEMERAL),
            ..Default::default()
        }),
    };
    let _ = http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &defer_resp)
        .await;

    // Poster le captcha dans le salon
    send_captcha_challenge(http.clone(), channel_id, user_id.get(), role_id).await?;

    let _ = http.interaction(interaction.application_id)
        .create_followup(&interaction.token)
        .content(&format!(
            "{} Captcha de test envoyé avec succès dans <#{}> pour <@{}> !",
            crate::utils::emoji::OK,
            channel_id,
            user_id
        ))
        .flags(MessageFlags::EPHEMERAL)
        .await;

    Ok(())
}

/// Déclenché automatiquement lors de l'arrivée d'un membre sur le serveur
pub async fn on_member_add(ev: &MemberAdd, http: &Arc<HttpClient>) {
    if ev.user.bot {
        return;
    }

    if !crate::modules::enabled("gatekeeper") {
        return;
    }

    let channel_num = crate::modules::setting_number("gatekeeper", "channelId", 0);
    let role_num = crate::modules::setting_number("gatekeeper", "verifiedRoleId", 0);

    if channel_num == 0 {
        return;
    }

    let unverified = crate::modules::setting_number("gatekeeper", "unverifiedRoleId", 0) as u64;
    if unverified != 0 {
        let _ = http.add_guild_member_role(ev.guild_id, ev.user.id, Id::new(unverified)).await;
    }

    let channel_id = Id::<ChannelMarker>::new(channel_num as u64);
    let user_id = ev.user.id.get();
    let role_id = role_num as u64;

    if let Err(e) = send_captcha_challenge(http.clone(), channel_id, user_id, role_id).await {
        tracing::error!("Gatekeeper: failed to send captcha on member join to {}: {:?}", user_id, e);
    }
}

/// Génère et poste le défi Captcha dans le salon dédié en mentionnant l'utilisateur
async fn send_captcha_challenge(
    http: Arc<HttpClient>,
    channel_id: Id<ChannelMarker>,
    user_id: u64,
    role_id: u64,
) -> anyhow::Result<()> {
    let code = generate_random_code();
    let png_bytes = generate_captcha_image(&code);

    let attachment = Attachment::from_bytes("captcha.png".to_string(), png_bytes, 1);
    let embed = EmbedBuilder::new()
        .description(format!(
            "## {} | Vérification Anti-Bot\n\n\
            Bienvenue <@{user_id}> sur le serveur **Paranoia Studio** !\n\n\
            Pour débloquer l'accès complet au serveur et prouver que tu es un humain, \
            recopie les **5 caractères** visibles sur l'image ci-dessous.\n\n\
            Clique sur le bouton **✏️ Entrer le code** ci-dessous pour saisir ta réponse.\n\n\
            *(Ce test est personnel et insensible à la casse)*",
            crate::utils::emoji::TITLE
        ))
        .image(ImageSource::attachment("captcha.png").unwrap())
        .color(COLOR_PURPLE)
        .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
        .build();

    let enter_btn = Component::Button(Button {
        id: None,
        custom_id: Some(format!("gatekeeper_modal:{role_id}:{user_id}:{code}")),
        disabled: false,
        emoji: Some(EmojiReactionType::Unicode {
            name: "✏️".to_string(),
        }),
        label: Some("Entrer le code".to_string()),
        style: ButtonStyle::Primary,
        url: None,
        sku_id: None,
    });

    let row = Component::ActionRow(ActionRow {
        id: None,
        components: vec![enter_btn],
    });

    http.create_message(channel_id)
        .content(&format!("👋 Bienvenue <@{user_id}> !"))
        .attachments(&[attachment])
        .embeds(&[embed])
        .components(&[row])
        .await?;

    Ok(())
}

pub async fn handle_component(
    interaction: Interaction,
    http: &Arc<HttpClient>,
    custom_id: &str,
) -> anyhow::Result<()> {
    if let Some(args) = custom_id.strip_prefix("gatekeeper_modal:") {
        // Format: gatekeeper_modal:{role_id}:{user_id}:{code}
        let parts: Vec<&str> = args.split(':').collect();
        if parts.len() < 3 {
            return Ok(());
        }

        let role_id = parts[0];
        let target_user_id: u64 = parts[1].parse().unwrap_or(0);
        let expected_code = parts[2];

        let caller_id = interaction.author_id().map(|u| u.get()).unwrap_or(0);
        if target_user_id != 0 && caller_id != target_user_id {
            let warn = EmbedBuilder::new()
                .description(format!(
                    "## ⚠️ Action refusée\n\nCe captcha a été généré spécialement pour <@{target_user_id}>."
                ))
                .color(COLOR_ERROR)
                .build();
            let resp = InteractionResponse {
                kind: InteractionResponseType::ChannelMessageWithSource,
                data: Some(InteractionResponseData {
                    embeds: Some(vec![warn]),
                    flags: Some(MessageFlags::EPHEMERAL),
                    ..Default::default()
                }),
            };
            let _ = http.interaction(interaction.application_id)
                .create_response(interaction.id, &interaction.token, &resp)
                .await;
            return Ok(());
        }

        let text_input = Component::TextInput(TextInput {
            id: None,
            custom_id: "captcha_input".to_string(),
            label: Some("Code Captcha (5 caractères)".to_string()),
            style: TextInputStyle::Short,
            min_length: Some(4),
            max_length: Some(6),
            placeholder: Some("ex: 7X8M2".to_string()),
            required: Some(true),
            value: None,
        });

        let modal_row = Component::ActionRow(ActionRow {
            id: None,
            components: vec![text_input],
        });

        let modal_response = InteractionResponse {
            kind: InteractionResponseType::Modal,
            data: Some(InteractionResponseData {
                custom_id: Some(format!("gatekeeper_submit:{role_id}:{target_user_id}:{expected_code}")),
                title: Some("Vérification Captcha".to_string()),
                components: Some(vec![modal_row]),
                ..Default::default()
            }),
        };

        http.interaction(interaction.application_id)
            .create_response(interaction.id, &interaction.token, &modal_response)
            .await?;

        return Ok(());
    }

    Ok(())
}

pub async fn handle_modal_submit(
    interaction: Interaction,
    http: &Arc<HttpClient>,
    modal: &ModalInteractionData,
    log_channel_id: u64,
) -> anyhow::Result<()> {
    if let Some(ch) = modal.custom_id.strip_prefix("gatekeeper_rules:") {
        return post_rules(interaction, http, modal, ch.parse().unwrap_or(0)).await;
    }
    if let Some(args) = modal.custom_id.strip_prefix("gatekeeper_submit:") {
        let parts: Vec<&str> = args.split(':').collect();
        if parts.len() < 3 {
            return Ok(());
        }

        let role_id: u64 = parts[0].parse().unwrap_or(0);
        let user_id: u64 = parts[1].parse().unwrap_or(0);
        let expected_code = parts[2];

        let inputs = crate::utils::extract_modal_inputs(&modal.components);
        let user_code = inputs
            .iter()
            .find(|(k, _)| k == "captcha_input")
            .map(|(_, v)| v.trim())
            .unwrap_or("");

        let guild_id = interaction.guild_id.unwrap_or_else(|| Id::new(0));

        if user_code.eq_ignore_ascii_case(expected_code) {
            // Attribution du rôle de membre
            let role_add_ok = if guild_id.get() != 0 && role_id != 0 {
                match http
                    .add_guild_member_role(
                        guild_id,
                        Id::new(user_id),
                        Id::<RoleMarker>::new(role_id),
                    )
                    .await
                {
                    Ok(_) => true,
                    Err(e) => {
                        tracing::error!("Failed to assign role {role_id} to {user_id}: {:?}", e);
                        false
                    }
                }
            } else {
                true
            };

            let unverified = crate::modules::setting_number("gatekeeper", "unverifiedRoleId", 0) as u64;
            if role_add_ok && unverified != 0 {
                let _ = http.remove_guild_member_role(guild_id, Id::new(user_id), Id::new(unverified)).await;
            }

            let success_embed = if role_add_ok {
                EmbedBuilder::new()
                    .description(format!(
                        "## {} | Vérification réussie !\n\n\
                        Félicitations <@{user_id}> ! Le code captcha est correct.\n\n\
                        Le rôle <@&{role_id}> vous a été attribué et l'accès au serveur est débloqué.",
                        crate::utils::emoji::OK
                    ))
                    .color(COLOR_SUCCESS)
                    .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
                    .build()
            } else {
                EmbedBuilder::new()
                    .description(format!(
                        "## ⚠️ Captcha validé mais rôle non attribué\n\n\
                        Tu as réussi le captcha, mais une erreur de permissions empêche le bot de donner le rôle <@&{role_id}>.\n\
                        *(Assurez-vous que le rôle du bot est positionné au-dessus de ce rôle dans les paramètres du serveur)*"
                    ))
                    .color(COLOR_ERROR)
                    .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
                    .build()
            };

            let resp = InteractionResponse {
                kind: InteractionResponseType::ChannelMessageWithSource,
                data: Some(InteractionResponseData {
                    embeds: Some(vec![success_embed]),
                    flags: Some(MessageFlags::EPHEMERAL),
                    ..Default::default()
                }),
            };

            http.interaction(interaction.application_id)
                .create_response(interaction.id, &interaction.token, &resp)
                .await?;

            // Supprimer le message d'invitation au captcha pour garder le salon propre
            if let Some(msg) = &interaction.message {
                if let Some(chan) = &interaction.channel {
                    let _ = http.delete_message(chan.id, msg.id).await;
                }
            }

            // Message public court de bienvenue validée
            if let Some(chan) = &interaction.channel {
                let _ = http
                    .create_message(chan.id)
                    .content(&format!(
                        "{} <@{user_id}> a validé son captcha avec succès ! Bienvenue sur Paranoia Studio.",
                        crate::utils::emoji::OK
                    ))
                    .await;
            }

            // Journaliser dans le salon de logs
            if log_channel_id != 0 {
                let log_embed = EmbedBuilder::new()
                    .description(format!(
                        "🛡️ **Anti-Bot** : <@{user_id}> a validé le captcha image avec succès. Rôle <@&{role_id}> attribué."
                    ))
                    .color(COLOR_SUCCESS)
                    .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
                    .build();
                let _ = http
                    .create_message(Id::<ChannelMarker>::new(log_channel_id))
                    .embeds(&[log_embed])
                    .await;
            }
        } else {
            // Code erroné
            let fail_embed = EmbedBuilder::new()
                .description(format!(
                    "## {} | Code Captcha incorrect\n\n\
                    Le code saisi (`{user_code}`) ne correspond pas à l'image.\n\n\
                    Regarde attentivement l'image ci-dessus et reclique sur **✏️ Entrer le code** pour retenter ta chance !",
                    crate::utils::emoji::OFF
                ))
                .color(COLOR_ERROR)
                .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
                .build();

            let resp = InteractionResponse {
                kind: InteractionResponseType::ChannelMessageWithSource,
                data: Some(InteractionResponseData {
                    embeds: Some(vec![fail_embed]),
                    flags: Some(MessageFlags::EPHEMERAL),
                    ..Default::default()
                }),
            };

            http.interaction(interaction.application_id)
                .create_response(interaction.id, &interaction.token, &resp)
                .await?;
        }
    }

    Ok(())
}

async fn reply_ephemeral(http: &HttpClient, inter: &Interaction, text: &str) -> anyhow::Result<()> {
    let resp = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData {
            content: Some(text.to_string()),
            flags: Some(MessageFlags::EPHEMERAL),
            ..Default::default()
        }),
    };
    http.interaction(inter.application_id)
        .create_response(inter.id, &inter.token, &resp)
        .await?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Génération de l'image Captcha classique (Texte déformé + Bruit + Lignes)
// ---------------------------------------------------------------------------

pub fn generate_random_code() -> String {
    const CHARSET: &[u8] = b"23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    let mut rng = rand::thread_rng();
    (0..5)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}

pub fn generate_captcha_image(code: &str) -> Vec<u8> {
    let font = FontRef::try_from_slice(FONT_DATA).expect("Failed to load captcha font");
    let width = 340;
    let height = 120;
    let mut rng = rand::thread_rng();

    // Fond sombre texturé (thème Discord #1e1f22 avec micro-bruit)
    let mut img = RgbaImage::from_fn(width, height, |_x, _y| {
        let base = 28u8;
        let noise = rng.gen_range(0..14);
        Rgba([base + noise, base + noise + 2, base + noise + 6, 255])
    });

    // Lignes de perturbation en arrière-plan
    for _ in 0..14 {
        let x1 = rng.gen_range(0.0..width as f32);
        let y1 = rng.gen_range(0.0..height as f32);
        let x2 = rng.gen_range(0.0..width as f32);
        let y2 = rng.gen_range(0.0..height as f32);
        let r = rng.gen_range(60..130);
        let g = rng.gen_range(60..130);
        let b = rng.gen_range(60..130);
        draw_line_segment_mut(&mut img, (x1, y1), (x2, y2), Rgba([r, g, b, 140]));
    }

    // Pixels de bruit dispersés
    for _ in 0..350 {
        let px = rng.gen_range(0..width);
        let py = rng.gen_range(0..height);
        let c = rng.gen_range(90..190);
        img.put_pixel(px, py, Rgba([c, c, c, 180]));
    }

    // Dessin de chaque caractère avec variations de taille, décalage et couleur
    let chars: Vec<char> = code.chars().collect();
    let num_chars = chars.len();
    let char_step = (width - 70) / num_chars as u32;

    let palette = [
        Rgba([96, 165, 250, 255]),  // Bleu clair
        Rgba([52, 211, 153, 255]),  // Vert émeraude
        Rgba([248, 113, 113, 255]), // Rouge corail
        Rgba([250, 204, 21, 255]),  // Jaune vif
        Rgba([192, 132, 252, 255]), // Mauve
        Rgba([244, 114, 182, 255]), // Rose
        Rgba([251, 146, 60, 255]),  // Orange
        Rgba([243, 244, 246, 255]), // Blanc cassé
    ];

    for (i, &ch) in chars.iter().enumerate() {
        let x = 32 + (i as u32 * char_step) + rng.gen_range(0..5);
        let y = 25 + rng.gen_range(0..16);
        let font_size = rng.gen_range(48.0..58.0);
        let color = palette[rng.gen_range(0..palette.len())];

        draw_text_mut(
            &mut img,
            color,
            x as i32,
            y as i32,
            PxScale::from(font_size),
            &font,
            &ch.to_string(),
        );
    }

    // Lignes de croisement au premier plan (au-dessus des lettres)
    for _ in 0..4 {
        let x1 = rng.gen_range(0.0..(width / 3) as f32);
        let y1 = rng.gen_range(15.0..(height - 15) as f32);
        let x2 = rng.gen_range((width * 2 / 3) as f32..width as f32);
        let y2 = rng.gen_range(15.0..(height - 15) as f32);
        let r = rng.gen_range(160..240);
        let g = rng.gen_range(160..240);
        let b = rng.gen_range(160..240);
        draw_line_segment_mut(&mut img, (x1, y1), (x2, y2), Rgba([r, g, b, 200]));
    }

    let mut buf = Cursor::new(Vec::new());
    img.write_to(&mut buf, image::ImageFormat::Png)
        .expect("Failed to encode captcha PNG");
    buf.into_inner()
}

// ---------------------------------------------------------------------------
// Contrats & Compatibilité Tests
// ---------------------------------------------------------------------------

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CaptchaChallenge {
    pub user_id: Id<UserMarker>,
    pub prompt: String,
    pub correct_token: String,
    pub options: Vec<(String, String)>,
}

pub fn generate_captcha(user_id: Id<UserMarker>, seed: u64) -> CaptchaChallenge {
    let pool = [
        ("🟢 Émeraude", "emerald"),
        ("🔴 Rubis", "ruby"),
        ("🔵 Saphir", "sapphire"),
        ("🟡 Topaze", "topaz"),
        ("🟣 Améthyste", "amethyst"),
    ];

    let correct_idx = (seed as usize) % pool.len();
    let (correct_label, correct_token) = pool[correct_idx];
    let prompt = format!("Cliquez sur le bouton {}", correct_label);

    let mut options = Vec::new();
    for (i, &(label, token)) in pool.iter().enumerate() {
        if i == correct_idx || options.len() < 3 {
            options.push((label.to_string(), token.to_string()));
        }
    }

    if seed % 2 == 1 {
        options.reverse();
    }

    CaptchaChallenge {
        user_id,
        prompt,
        correct_token: correct_token.to_string(),
        options,
    }
}

pub fn verify_captcha(challenge: &CaptchaChallenge, submitted_token: &str) -> bool {
    challenge.correct_token == submitted_token
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TempRoleDecayRecord {
    pub id: i64,
    pub guild_id: i64,
    pub user_id: i64,
    pub role_id: i64,
    pub expires_at: chrono::DateTime<chrono::Utc>,
}

pub fn filter_expired_roles(
    records: &[TempRoleDecayRecord],
    now: chrono::DateTime<chrono::Utc>,
) -> Vec<TempRoleDecayRecord> {
    records
        .iter()
        .filter(|rec| rec.expires_at <= now)
        .cloned()
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_random_code_length_and_charset() {
        let code = generate_random_code();
        assert_eq!(code.len(), 5);
        assert!(code.chars().all(|c| c.is_ascii_alphanumeric()));
    }

    #[test]
    fn test_captcha_image_generates_valid_png() {
        let code = "7X8M2";
        let png = generate_captcha_image(code);
        assert!(!png.is_empty(), "PNG buffer must not be empty");
        assert_eq!(&png[0..4], b"\x89PNG", "Generated image must have valid PNG magic bytes");
        let decoded = image::load_from_memory(&png);
        assert!(decoded.is_ok(), "Decoded PNG must be valid image: {:?}", decoded.err());
        let img = decoded.unwrap();
        assert_eq!(img.width(), 340);
        assert_eq!(img.height(), 120);
    }
}
