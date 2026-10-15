//! Retrouve l'invitation utilisée à l'arrivée d'un membre : on compare les compteurs d'utilisation avant/après.
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use twilight_http::Client as HttpClient;
use twilight_model::id::{marker::{GuildMarker, UserMarker}, Id};

#[derive(Clone, Debug, PartialEq)]
pub struct Used {
    pub code: String,
    pub inviter: Option<Id<UserMarker>>,
    pub uses: u64,
}

fn cache() -> &'static Mutex<HashMap<String, u64>> {
    static C: OnceLock<Mutex<HashMap<String, u64>>> = OnceLock::new();
    C.get_or_init(Default::default)
}

async fn fetch(http: &HttpClient, guild: Id<GuildMarker>) -> Option<Vec<Used>> {
    let invites = http.guild_invites(guild).await.ok()?.model().await.ok()?;
    Some(invites.into_iter().map(|i| Used { code: i.code, inviter: i.inviter.map(|u| u.id), uses: i.uses.unwrap_or(0) }).collect())
}

/// Mémorise les compteurs actuels (à l'arrivée du bot sur le serveur).
pub async fn prime(http: &HttpClient, guild: Id<GuildMarker>) {
    if let Some(now) = fetch(http, guild).await {
        *cache().lock().unwrap() = now.into_iter().map(|i| (i.code, i.uses)).collect();
    }
}

/// Invitation dont le compteur a grimpé depuis le dernier passage (une invitation inconnue du cache part de 0).
fn diff(before: &HashMap<String, u64>, now: &[Used]) -> Option<Used> {
    now.iter().find(|i| i.uses > before.get(&i.code).copied().unwrap_or(0)).cloned()
}

// shortcut: si deux membres arrivent en même temps ou si l'invitation était à usage unique (supprimée aussitôt), on répond « inconnue ».
pub async fn on_join(http: &HttpClient, guild: Id<GuildMarker>) -> Option<Used> {
    let now = fetch(http, guild).await?;
    let mut c = cache().lock().unwrap();
    let found = diff(&c, &now);
    *c = now.into_iter().map(|i| (i.code, i.uses)).collect();
    found
}

#[cfg(test)]
mod tests {
    use super::*;

    fn inv(code: &str, uses: u64) -> Used {
        Used { code: code.into(), inviter: None, uses }
    }

    #[test]
    fn finds_the_invite_whose_counter_grew() {
        let before = HashMap::from([("a".to_string(), 3), ("b".to_string(), 5)]);
        assert_eq!(diff(&before, &[inv("a", 3), inv("b", 6)]).unwrap().code, "b");
        assert_eq!(diff(&before, &[inv("a", 3), inv("b", 5), inv("c", 1)]).unwrap().code, "c");
        assert!(diff(&before, &[inv("a", 3), inv("b", 5), inv("c", 0)]).is_none());
    }
}
