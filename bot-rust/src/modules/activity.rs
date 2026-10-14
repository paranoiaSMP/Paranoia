use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;
use twilight_http::Client as HttpClient;
use twilight_model::id::{marker::{ChannelMarker, GuildMarker, UserMarker}, Id};
use twilight_model::voice::VoiceState;

use crate::modules::{enabled, setting_number, wallet};

#[derive(Clone)]
struct InVoice {
    guild: Id<GuildMarker>,
    channel: Id<ChannelMarker>,
    deaf: bool,
    bot: bool,
    user: Option<twilight_model::user::User>,
}

#[derive(Default)]
struct State {
    pending: HashMap<u64, (i32, i32)>,
    voice: HashMap<u64, InVoice>,
}

fn state() -> &'static Mutex<State> {
    static S: OnceLock<Mutex<State>> = OnceLock::new();
    S.get_or_init(|| Mutex::new(State::default()))
}

pub fn count_message(user: Id<UserMarker>) {
    if enabled("quests") {
        state().lock().unwrap().pending.entry(user.get()).or_default().0 += 1;
    }
}

pub fn on_voice_state(vs: &VoiceState) {
    let mut st = state().lock().unwrap();
    match (vs.channel_id, vs.guild_id) {
        (Some(channel), Some(guild)) => {
            let user = vs.member.as_ref().map(|m| m.user.clone());
            let bot = user.as_ref().is_some_and(|u| u.bot);
            st.voice.insert(vs.user_id.get(), InVoice { guild, channel, deaf: vs.self_deaf || vs.deaf, bot, user });
        }
        _ => {
            st.voice.remove(&vs.user_id.get());
        }
    }
}

pub fn spawn(http: Arc<HttpClient>, db: PgPool) {
    tokio::spawn(async move {
        let mut tick = tokio::time::interval(Duration::from_secs(60));
        tick.tick().await;
        loop {
            tick.tick().await;

            let active: Vec<(u64, Id<GuildMarker>, Option<twilight_model::user::User>)> = {
                let mut st = state().lock().unwrap();
                let mut humans: HashMap<Id<ChannelMarker>, usize> = HashMap::new();
                for v in st.voice.values().filter(|v| !v.bot) {
                    *humans.entry(v.channel).or_default() += 1;
                }
                let active: Vec<(u64, Id<GuildMarker>, Option<twilight_model::user::User>)> = st
                    .voice
                    .iter()
                    .filter(|(_, v)| !v.bot && !v.deaf && humans.get(&v.channel).copied().unwrap_or(0) >= 2)
                    .map(|(u, v)| (*u, v.guild, v.user.clone()))
                    .collect();
                if enabled("quests") {
                    for (u, _, _) in &active {
                        st.pending.entry(*u).or_default().1 += 1;
                    }
                }
                active
            };

            let per_minute = setting_number("xp", "voiceXpPerMinute", 3).clamp(0, 100) as i32;
            if enabled("xp") && per_minute > 0 {
                for (user_id, guild, known) in &active {
                    let user = match known {
                        Some(u) => Some(u.clone()),
                        None => match http.user(Id::new(*user_id)).await {
                            Ok(res) => res.model().await.ok(),
                            Err(_) => None,
                        },
                    };
                    if let Some(user) = user {
                        crate::events::xp::add_xp(&http, &db, &user, per_minute, Some(*guild), None).await;
                    }
                }
            }

            flush(&db).await;
        }
    });
}

async fn flush(db: &PgPool) {
    let batch: Vec<(u64, (i32, i32))> = std::mem::take(&mut state().lock().unwrap().pending).into_iter().collect();
    if batch.is_empty() {
        return;
    }
    let day = wallet::today();
    for (discord_id, (messages, minutes)) in batch {
        let _ = sqlx::query(
            r#"INSERT INTO "BotDailyProgress" ("userId", day, messages, "voiceMinutes", "updatedAt")
               SELECT id, $2, $3, $4, NOW() FROM "User" WHERE "discordId" = $1
               ON CONFLICT ("userId", day) DO UPDATE SET
                 messages = "BotDailyProgress".messages + EXCLUDED.messages,
                 "voiceMinutes" = "BotDailyProgress"."voiceMinutes" + EXCLUDED."voiceMinutes",
                 "updatedAt" = NOW()"#,
        )
        .bind(discord_id.to_string())
        .bind(&day)
        .bind(messages)
        .bind(minutes)
        .execute(db)
        .await;
    }
}

pub fn unsaved(user: Id<UserMarker>) -> (i32, i32) {
    state().lock().unwrap().pending.get(&user.get()).copied().unwrap_or_default()
}

pub fn humans_in(channel: Id<ChannelMarker>) -> Vec<u64> {
    state().lock().unwrap().voice.iter().filter(|(_, v)| v.channel == channel && !v.bot).map(|(u, _)| *u).collect()
}
