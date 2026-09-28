use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::{
    application::interaction::Interaction,
    channel::{ChannelType, permission_overwrite::{PermissionOverwrite, PermissionOverwriteType}},
    http::permission_overwrite::{PermissionOverwrite as HttpPermissionOverwrite, PermissionOverwriteType as HttpPermissionOverwriteType},
    guild::Permissions,
    http::interaction::{InteractionResponse, InteractionResponseType, InteractionResponseData},
    id::{Id, marker::ChannelMarker},
    channel::message::{
        component::{ActionRow, Button, ButtonStyle, Component},
    },
};
use twilight_util::builder::{
    command::CommandBuilder,
    embed::EmbedBuilder,
};
use crate::utils::{COLOR_SUCCESS, COLOR_ERROR, COLOR_PURPLE};

pub fn register_conference() -> twilight_model::application::command::Command {
    CommandBuilder::new("conference", "Gerer une conference vocale", twilight_model::application::command::CommandType::ChatInput)
        .default_member_permissions(Permissions::MANAGE_CHANNELS)
        .option(twilight_util::builder::command::SubCommandBuilder::new("start", "Demarrer une conference"))
        .option(twilight_util::builder::command::SubCommandBuilder::new("end", "Terminer la conference en cours"))
        .build()
}

pub async fn run_conference(interaction: Interaction, http: Arc<HttpClient>) -> anyhow::Result<()> {
    let guild_id = interaction.guild_id.unwrap();
    let author_id = interaction.author_id().unwrap();

    let subcommand = match &interaction.data {
        Some(twilight_model::application::interaction::InteractionData::ApplicationCommand(cmd)) => {
            cmd.options.first().map(|o| o.name.as_str()).unwrap_or("")
        }
        _ => return Ok(()),
    };

    if subcommand == "start" {
        let category = http.create_guild_channel(guild_id, "CONFERENCE EN DIRECT")
            .kind(ChannelType::GuildCategory)
            .await?.model().await?;

        let voice = http.create_guild_channel(guild_id, "Conference")
            .kind(ChannelType::GuildVoice)
            .parent_id(category.id)
            .permission_overwrites(&[
                PermissionOverwrite {
                    id: Id::new(guild_id.get()),
                    kind: PermissionOverwriteType::Role,
                    allow: Permissions::CONNECT | Permissions::VIEW_CHANNEL,
                    deny: Permissions::SPEAK,
                },
                PermissionOverwrite {
                    id: Id::new(author_id.get()),
                    kind: PermissionOverwriteType::Member,
                    allow: Permissions::SPEAK | Permissions::MANAGE_CHANNELS,
                    deny: Permissions::empty(),
                }
            ])
            .await?.model().await?;

        let regie = http.create_guild_channel(guild_id, "regie-moderateur")
            .kind(ChannelType::GuildText)
            .parent_id(category.id)
            .permission_overwrites(&[
                PermissionOverwrite {
                    id: Id::new(guild_id.get()),
                    kind: PermissionOverwriteType::Role,
                    allow: Permissions::empty(),
                    deny: Permissions::VIEW_CHANNEL,
                },
                PermissionOverwrite {
                    id: Id::new(author_id.get()),
                    kind: PermissionOverwriteType::Member,
                    allow: Permissions::VIEW_CHANNEL,
                    deny: Permissions::empty(),
                }
            ])
            .await?.model().await?;

        let _ = http.update_guild_member(guild_id, author_id).channel_id(Some(voice.id)).await;

        let hand_btn = Button {
            id: None,
            custom_id: Some(format!("hand_raise:{}:{}", regie.id.get(), voice.id.get())),
            disabled: false,
            emoji: None,
            label: Some("Lever la main".to_string()),
            style: ButtonStyle::Primary,
            url: None,
            sku_id: None,
        };

        let embed = EmbedBuilder::new()
            .title("Conference Demarree")
            .description(format!(
                "Rejoignez le vocal **Conference** pour ecouter.\n\
                Tout le monde est en mode ecoute par defaut.\n\
                Cliquez sur le bouton ci-dessous pour demander la parole.\n\n\
                Salon: <#{}>",
                voice.id
            ))
            .color(COLOR_PURPLE)
            .build();

        let res = InteractionResponse {
            kind: InteractionResponseType::ChannelMessageWithSource,
            data: Some(InteractionResponseData {
                embeds: Some(vec![embed]),
                components: Some(vec![Component::ActionRow(ActionRow {
                    id: None,
                    components: vec![Component::Button(hand_btn)],
                })]),
                ..Default::default()
            }),
        };
        http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &res).await?;

        let _ = http.create_message(regie.id).content("Les demandes de prise de parole apparaitront ici.").await;

    } else if subcommand == "end" {
        let embed = EmbedBuilder::new().title("Conference Terminee").color(COLOR_ERROR).build();
        let res = InteractionResponse { kind: InteractionResponseType::ChannelMessageWithSource, data: Some(InteractionResponseData { embeds: Some(vec![embed]), ..Default::default() }) };
        http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &res).await?;
    }

    Ok(())
}

pub async fn handle_hand_raise(interaction: Interaction, http: Arc<HttpClient>, custom_id: &str) -> anyhow::Result<()> {
    let parts: Vec<&str> = custom_id.split(':').collect();
    if parts.len() < 3 { return Ok(()); }
    let regie_id = Id::<ChannelMarker>::new(parts[1].parse().unwrap());
    let voice_id: u64 = parts[2].parse().unwrap();
    let author_id = interaction.author_id().unwrap();

    let accept_btn = Button {
        id: None,
        custom_id: Some(format!("hand_accept:{}:{}", author_id.get(), voice_id)),
        disabled: false,
        emoji: None,
        label: Some("Donner la parole".to_string()),
        style: ButtonStyle::Success,
        url: None,
        sku_id: None,
    };

    let reject_btn = Button {
        id: None,
        custom_id: Some(format!("hand_reject:{}", author_id.get())),
        disabled: false,
        emoji: None,
        label: Some("Refuser".to_string()),
        style: ButtonStyle::Danger,
        url: None,
        sku_id: None,
    };

    let embed = EmbedBuilder::new()
        .title("Demande de parole")
        .description(format!("<@{}> souhaite prendre la parole.", author_id))
        .color(COLOR_SUCCESS)
        .build();

    let _ = http.create_message(regie_id)
        .embeds(&[embed])
        .components(&[Component::ActionRow(ActionRow {
            id: None,
            components: vec![Component::Button(accept_btn), Component::Button(reject_btn)],
        })]).await;

    let res = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData {
            content: Some("Votre demande a ete envoyee aux moderateurs.".to_string()),
            flags: Some(twilight_model::channel::message::MessageFlags::EPHEMERAL),
            ..Default::default()
        })
    };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &res).await?;

    Ok(())
}

pub async fn handle_hand_accept(interaction: Interaction, http: Arc<HttpClient>, custom_id: &str) -> anyhow::Result<()> {
    let parts: Vec<&str> = custom_id.split(':').collect();
    if parts.len() < 3 { return Ok(()); }
    let target_id: u64 = parts[1].parse().unwrap();
    let voice_id = Id::<ChannelMarker>::new(parts[2].parse().unwrap());

    let _ = http.update_channel_permission(voice_id, &HttpPermissionOverwrite {
        id: Id::new(target_id),
        kind: HttpPermissionOverwriteType::Member,
        allow: Some(Permissions::SPEAK),
        deny: Some(Permissions::empty()),
    }).await;

    let res = InteractionResponse {
        kind: InteractionResponseType::UpdateMessage,
        data: Some(InteractionResponseData {
            components: Some(vec![
                Component::ActionRow(ActionRow {
                    id: None,
                    components: vec![Component::Button(Button {
                        id: None,
                        custom_id: Some(format!("hand_revoke:{}:{}", target_id, voice_id.get())),
                        disabled: false,
                        emoji: None,
                        label: Some("Retirer la parole".to_string()),
                        style: ButtonStyle::Danger,
                        url: None,
                        sku_id: None,
                    })],
                })
            ]),
            content: Some(format!("<@{}> peut maintenant parler.", target_id)),
            ..Default::default()
        })
    };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &res).await?;

    Ok(())
}

pub async fn handle_hand_reject(interaction: Interaction, http: Arc<HttpClient>, custom_id: &str) -> anyhow::Result<()> {
    let parts: Vec<&str> = custom_id.split(':').collect();
    if parts.len() < 2 { return Ok(()); }
    let target_id: u64 = parts[1].parse().unwrap();

    let res = InteractionResponse {
        kind: InteractionResponseType::UpdateMessage,
        data: Some(InteractionResponseData {
            components: Some(vec![]),
            content: Some(format!("La demande de <@{}> a ete refusee.", target_id)),
            ..Default::default()
        })
    };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &res).await?;
    Ok(())
}

pub async fn handle_hand_revoke(interaction: Interaction, http: Arc<HttpClient>, custom_id: &str) -> anyhow::Result<()> {
    let parts: Vec<&str> = custom_id.split(':').collect();
    if parts.len() < 3 { return Ok(()); }
    let target_id: u64 = parts[1].parse().unwrap();
    let voice_id = Id::<ChannelMarker>::new(parts[2].parse().unwrap());

    let _ = http.delete_channel_permission(voice_id).member(Id::new(target_id)).await;

    let res = InteractionResponse {
        kind: InteractionResponseType::UpdateMessage,
        data: Some(InteractionResponseData {
            components: Some(vec![]),
            content: Some(format!("<@{}> est de retour en mode ecoute.", target_id)),
            ..Default::default()
        })
    };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &res).await?;
    Ok(())
}
