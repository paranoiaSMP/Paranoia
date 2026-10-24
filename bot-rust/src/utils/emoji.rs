use std::{collections::HashMap, fmt, ops::Deref, sync::OnceLock};

use base64::{engine::general_purpose::STANDARD, Engine};
use twilight_http::Client as HttpClient;
use twilight_model::id::{marker::ApplicationMarker, Id};

/// Emoji de l'application : l'image est embarquée à la compilation et envoyée à Discord au démarrage.
/// Tant que la synchro n'a pas eu lieu (ou a échoué), on retombe sur l'ancien emoji du serveur DEV.
#[derive(Clone, Copy)]
pub struct E {
    name: &'static str,
    fallback: &'static str,
}

static LIVE: OnceLock<HashMap<String, String>> = OnceLock::new();

impl Deref for E {
    type Target = str;
    fn deref(&self) -> &str {
        LIVE.get().and_then(|m| m.get(self.name)).map_or(self.fallback, String::as_str)
    }
}

impl fmt::Display for E {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self)
    }
}

macro_rules! emojis {
    ($($c:ident $n:literal $fb:literal),* $(,)?) => {
        $(pub const $c: E = E { name: $n, fallback: $fb };)*
        const FILES: &[(&str, &[u8])] = &[$(($n, include_bytes!(concat!("../../assets/emojis/", $n, ".png")))),*];
    };
}

emojis! {
    TITLE "am_title" "<:am_title:1562454385311879240>",
    AUTHOR "am_author" "<:am_author:1562454392857428081>",
    MESSAGE "am_message" "<:am_message:1562454400935526450>",
    SANCTION "am_sanction" "<:am_sanction:1562454409563214004>",
    TIME "am_time" "<:am_time:1562454415708000397>",
    OK "em_ok" "<:em_ok:1562454422871744585>",
    OFF "em_off" "<:em_off:1562454430887055463>",
    STATS "em_stats" "<:em_stats:1562454437400944730>",
    SETTINGS "em_settings" "<:em_settings:1562454444065562725>",
    ECONOMY "em_economy" "<:em_economy:1562454451346743337>",
    TIKTOK "em_tiktok" "<:em_tiktok:1562454458653483098>",
    SUPPORT "em_support" "<:em_support:1562454465481539645>",
    STAFF "em_staff" "<:em_staff:1562454471915872278>",
    UTILS "em_utils" "<:em_utils:1562454478584676382>",
    PROMOTE "em_promote" "<:em_promote:1562454485622857768>",
    DEMOTE "em_demote" "<:em_demote:1562454492534800384>",
}

pub const CHANNEL: &str = "#️⃣";

/// Crée sur l'application les emojis qui lui manquent, puis mémorise leurs identifiants.
pub async fn sync(http: &HttpClient, app: Id<ApplicationMarker>) -> anyhow::Result<()> {
    let mut live: HashMap<String, String> = http
        .get_application_emojis(app)
        .await?
        .model()
        .await?
        .items
        .into_iter()
        .map(|e| (e.name.clone(), format!("<{}:{}:{}>", if e.animated { "a" } else { "" }, e.name, e.id)))
        .collect();

    for (name, png) in FILES {
        if live.contains_key(*name) {
            continue;
        }
        let data = format!("data:image/png;base64,{}", STANDARD.encode(png));
        match http.add_application_emoji(app, name, &data).await {
            Ok(res) => {
                let e = res.model().await?;
                live.insert(e.name.clone(), format!("<:{}:{}>", e.name, e.id));
            }
            Err(err) => tracing::warn!("Emoji {name} non importé : {err}"),
        }
    }
    let _ = REMAP.set(import_foreign(http, app, &mut live).await);
    let _ = LIVE.set(live);
    Ok(())
}

static REMAP: OnceLock<HashMap<String, String>> = OnceLock::new();

/// Remplace les emojis d'un autre serveur par ceux de l'application (si importés).
pub fn localize(text: &str) -> String {
    REMAP.get().map_or_else(|| text.to_string(), |m| m.iter().fold(text.to_string(), |t, (a, b)| t.replace(a, b)))
}

/// Importe sur l'application les emojis du règlement (embarqués à la compilation).
/// Renvoie ancien jeton -> nouveau jeton ; un échec laisse l'ancien jeton.
async fn import_foreign(
    http: &HttpClient,
    app: Id<ApplicationMarker>,
    live: &mut HashMap<String, String>,
) -> HashMap<String, String> {
    let mut map = HashMap::new();
    for (token, name, anim, img) in super::emoji_rules::RULE_EMOJIS {
        let key = format!("r_{name}");
        if let Some(t) = live.get(&key) {
            map.insert(token.to_string(), t.clone());
            continue;
        }
        let mime = if *anim { "image/gif" } else { "image/png" };
        let data = format!("data:{mime};base64,{}", STANDARD.encode(img));
        match http.add_application_emoji(app, &key, &data).await {
            Ok(res) => {
                if let Ok(e) = res.model().await {
                    let new = format!("<{}:{}:{}>", if *anim { "a" } else { "" }, e.name, e.id);
                    live.insert(key, new.clone());
                    map.insert(token.to_string(), new);
                }
            }
            Err(err) => tracing::warn!("Emoji {name} non importé : {err}"),
        }
    }
    map
}
