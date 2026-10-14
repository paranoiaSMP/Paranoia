use rand::Rng;
use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;
use twilight_http::Client as HttpClient;
use twilight_model::application::interaction::Interaction;
use twilight_model::channel::message::component::{ActionRow, Button, ButtonStyle, Component};
use twilight_model::channel::message::{Message, MessageFlags};
use twilight_model::http::interaction::{InteractionResponse, InteractionResponseData, InteractionResponseType};
use twilight_model::id::{marker::{ChannelMarker, MessageMarker}, Id};
use twilight_util::builder::embed::EmbedBuilder;

use crate::modules::{embed, enabled, setting, setting_number, setting_value, wallet};

const ID: &str = "drops";
pub const PREFIX: &str = "drop:";

struct Drop {
    amount: i32,
    channel: Id<ChannelMarker>,
    message: Option<Id<MessageMarker>>,
    taken: bool,
}

#[derive(Default)]
struct State {
    counters: HashMap<u64, (i64, i64)>,
    drops: HashMap<u64, Drop>,
    next_id: u64,
}

fn state() -> &'static Mutex<State> {
    static S: OnceLock<Mutex<State>> = OnceLock::new();
    S.get_or_init(|| Mutex::new(State::default()))
}

fn channels() -> Vec<u64> {
    setting(ID, "channels")
        .unwrap_or_default()
        .split(|c: char| c == '\n' || c == ',' || c == ' ')
        .filter_map(|s| s.trim().parse().ok())
        .collect()
}

fn threshold() -> i64 {
    let lo = setting_number(ID, "minMessages", 40).max(5);
    let hi = setting_number(ID, "maxMessages", 120).max(lo);
    rand::thread_rng().gen_range(lo..=hi)
}

fn button(id: u64, disabled: bool) -> Vec<Component> {
    vec![Component::ActionRow(ActionRow {
        id: None,
        components: vec![Component::Button(Button {
            id: None,
            custom_id: Some(format!("{PREFIX}{id}")),
            disabled,
            emoji: None,
            label: Some("Attraper".to_string()),
            style: ButtonStyle::Success,
            url: None,
            sku_id: None,
        })],
    })]
}

fn result_embed(text: String) -> twilight_model::channel::message::Embed {
    EmbedBuilder::new().description(text).color(0x7c3aed).build()
}

pub async fn on_message(msg: &Message, http: &Arc<HttpClient>) {
    if !enabled(ID) || !channels().contains(&msg.channel_id.get()) {
        return;
    }
    let drop_id = {
        let mut st = state().lock().unwrap();
        let entry = st.counters.entry(msg.channel_id.get()).or_insert_with(|| (0, threshold()));
        entry.0 += 1;
        if entry.0 < entry.1 {
            return;
        }
        *entry = (0, threshold());
        let lo = setting_number(ID, "minCoins", 20).max(1);
        let hi = setting_number(ID, "maxCoins", 100).max(lo);
        let amount = rand::thread_rng().gen_range(lo..=hi) as i32;
        st.next_id += 1;
        let id = st.next_id;
        st.drops.insert(id, Drop { amount, channel: msg.channel_id, message: None, taken: false });
        id
    };

    let amount = state().lock().unwrap().drops.get(&drop_id).map(|d| d.amount).unwrap_or(0);
    let template = setting_value(ID, "message").unwrap_or_default();
    let (content, embed) = embed::render(&template, &[("amount", amount.to_string())]);
    let embeds: Vec<_> = embed.into_iter().collect();
    let components = button(drop_id, false);
    let mut req = http.create_message(msg.channel_id).embeds(&embeds).components(&components);
    if let Some(text) = content.as_deref() {
        req = req.content(text);
    }
    let sent = match req.await {
        Ok(res) => res.model().await.ok(),
        Err(e) => {
            tracing::warn!("Drop non envoyé : {:?}", e);
            None
        }
    };
    let Some(sent) = sent else {
        state().lock().unwrap().drops.remove(&drop_id);
        return;
    };
    if let Some(d) = state().lock().unwrap().drops.get_mut(&drop_id) {
        d.message = Some(sent.id);
    }

    let http = Arc::clone(http);
    let expire = setting_number(ID, "expireSeconds", 120).clamp(10, 3600) as u64;
    tokio::spawn(async move {
        tokio::time::sleep(Duration::from_secs(expire)).await;
        let gone = state().lock().unwrap().drops.remove(&drop_id).filter(|d| !d.taken);
        if let Some(d) = gone {
            if let Some(message) = d.message {
                let embeds = [result_embed("Personne n'a attrapé ce drop à temps.".to_string())];
                let _ = http.update_message(d.channel, message).content(None).embeds(Some(&embeds)).components(Some(&[])).await;
            }
        }
    });
}

async fn respond(http: &HttpClient, interaction: &Interaction, kind: InteractionResponseType, data: InteractionResponseData) {
    let response = InteractionResponse { kind, data: Some(data) };
    let _ = http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &response).await;
}

pub async fn handle_claim(interaction: Interaction, http: Arc<HttpClient>, db: PgPool, custom_id: &str) -> anyhow::Result<()> {
    let Some(drop_id) = custom_id.strip_prefix(PREFIX).and_then(|s| s.parse::<u64>().ok()) else { return Ok(()) };
    let Some(user_id) = interaction.author_id() else { return Ok(()) };

    let amount = {
        let mut st = state().lock().unwrap();
        match st.drops.get_mut(&drop_id) {
            Some(d) if !d.taken => {
                d.taken = true;
                Some(d.amount)
            }
            _ => None,
        }
    };
    let Some(amount) = amount else {
        respond(&http, &interaction, InteractionResponseType::ChannelMessageWithSource, InteractionResponseData {
            content: Some("Trop tard, ce drop a déjà été pris.".to_string()),
            flags: Some(MessageFlags::EPHEMERAL),
            ..Default::default()
        })
        .await;
        return Ok(());
    };

    match wallet::credit(&db, &user_id.to_string(), amount).await {
        Some(balance) => {
            state().lock().unwrap().drops.remove(&drop_id);
            let embeds = vec![result_embed(format!("<@{user_id}> a attrapé le drop : **+{amount} ParaCoins** (solde : {balance})."))];
            respond(&http, &interaction, InteractionResponseType::UpdateMessage, InteractionResponseData {
                content: Some(String::new()),
                embeds: Some(embeds),
                components: Some(button(drop_id, true)),
                ..Default::default()
            })
            .await;
        }
        None => {
            if let Some(d) = state().lock().unwrap().drops.get_mut(&drop_id) {
                d.taken = false;
            }
            respond(&http, &interaction, InteractionResponseType::ChannelMessageWithSource, InteractionResponseData {
                content: Some(wallet::NOT_LINKED.to_string()),
                flags: Some(MessageFlags::EPHEMERAL),
                ..Default::default()
            })
            .await;
        }
    }
    Ok(())
}
