use sqlx::PgPool;
use std::sync::Arc;
use twilight_gateway::Event;
use twilight_http::{request::channel::reaction::RequestReactionType, Client as HttpClient};
use twilight_model::{
    application::interaction::InteractionData,
    channel::ChannelType,
};

use crate::config::Config;

pub async fn handle_event(
    event: Event,
    http: Arc<HttpClient>,
    db: PgPool,
    config: Arc<Config>,
) {
    match event {
        Event::MessageCreate(msg) => {
            if msg.author.bot {
                return;
            }

            // If user typed !close in a ticket channel
            if msg.content.trim() == "!close" {
                crate::commands::tickets::close_ticket_channel(
                    msg.channel_id,
                    &http,
                    config.ticket_log_channel_id,
                    Some(msg.author.id),
                )
                .await;
                return;
            }

            // Sync message to web API
            let client = reqwest::Client::new();
            let payload = serde_json::json!({
                "channelId": msg.channel_id.to_string(),
                "authorName": msg.author.name,
                "authorRole": "STAFF",
                "content": msg.content,
            });

            let sync_res = client
                .post(&config.web_api_url)
                .header("Authorization", format!("Bearer {}", config.discord_token))
                .json(&payload)
                .timeout(std::time::Duration::from_secs(3))
                .send()
                .await;

            if sync_res.is_ok() {
                let reaction = RequestReactionType::Unicode { name: "🌐" };
                let _ = http.create_reaction(msg.channel_id, msg.id, &reaction).await;
            }
        }

        Event::InteractionCreate(interaction) => {
            let inter = interaction.0;
            match &inter.data {
                Some(InteractionData::ApplicationCommand(cmd)) => {
                    let cmd_name = cmd.name.clone();
                    let res = match cmd_name.as_str() {
                        "cartes" => crate::commands::cartes::run(inter, http, db).await,
                        "pc" => crate::commands::pc::run(inter, http, db).await,
                        "flex" => crate::commands::flex::run(inter, http, db).await,
                        "profile" => crate::commands::profile::run(inter, http, db).await,
                        "creators" => crate::commands::creators::run(inter, http).await,
                        "notifications" => crate::commands::notifications::run(inter, http).await,
                        "event" => crate::commands::events::run(inter, http).await,
                        "quetes" => crate::commands::quests::run(inter, http).await,
                        "ban" => crate::commands::moderation::run_sanction(inter, http, db, "ban").await,
                        "mute" => crate::commands::moderation::run_sanction(inter, http, db, "mute").await,
                        "kick" => crate::commands::moderation::run_sanction(inter, http, db, "kick").await,
                        "promote" => crate::commands::moderation::run_promote(inter, http).await,
                        "demote" => crate::commands::moderation::run_demote(inter, http).await,
                        "setup_tickets" => crate::commands::tickets::run(inter, http).await,
                        "tiktok" => crate::commands::tiktok::run(inter, http, db).await,
                        _ => Ok(()),
                    };
                    if let Err(e) = res {
                        tracing::error!("Error executing slash command {}: {:?}", cmd_name, e);
                    }
                }

                Some(InteractionData::MessageComponent(comp)) => {
                    let cid = comp.custom_id.clone();
                    let values = comp.values.clone();

                    let res = if cid.starts_with("cartes:") {
                        crate::commands::cartes::handle_button(inter, http, db, &cid).await
                    } else if cid == "creators_select_menu" {
                        crate::commands::creators::handle_select(inter, http, &values).await
                    } else if let Some(role) = cid.strip_prefix("notif_toggle:") {
                        crate::commands::notifications::handle_toggle(inter, http, role).await
                    } else if cid == "event_join" {
                        crate::commands::events::handle_button(inter, http, "join").await
                    } else if cid == "event_leave" {
                        crate::commands::events::handle_button(inter, http, "leave").await
                    } else if cid == "quest_verify_status" {
                        crate::commands::quests::handle_verify_status(inter, http, db).await
                    } else if let Some(sanction_id) = cid.strip_prefix("appeal_open:") {
                        crate::commands::moderation::handle_appeal_button(inter, http, sanction_id).await
                    } else if let Some(sanction_id) = cid.strip_prefix("appeal_staff_accept:") {
                        crate::commands::moderation::handle_staff_appeal_decision(inter, http, db, "accept", sanction_id).await
                    } else if let Some(sanction_id) = cid.strip_prefix("appeal_staff_reject:") {
                        crate::commands::moderation::handle_staff_appeal_decision(inter, http, db, "reject", sanction_id).await
                    } else if let Some(cat) = cid.strip_prefix("ticket_open:") {
                        crate::commands::tickets::handle_open_button(inter, http, cat).await
                    } else if cid == "ticket_claim" {
                        crate::commands::tickets::handle_claim(inter, http).await
                    } else if cid == "ticket_close" {
                        crate::commands::tickets::handle_close(inter, http, config.ticket_log_channel_id).await
                    } else {
                        Ok(())
                    };
                    if let Err(e) = res {
                        tracing::error!("Error executing message component {}: {:?}", cid, e);
                    }
                }

                Some(InteractionData::ModalSubmit(modal_data)) => {
                    let cid = modal_data.custom_id.clone();
                    let modal = modal_data.clone();

                    if let Some(sanction_id) = cid.strip_prefix("modal_appeal:") {
                        let _ = crate::commands::moderation::handle_appeal_modal_submit(
                            inter,
                            http,
                            db,
                            sanction_id,
                            &modal,
                            config.ticket_log_channel_id,
                        )
                        .await;
                    } else if let Some(cat) = cid.strip_prefix("modal_ticket:") {
                        if let Some(gid) = inter.guild_id {
                            let _ = crate::commands::tickets::handle_ticket_modal_submit(
                                inter,
                                http,
                                cat,
                                &modal,
                                gid,
                                config.ticket_category_id,
                                config.role_staff_id,
                            )
                            .await;
                        }
                    }
                }

                _ => {}
            }
        }

        Event::VoiceStateUpdate(vsu) => {
            if let Some(guild_id) = vsu.guild_id {
                let user_id = vsu.user_id;

                if let Some(channel_id) = vsu.channel_id {
                    // User joined a voice channel
                    if let Ok(ch) = http.channel(channel_id).await {
                        if let Ok(chan) = ch.model().await {
                            if let Some(cname) = chan.name {
                                let roles = http.roles(guild_id).await;
                                if let Ok(roles_resp) = roles {
                                    if let Ok(existing_roles) = roles_resp.model().await {
                                        let role_match = existing_roles.iter().find(|r| r.name == cname);
                                        if let Some(r) = role_match {
                                            let _ = http.add_guild_member_role(guild_id, user_id, r.id).await;
                                        } else {
                                            // Create role with purple color
                                            if let Ok(new_role) = http.create_role(guild_id)
                                                .name(&cname)
                                                .color(crate::utils::COLOR_PURPLE)
                                                .await
                                            {
                                                if let Ok(created) = new_role.model().await {
                                                    let _ = http.add_guild_member_role(guild_id, user_id, created.id).await;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        Event::ChannelDelete(cd) => {
            if let Some(guild_id) = cd.guild_id {
                if cd.kind == ChannelType::GuildVoice || cd.kind == ChannelType::GuildStageVoice {
                    if let Some(name) = &cd.name {
                        if let Ok(roles) = http.roles(guild_id).await {
                            if let Ok(rlist) = roles.model().await {
                                if let Some(target) = rlist.into_iter().find(|r| &r.name == name) {
                                    let _ = http.delete_role(guild_id, target.id).await;
                                }
                            }
                        }
                    }
                }
            }
        }

        Event::Ready(r) => {
            tracing::info!("Bot prêt connecté sur {} guilds !", r.guilds.len());
        }

        _ => {}
    }
}
