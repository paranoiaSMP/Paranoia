use rand::seq::SliceRandom;
use serde::Deserialize;
use sqlx::PgPool;
use std::collections::VecDeque;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};
use twilight_http::Client as HttpClient;
use twilight_model::application::command::{Command, CommandType};
use twilight_model::application::interaction::Interaction;
use twilight_model::channel::message::{Message, MessageFlags};
use twilight_model::channel::permission_overwrite::PermissionOverwriteType;
use twilight_model::guild::Permissions;
use twilight_model::http::interaction::{InteractionResponse, InteractionResponseData, InteractionResponseType};
use twilight_model::id::{marker::ChannelMarker, Id};
use twilight_util::builder::command::CommandBuilder;
use twilight_util::builder::embed::EmbedBuilder;

use crate::modules::{embed, enabled, setting, setting_number, setting_value, wallet};

const ID: &str = "quiz";
const API_URL: &str = "https://quizzapi.jomoreschi.fr/api/v2/quiz";

pub const CATEGORIES: &[(&str, &str)] = &[
    ("all", "Toutes"),
    ("culture_generale", "Culture générale"),
    ("histoire", "Histoire"),
    ("geographie", "Géographie"),
    ("science", "Science"),
    ("sport", "Sport"),
    ("jeux_videos", "Jeux vidéo"),
    ("musique", "Musique"),
    ("tv_cinema", "TV et cinéma"),
    ("art_litterature", "Arts et littérature"),
    ("gastronomie", "Gastronomie"),
    ("actu_politique", "Actualités et politique"),
];

pub const DEFAULT_QUESTIONS: &str = "\
Combien de blocs d'obsidienne faut-il au minimum pour un portail du Nether ? = 10 | dix
Quel mob explose quand il s'approche du joueur ? = creeper
Comment s'appelle le boss de l'End ? = ender dragon | dragon de l'ender | dragon
Avec quel objet apprivoise-t-on un loup ? = os
Quel objet lance-t-on pour trouver une forteresse de l'End ? = oeil de l'ender | œil de l'ender | eye of ender
Quel métal obtient-on à partir des débris antiques ? = netherite
Quel mob volant tire des boules de feu dans le Nether ? = ghast
Avec quel outil récolte-t-on de la laine sans tuer le mouton ? = cisailles
Quel bloc permet de réapparaître dans le Nether ? = ancre de réapparition | respawn anchor
Combien de cœurs a un joueur au maximum, sans effet ? = 10 | dix
Comment s'appelle la monnaie de Paranoia Studio ? = paracoins | paracoin
Comment s'appelle le launcher du studio ? = paranoia client
Quelle est la rareté de carte la plus haute ? = mythique
Combien de boosters différents y a-t-il sur le site ? = 4 | quatre
Qui a fondé Paranoia Studio ? = nozaii_tv | nozaii tv | nozaii
Dans quel jeu du casino un multiplicateur grimpe jusqu'à exploser ? = crash";

#[derive(Clone)]
struct Question {
    text: String,
    answers: Vec<String>,
    wrong: Vec<String>,
}

struct Active {
    question: String,
    answers: Vec<String>,
    wrong: Vec<String>,
    channel: Id<ChannelMarker>,
    reward: i32,
    deadline: Instant,
}

#[derive(Default)]
struct State {
    active: Option<Active>,
    last_asked: Option<Instant>,
    recent: VecDeque<String>,
    api_pool: Vec<Question>,
    api_key: String,
}

fn state() -> &'static Mutex<State> {
    static S: OnceLock<Mutex<State>> = OnceLock::new();
    S.get_or_init(|| Mutex::new(State::default()))
}

fn normalize(s: &str) -> String {
    let mut out = String::new();
    for c in s.to_lowercase().chars() {
        let mapped = match c {
            'à' | 'â' | 'ä' | 'á' => "a",
            'é' | 'è' | 'ê' | 'ë' => "e",
            'î' | 'ï' | 'í' => "i",
            'ô' | 'ö' | 'ó' => "o",
            'ù' | 'û' | 'ü' | 'ú' => "u",
            'ç' => "c",
            'œ' => "oe",
            'æ' => "ae",
            c if c.is_alphanumeric() => {
                out.push(c);
                continue;
            }
            _ => " ",
        };
        out.push_str(mapped);
    }
    out.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn contains_words(haystack: &str, needle: &str) -> bool {
    !needle.is_empty() && format!(" {haystack} ").contains(&format!(" {needle} "))
}

fn is_correct(message: &str, a: &Active) -> bool {
    let said = normalize(message);
    if !a.answers.iter().any(|ans| contains_words(&said, ans)) {
        return false;
    }
    let longest = a.answers.iter().map(|x| x.split(' ').count()).max().unwrap_or(1);
    if said.split(' ').count() > longest + 12 {
        return false;
    }
    !a.wrong.iter().any(|w| contains_words(&said, w) && !a.answers.iter().any(|ans| contains_words(ans, w)))
}

fn custom_questions() -> Vec<Question> {
    let raw = setting(ID, "questions").unwrap_or_else(|| DEFAULT_QUESTIONS.to_string());
    raw.lines()
        .filter_map(|line| {
            let (q, a) = line.split_once('=')?;
            let answers: Vec<String> = a.split('|').map(normalize).filter(|s| !s.is_empty()).collect();
            (!q.trim().is_empty() && !answers.is_empty()).then(|| Question { text: q.trim().to_string(), answers, wrong: vec![] })
        })
        .collect()
}

#[derive(Deserialize)]
struct ApiResponse {
    quizzes: Vec<ApiQuiz>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiQuiz {
    question: String,
    answer: String,
    #[serde(default)]
    bad_answers: Vec<String>,
}

async fn api_question() -> Option<Question> {
    let category = setting(ID, "apiCategory").filter(|c| c != "all" && CATEGORIES.iter().any(|(k, _)| k == c));
    let difficulty = setting(ID, "apiDifficulty").filter(|d| ["facile", "normal", "difficile"].contains(&d.as_str()));
    let key = format!("{category:?}/{difficulty:?}");
    {
        let mut st = state().lock().unwrap();
        if st.api_key != key {
            st.api_pool.clear();
            st.api_key = key.clone();
        }
        if let Some(q) = st.api_pool.pop() {
            return Some(q);
        }
    }
    let mut query = vec![("limit", "40".to_string())];
    if let Some(c) = category {
        query.push(("category", c));
    }
    if let Some(d) = difficulty {
        query.push(("difficulty", d));
    }
    let client = reqwest::Client::builder().timeout(Duration::from_secs(8)).build().ok()?;
    let res: ApiResponse = client.get(API_URL).query(&query).send().await.ok()?.error_for_status().ok()?.json().await.ok()?;
    let mut fetched: Vec<Question> = res
        .quizzes
        .into_iter()
        .filter_map(|q| {
            let answer = normalize(&q.answer);
            let short = !answer.is_empty() && answer.split(' ').count() <= 4 && q.answer.chars().count() <= 40;
            let asked = format!(" {} ", normalize(&q.question));
            let needs_choices = [" parmi ", " de ces ", " ces propositions ", " suivants ", " suivantes ", " suivant ", " suivante "].iter().any(|w| asked.contains(w));
            (short && !needs_choices).then(|| Question {
                text: q.question.trim().to_string(),
                answers: vec![answer],
                wrong: q.bad_answers.iter().map(|w| normalize(w)).filter(|w| !w.is_empty()).collect(),
            })
        })
        .collect();
    fetched.shuffle(&mut rand::thread_rng());
    let mut st = state().lock().unwrap();
    if st.api_key != key {
        return fetched.pop();
    }
    st.api_pool = fetched;
    st.api_pool.pop()
}

fn pick_custom(st: &mut State, pool: &[Question]) -> Option<Question> {
    if pool.is_empty() {
        return None;
    }
    let fresh: Vec<&Question> = pool.iter().filter(|q| !st.recent.contains(&q.text)).collect();
    let source: Vec<&Question> = if fresh.is_empty() { pool.iter().collect() } else { fresh };
    let q = (*source.choose(&mut rand::thread_rng())?).clone();
    st.recent.push_back(q.text.clone());
    while st.recent.len() > pool.len().saturating_sub(1).min(10) {
        st.recent.pop_front();
    }
    Some(q)
}

async fn next_question() -> Option<Question> {
    let source = setting(ID, "source").unwrap_or_else(|| "mix".to_string());
    let use_api = match source.as_str() {
        "custom" => false,
        "api" => true,
        _ => rand::random::<bool>(),
    };
    if use_api {
        if let Some(q) = api_question().await {
            return Some(q);
        }
    }
    let pool = custom_questions();
    let mut st = state().lock().unwrap();
    pick_custom(&mut st, &pool)
}

fn quiz_channel() -> Option<Id<ChannelMarker>> {
    setting(ID, "channelId").and_then(|c| c.trim().parse::<u64>().ok()).map(Id::new)
}

fn locks_channel() -> bool {
    setting(ID, "lockChannel").map(|v| v != "no").unwrap_or(true)
}

async fn set_writable(http: &HttpClient, channel: Id<ChannelMarker>, writable: bool) {
    if !locks_channel() {
        return;
    }
    let Ok(res) = http.channel(channel).await else { return };
    let Ok(ch) = res.model().await else { return };
    let Some(guild) = ch.guild_id else { return };
    let everyone = ch
        .permission_overwrites
        .unwrap_or_default()
        .into_iter()
        .find(|o| o.kind == PermissionOverwriteType::Role && o.id.get() == guild.get());
    let (mut allow, mut deny) = everyone.map(|o| (o.allow, o.deny)).unwrap_or((Permissions::empty(), Permissions::empty()));
    if writable {
        deny.remove(Permissions::SEND_MESSAGES);
    } else {
        allow.remove(Permissions::SEND_MESSAGES);
        deny.insert(Permissions::SEND_MESSAGES);
    }
    let overwrite = twilight_model::http::permission_overwrite::PermissionOverwrite {
        allow: Some(allow),
        deny: Some(deny),
        id: guild.cast(),
        kind: twilight_model::http::permission_overwrite::PermissionOverwriteType::Role,
    };
    let _ = http.update_channel_permission(channel, &overwrite).await;
}

pub fn register() -> Command {
    CommandBuilder::new("quiz", "Poser une question du quiz maintenant", CommandType::ChatInput)
        .default_member_permissions(Permissions::MANAGE_GUILD)
        .build()
}

async fn ask(http: &Arc<HttpClient>) -> Result<(), &'static str> {
    let Some(channel) = quiz_channel() else { return Err("Choisis d'abord le salon du quiz dans les réglages du module.") };
    if state().lock().unwrap().active.is_some() {
        return Err("Une question est déjà en cours.");
    }
    let Some(q) = next_question().await else {
        return Err("Aucune question disponible : ajoute des questions (format : question = réponse) ou choisis QuizzAPI comme source.");
    };
    let reward = setting_number(ID, "reward", 50).clamp(1, 100_000) as i32;
    let seconds = setting_number(ID, "answerSeconds", 60).clamp(10, 600) as u64;

    {
        let mut st = state().lock().unwrap();
        if st.active.is_some() {
            return Err("Une question est déjà en cours.");
        }
        st.last_asked = Some(Instant::now());
        st.active = Some(Active {
            question: q.text.clone(),
            answers: q.answers.clone(),
            wrong: q.wrong.clone(),
            channel,
            reward,
            deadline: Instant::now() + Duration::from_secs(seconds),
        });
    }

    set_writable(http, channel, true).await;
    let template = setting_value(ID, "message").unwrap_or_default();
    let vars = [("question", q.text.clone()), ("reward", reward.to_string()), ("seconds", seconds.to_string())];
    let (content, embed) = embed::render(&template, &vars);
    let embeds: Vec<_> = embed.into_iter().collect();
    let mut req = http.create_message(channel).embeds(&embeds);
    if let Some(text) = content.as_deref() {
        req = req.content(text);
    }
    if req.await.is_err() {
        state().lock().unwrap().active = None;
        return Err("Impossible d'écrire dans le salon du quiz (permissions du bot ?).");
    }

    let http = Arc::clone(http);
    let picked = q.text;
    tokio::spawn(async move {
        tokio::time::sleep(Duration::from_secs(seconds)).await;
        let expired = {
            let mut st = state().lock().unwrap();
            match &st.active {
                Some(a) if a.question == picked && Instant::now() >= a.deadline => st.active.take(),
                _ => None,
            }
        };
        if let Some(a) = expired {
            set_writable(&http, a.channel, false).await;
            let embed = EmbedBuilder::new()
                .description(format!("Temps écoulé ! La réponse était **{}**.", a.answers.first().cloned().unwrap_or_default()))
                .color(0x52525b)
                .build();
            let _ = http.create_message(a.channel).embeds(&[embed]).await;
        }
    });
    Ok(())
}

pub async fn on_message(msg: &Message, http: &Arc<HttpClient>, db: &PgPool) {
    if !enabled(ID) {
        return;
    }
    let won = {
        let mut st = state().lock().unwrap();
        let hit = matches!(&st.active, Some(a) if a.channel == msg.channel_id && Instant::now() < a.deadline && is_correct(&msg.content, a));
        if hit { st.active.take() } else { None }
    };
    let Some(won) = won else { return };

    match wallet::credit(db, &msg.author.id.to_string(), won.reward).await {
        Some(balance) => {
            set_writable(http, won.channel, false).await;
            let embed = EmbedBuilder::new()
                .description(format!(
                    "Bonne réponse de <@{}> : **{}**. **+{} ParaCoins** (solde : {balance}).",
                    msg.author.id,
                    won.answers.first().cloned().unwrap_or_default(),
                    won.reward
                ))
                .color(0x22c55e)
                .build();
            let _ = http.create_message(msg.channel_id).embeds(&[embed]).await;
        }
        None => {
            {
                let mut st = state().lock().unwrap();
                if st.active.is_none() {
                    st.active = Some(won);
                }
            }
            let _ = http
                .create_message(msg.channel_id)
                .content(&format!("<@{}> bonne réponse, mais ton compte n'est pas lié au site : lie-le sur https://paranoiastudio.fr pour gagner les ParaCoins. La question reste ouverte.", msg.author.id))
                .await;
        }
    }
}

pub async fn run(interaction: Interaction, http: Arc<HttpClient>) -> anyhow::Result<()> {
    let response = InteractionResponse { kind: InteractionResponseType::DeferredChannelMessageWithSource, data: Some(InteractionResponseData { flags: Some(MessageFlags::EPHEMERAL), ..Default::default() }) };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &response).await?;
    let text = match ask(&http).await {
        Ok(()) => "Question posée.".to_string(),
        Err(e) => e.to_string(),
    };
    http.interaction(interaction.application_id).update_response(&interaction.token).content(Some(&text)).await?;
    Ok(())
}

pub fn spawn_scheduler(http: Arc<HttpClient>) {
    tokio::spawn(async move {
        let mut tick = tokio::time::interval(Duration::from_secs(60));
        let mut first = true;
        loop {
            tick.tick().await;
            if first {
                first = false;
                if enabled(ID) && state().lock().unwrap().active.is_none() {
                    if let Some(channel) = quiz_channel() {
                        set_writable(&http, channel, false).await;
                    }
                }
            }
            let every = setting_number(ID, "intervalMinutes", 60);
            if !enabled(ID) || every <= 0 {
                continue;
            }
            let due = state().lock().unwrap().last_asked.is_none_or(|t| t.elapsed() >= Duration::from_secs(every as u64 * 60));
            if due {
                let _ = ask(&http).await;
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    fn active(answers: &[&str], wrong: &[&str]) -> Active {
        Active {
            question: String::new(),
            answers: answers.iter().map(|a| normalize(a)).collect(),
            wrong: wrong.iter().map(|w| normalize(w)).collect(),
            channel: Id::new(1),
            reward: 1,
            deadline: Instant::now(),
        }
    }

    #[test]
    fn reponse_dans_une_phrase() {
        let a = active(&["Chacal"], &["Chat", "Faucon", "Cobra"]);
        assert!(is_correct("chacal", &a));
        assert!(is_correct("Je pense que c'est le CHACAL !", &a));
        assert!(is_correct("un chacal non ?", &a));
        assert!(!is_correct("chacals", &a));
        assert!(!is_correct("chat", &a));
        assert!(!is_correct("chat ou chacal", &a));
    }

    #[test]
    fn plusieurs_mots_et_accents() {
        let a = active(&["oeil de l'ender", "eye of ender"], &[]);
        assert!(is_correct("c'est l'Œil de l'Ender", &a));
        assert!(is_correct("eye of ender", &a));
        assert!(!is_correct("ender", &a));
    }

    #[test]
    fn pas_de_liste_a_rallonge() {
        let a = active(&["10"], &[]);
        assert!(is_correct("il en faut 10", &a));
        assert!(!is_correct("1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16", &a));
    }
}
