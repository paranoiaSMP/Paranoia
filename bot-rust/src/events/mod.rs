use sqlx::PgPool;
use std::sync::Arc;
use twilight_gateway::Event;
use twilight_http::Client as HttpClient;
use twilight_model::{
    application::interaction::InteractionData,
    channel::ChannelType,
};

use crate::config::Config;

pub mod audit;
pub mod automod;
pub mod temp_voice;
pub mod xp;

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
            if crate::modules::honeypot::on_message(&msg, &http, config.role_staff_id, config.ticket_log_channel_id).await {
                return;
            }
            crate::modules::message_log::on_create(&msg);

            if crate::modules::enabled("xp") {
                xp::give_xp(&msg, &http, &db).await;
            }
            crate::modules::activity::count_message(msg.author.id);
            crate::modules::drops::on_message(&msg, &http).await;
            crate::modules::quiz::on_message(&msg, &http, &db).await;

            if crate::modules::enabled("automod")
                && automod::check_message(&msg, &http, &db, Some(config.ticket_log_channel_id)).await
            {
                return;
            }

            if !crate::modules::enabled("tickets") {
                return;
            }

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

            let is_staff = msg
                .member
                .as_ref()
                .is_some_and(|m| m.roles.iter().any(|r| r.get() == config.role_staff_id));
            let client = reqwest::Client::new();
            let payload = serde_json::json!({
                "channelId": msg.channel_id.to_string(),
                "authorName": msg.author.global_name.clone().unwrap_or_else(|| msg.author.name.clone()),
                "authorRole": if is_staff { "STAFF" } else { "USER" },
                "content": msg.content,
            });

            let _ = client
                .post(&config.web_api_url)
                .header("Authorization", format!("Bearer {}", config.discord_token))
                .json(&payload)
                .timeout(std::time::Duration::from_secs(3))
                .send()
                .await;
        }

        Event::InteractionCreate(interaction) => {
            let inter = interaction.0;
            match &inter.data {
                Some(InteractionData::ApplicationCommand(cmd)) => {
                    let cmd_name = cmd.name.clone();
                    if let Some(owner) = crate::modules::command_owner(&cmd_name) {
                        if !crate::modules::enabled(owner) {
                            crate::modules::reply_disabled(&http, &inter).await;
                            return;
                        }
                    }
                    if !crate::modules::command_allowed(&inter, &cmd_name) {
                        crate::modules::reply_notice(&http, &inter, "Tu n'as pas la permission d'utiliser cette commande.").await;
                        return;
                    }
                    let res = match cmd_name.as_str() {
                        "cartes" => crate::commands::cartes::run(inter, http, db).await,
                        "conference" => crate::modules::conference::run(inter, http, db).await,
                        "daily" => crate::commands::economy::run_daily(inter, http, db).await,
                        "pack" => crate::commands::tcg::run_pack(inter, http, db).await,
                        "pc" => crate::commands::pc::run(inter, http, db).await,
                        "flex" => crate::commands::flex::run(inter, http, db).await,
                        "profile" => crate::commands::profile::run(inter, http, db).await,
                        "creators" => crate::commands::creators::run(inter, http).await,
                        "notifications" => crate::commands::notifications::run(inter, http).await,
                        "event" => crate::commands::events::run(inter, http).await,
                        "quetes" => crate::commands::quests::run(inter, http, db).await,
                        "ban" => crate::commands::moderation::run_sanction(inter, http, db, "ban").await,
                        "mute" => crate::commands::moderation::run_sanction(inter, http, db, "mute").await,
                        "kick" => crate::commands::moderation::run_sanction(inter, http, db, "kick").await,
                        "promote" => crate::commands::moderation::run_promote(inter, http).await,
                        "demote" => crate::commands::moderation::run_demote(inter, http).await,
                        "warn" => crate::commands::moderation::run_warn(inter, http, db).await,
                        "warnings" => crate::commands::moderation::run_warnings(inter, http, db).await,
                        "clear" => crate::commands::moderation::run_clear(inter, http).await,
                        "unban" => crate::commands::moderation::run_lift(inter, http, db, "unban").await,
                        "unmute" => crate::commands::moderation::run_lift(inter, http, db, "unmute").await,
                        "cases" => crate::commands::moderation::run_cases(inter, http, db).await,
                        "slowmode" => crate::commands::moderation::run_slowmode(inter, http).await,
                        "setup_tickets" => crate::commands::tickets::run(inter, http).await,
                        "tiktok" => crate::commands::tiktok::run(inter, http, db).await,
                        "tribunal" => crate::modules::tribunal::run(inter, http, db).await,
                        "giveaway" => crate::modules::giveaway::run(inter, http, db).await,
                        "xp" => crate::commands::levels::run_manage(inter, http, db).await,
                        "rang" => crate::commands::levels::run_rank(inter, http, db).await,
                        "quiz" => crate::modules::quiz::run(inter, http).await,
                        "classement" => crate::commands::levels::run_leaderboard(inter, http, db).await,
                        "note" => crate::modules::staff::run_note(inter, http, db).await,
                        "statsmodo" => crate::modules::staff::run_stats(inter, http, db).await,
                        "absence" => crate::modules::staff::run_absence(inter, http, db).await,
                        "candidature" => crate::modules::applications::run(inter, http, db).await,
                        "setup_candidatures" => crate::modules::applications::run_setup(inter, http, db).await,
                        "sauvegarde" => crate::modules::backup::run(inter, http, db).await,
                        "verrouillage" => crate::modules::security::run(inter, http, config.ticket_log_channel_id).await,
                        "config_verification" => crate::modules::gatekeeper::run_config(inter, http, &db).await,
                        "reglement" => crate::modules::gatekeeper::run_rules(inter, http).await,
                        "test_captcha" => crate::modules::gatekeeper::run_test(inter, http).await,
                        "test_message" => crate::modules::automod::command::run(inter, http).await,
                        _ => Ok(()),
                    };
                    if let Err(e) = res {
                        tracing::error!("Error executing slash command {}: {:?}", cmd_name, e);
                    }
                }

                Some(InteractionData::MessageComponent(comp)) => {
                    let cid = comp.custom_id.clone();
                    let values = comp.values.clone();
                    if let Some(owner) = crate::modules::component_owner(&cid) {
                        if !crate::modules::enabled(owner) {
                            crate::modules::reply_disabled(&http, &inter).await;
                            return;
                        }
                    }

                    let res = if cid.starts_with(crate::modules::drops::PREFIX) {
                        crate::modules::drops::handle_claim(inter, http, db, &cid).await
                    } else if cid.starts_with(crate::modules::gatekeeper::PREFIX) {
                        crate::modules::gatekeeper::handle_component(inter, &http, &cid).await
                    } else if cid.starts_with(crate::modules::tribunal::VOTE) || cid.starts_with(crate::modules::tribunal::EXTEND) {
                        crate::modules::tribunal::handle_button(inter, http, db, &cid).await
                    } else if cid.starts_with(crate::modules::giveaway::PREFIX) {
                        crate::modules::giveaway::handle_join(inter, http, db, &cid).await
                    } else if cid.starts_with("cartes:") {
                        crate::commands::cartes::handle_button(inter, http, db, &cid).await
                    } else if cid == "creators_select_menu" {
                        crate::commands::creators::handle_select(inter, http, &values).await
                    } else if let Some(role) = cid.strip_prefix("notif_toggle:") {
                        crate::commands::notifications::handle_toggle(inter, http, role).await
                    } else if cid == "event_join" {
                        crate::commands::events::handle_button(inter, http, "join").await
                    } else if cid == "event_leave" {
                        crate::commands::events::handle_button(inter, http, "leave").await
                    } else if cid == crate::modules::applications::OPEN {
                        crate::modules::applications::run(inter, http, db).await
                    } else if cid.starts_with(crate::modules::applications::ACCEPT) || cid.starts_with(crate::modules::applications::REFUSE) {
                        crate::modules::applications::handle_review(inter, http, db, &cid).await
                    } else if cid.starts_with(crate::modules::backup::CONFIRM) {
                        crate::modules::backup::handle_confirm(inter, http, db, &cid).await
                    } else if cid.starts_with(crate::commands::quests::PREFIX) {
                        crate::commands::quests::handle_claim(inter, http, db, &cid).await
                    } else if let Some(sanction_id) = cid.strip_prefix("appeal_open:") {
                        crate::commands::moderation::handle_appeal_button(inter, http, sanction_id).await
                    } else if let Some(sanction_id) = cid.strip_prefix("appeal_staff_accept:") {
                        crate::commands::moderation::handle_staff_appeal_decision(inter, http, db, "accept", sanction_id).await
                    } else if cid.starts_with(crate::modules::conference::PREFIX) || crate::modules::conference::LEGACY.iter().any(|p| cid.starts_with(p)) {
                        crate::modules::conference::handle_component(inter, http, db, &cid).await
                    } else if let Some(sanction_id) = cid.strip_prefix("appeal_staff_reject:") {
                        crate::commands::moderation::handle_staff_appeal_decision(inter, http, db, "reject", sanction_id).await
                    } else if let Some(cat) = cid.strip_prefix("ticket_open:") {
                        crate::commands::tickets::handle_open_button(inter, http, cat).await
                    } else if cid == "btn_open_general_ticket" {
                        crate::commands::tickets::handle_open_button(inter, http, "general").await
                    } else if cid == "btn_open_report_ticket" {
                        crate::commands::tickets::handle_open_button(inter, http, "report").await
                    } else if cid == "btn_open_videaste_ticket" {
                        crate::commands::tickets::handle_open_button(inter, http, "videaste").await
                    } else if cid == "btn_open_appeal_ticket" {
                        crate::commands::tickets::handle_open_button(inter, http, "appeal").await
                    } else if cid == crate::commands::tickets::MODS_SELECT {
                        crate::commands::tickets::handle_mods_select(inter, http, &values, config.role_staff_id).await
                    } else if cid == "ticket_claim" || cid == "btn_claim_general_ticket" {
                        crate::commands::tickets::handle_claim(inter, http).await
                    } else if cid == "ticket_close" || cid == "btn_close_general_ticket" {
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
                    if let Some(owner) = crate::modules::component_owner(&cid) {
                        if !crate::modules::enabled(owner) {
                            crate::modules::reply_disabled(&http, &inter).await;
                            return;
                        }
                    }

                    if cid.starts_with(crate::modules::conference::PREFIX) {
                        if let Err(e) = crate::modules::conference::handle_modal(inter, http, db, &modal).await {
                            tracing::error!("Conférence : {:?}", e);
                        }
                    } else if cid.starts_with(crate::modules::gatekeeper::PREFIX) {
                        let _ = crate::modules::gatekeeper::handle_modal_submit(
                            inter,
                            &http,
                            &modal,
                            config.ticket_log_channel_id,
                        )
                        .await;
                    } else if cid == crate::modules::applications::MODAL {
                        if let Err(e) = crate::modules::applications::handle_modal(inter, http, db, &modal).await {
                            tracing::error!("Candidature : {:?}", e);
                        }
                    } else if let Some(sanction_id) = cid.strip_prefix("modal_appeal:") {
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

        Event::MessageUpdate(ev) => {
            crate::modules::message_log::on_update(&ev, &http, config.ticket_log_channel_id).await;
        }
        Event::MessageDelete(ev) => {
            crate::modules::message_log::on_delete(&ev, &http, &db, config.ticket_log_channel_id).await;
        }
        Event::MessageDeleteBulk(ev) => {
            crate::modules::message_log::on_delete_bulk(&ev, &http, config.ticket_log_channel_id).await;
        }
        Event::MemberAdd(ev) => {
            if crate::modules::security::on_member_add(&ev, &http, config.ticket_log_channel_id).await {
                return;
            }
            crate::modules::gatekeeper::on_member_add(&ev, &http).await;
            audit::handle_member_add(ev, &http, &db, config.ticket_log_channel_id).await;
        }
        Event::MemberRemove(ev) => {
            audit::handle_member_remove(ev, &http, &db, config.ticket_log_channel_id).await;
        }

        Event::GuildCreate(gc) => {
            if let twilight_model::gateway::payload::incoming::GuildCreate::Available(guild) = gc.as_ref() {
                crate::modules::staff::remember_guild(guild.id);
                crate::modules::invites::prime(&http, guild.id).await;
                for vs in &guild.voice_states {
                    let mut vs = vs.clone();
                    vs.guild_id.get_or_insert(guild.id);
                    crate::modules::activity::on_voice_state(&vs);
                }
            }
        }

        Event::VoiceStateUpdate(vsu) => {
            crate::modules::activity::on_voice_state(&vsu.0);
            if !vsu.0.member.as_ref().is_some_and(|m| m.user.bot) {
                crate::modules::conference::on_voice_state(&http, &db, vsu.0.user_id, vsu.0.channel_id).await;
            }
            if crate::modules::enabled("temp_voice") {
                temp_voice::handle_voice_state(&vsu, &http, &db).await;
            }
            audit::handle_voice_state_update(vsu.clone(), &http, &db, config.ticket_log_channel_id).await;

            if !crate::modules::enabled("vocal_roles") {
                return;
            }
            if let Some(guild_id) = vsu.guild_id {
                let user_id = vsu.user_id;

                if let Some(channel_id) = vsu.channel_id {
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
            if !crate::modules::enabled("vocal_roles") {
                return;
            }
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
            tracing::info!("Bot prêt, connecté sur {} serveurs", r.guilds.len());
        }

        _ => {}
    }
}

