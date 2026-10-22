use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::{
    application::interaction::Interaction,
    channel::message::{EmojiReactionType, component::{ActionRow, Button, ButtonStyle, Component}},
    guild::Permissions,
    http::interaction::{InteractionResponse, InteractionResponseType, InteractionResponseData},
    id::{marker::RoleMarker, Id},
};
use twilight_util::builder::{
    command::CommandBuilder,
    embed::{EmbedBuilder, EmbedFooterBuilder},
};

use crate::utils::{COLOR_INFO, COLOR_PURPLE, COLOR_SUCCESS, FOOTER_TEXT};

pub fn register() -> twilight_model::application::command::Command {
    CommandBuilder::new(
        "notifications",
        "Déploie le panneau de sélection des rôles de notification",
        twilight_model::application::command::CommandType::ChatInput,
    )
    .default_member_permissions(Permissions::MANAGE_ROLES)
    .build()
}

/// (rôle, description, emoji) : source unique du panneau V2 et de son repli en embed.
const ROLES: [(&str, &str, crate::utils::emoji::E); 5] = [
    ("Annonces", "Annonces importantes du serveur", crate::utils::emoji::TITLE),
    ("Vidéastes", "Lives et nouvelles vidéos de nos créateurs", crate::utils::emoji::TIKTOK),
    ("Événements", "Tournois, concours et animations", crate::utils::emoji::PROMOTE),
    ("Mises à jour", "Patch notes et nouveautés en jeu", crate::utils::emoji::UTILS),
    ("Giveaways", "Tirages au sort et cadeaux", crate::utils::emoji::ECONOMY),
];

use crate::utils::emoji_parts;

fn panel_v2() -> serde_json::Value {
    let text = |c: String| serde_json::json!({ "type": 10, "content": c });
    let gap = serde_json::json!({ "type": 14, "divider": false, "spacing": 2 });
    let mut parts = vec![
        text(format!("## {} | Rôles de notification\nChoisis ce que tu veux recevoir : un clic pour activer, un second pour retirer.", crate::utils::emoji::SUPPORT)),
        serde_json::json!({ "type": 14, "divider": true, "spacing": 2 }),
    ];
    for (name, desc, emoji) in ROLES {
        let mut button = serde_json::json!({ "type": 2, "style": 2, "label": "Activer / retirer", "custom_id": format!("notif_toggle:{name}") });
        if let Some((n, id)) = emoji_parts(&emoji) {
            button["emoji"] = serde_json::json!({ "name": n, "id": id.to_string() });
        }
        parts.push(serde_json::json!({ "type": 9, "components": [text(format!("### {emoji} {name}\n{desc}"))], "accessory": button }));
        parts.push(gap.clone());
    }
    serde_json::json!({ "flags": 32768, "components": [{ "type": 17, "accent_color": 0xa855f7, "components": parts }] })
}

pub async fn run(interaction: Interaction, http: Arc<HttpClient>) -> anyhow::Result<()> {
    // Composants V2 absents de twilight 0.17 : appel brut (le jeton d'interaction suffit), repli sur un embed classique.
    let sent = reqwest::Client::new()
        .post(format!("https://discord.com/api/v10/interactions/{}/{}/callback", interaction.id, interaction.token))
        .json(&serde_json::json!({ "type": 4, "data": panel_v2() }))
        .send()
        .await
        .is_ok_and(|r| r.status().is_success());
    if sent {
        return Ok(());
    }

    let list: Vec<String> = ROLES.iter().map(|(name, desc, emoji)| format!("{emoji} | **{name}**\n{desc}")).collect();
    let embed = EmbedBuilder::new()
        .description(format!("## {} | Rôles de notification\n\n{}", crate::utils::emoji::SUPPORT, list.join("\n\n")))
        .color(COLOR_PURPLE)
        .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
        .build();
    let rows: Vec<Component> = ROLES
        .chunks(3)
        .map(|chunk| {
            Component::ActionRow(ActionRow {
                id: None,
                components: chunk
                    .iter()
                    .map(|(name, _, emoji)| {
                        Component::Button(Button {
                            id: None,
                            custom_id: Some(format!("notif_toggle:{name}")),
                            disabled: false,
                            emoji: emoji_parts(emoji).map(|(n, id)| EmojiReactionType::Custom { animated: false, id: Id::new(id), name: Some(n.to_string()) }),
                            label: Some(name.to_string()),
                            style: ButtonStyle::Secondary,
                            url: None,
                            sku_id: None,
                        })
                    })
                    .collect(),
            })
        })
        .collect();
    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData { embeds: Some(vec![embed]), components: Some(rows), ..Default::default() }),
    };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &response).await?;
    Ok(())
}

pub async fn handle_toggle(
    interaction: Interaction,
    http: Arc<HttpClient>,
    role_name: &str,
) -> anyhow::Result<()> {
    let guild_id = match interaction.guild_id {
        Some(id) => id,
        None => return Ok(()),
    };

    let member = match &interaction.member {
        Some(m) => m,
        None => return Ok(()),
    };

    let user_id = match member.user.as_ref() {
        Some(u) => u.id,
        None => return Ok(()),
    };

    let roles = http.roles(guild_id).await?.model().await?;
    let target_role = roles.into_iter().find(|r| r.name.eq_ignore_ascii_case(role_name));

    let (message, color) = match target_role {
        Some(role) => {
            let role_id: Id<RoleMarker> = role.id;
            let has_role = member.roles.contains(&role_id);

            if has_role {
                let res = http.remove_guild_member_role(guild_id, user_id, role_id).await;
                if res.is_ok() {
                    (format!("## {} | Rôle retiré\n\nLe rôle **{}** vous a été retiré.", crate::utils::emoji::OFF, role.name), COLOR_INFO)
                } else {
                    ("Impossible de modifier vos rôles (permissions manquantes).".to_string(), crate::utils::COLOR_ERROR)
                }
            } else {
                let res = http.add_guild_member_role(guild_id, user_id, role_id).await;
                if res.is_ok() {
                    (format!("## {} | Rôle activé\n\nLe rôle **{}** vous a été attribué !", crate::utils::emoji::OK, role.name), COLOR_SUCCESS)
                } else {
                    ("Impossible de modifier vos rôles (permissions manquantes).".to_string(), crate::utils::COLOR_ERROR)
                }
            }
        }
        None => (
            format!("Le rôle **{}** n'existe pas sur ce serveur. Contactez un administrateur.", role_name),
            crate::utils::COLOR_ERROR,
        ),
    };

    let embed = EmbedBuilder::new()
        .description(message)
        .color(color)
        .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
        .build();

    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData {
            embeds: Some(vec![embed]),
            flags: Some(twilight_model::channel::message::MessageFlags::EPHEMERAL),
            ..Default::default()
        }),
    };

    http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &response)
        .await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_role_has_a_toggle_button_with_an_emoji() {
        let panel = panel_v2().to_string();
        for (name, _, emoji) in ROLES {
            assert!(panel.contains(&format!("notif_toggle:{name}")));
            assert!(emoji_parts(&emoji).is_some());
        }
    }
}
