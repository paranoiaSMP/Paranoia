//! Escalade : chaque infraction d'automod ajoute des points; des paliers déclenchent un mute.
//! shortcut: paliers et TTL en dur, pas de config par serveur; à brancher sur les réglages du site si besoin.

use chrono::{Duration, Utc};
use sqlx::PgPool;
use twilight_http::{request::AuditLogReason, Client as HttpClient};
use twilight_model::{
    id::{
        marker::{GuildMarker, UserMarker},
        Id,
    },
    util::Timestamp,
};

/// Les points expirent si le membre n'a rien fait pendant ce délai.
const TTL_DAYS: i64 = 7;

pub struct Tier {
    pub threshold: f32,
    pub mute: Duration,
    pub reset: bool,
}

/// Palier le plus haut atteint par `points`.
pub fn tier_for(points: f32) -> Option<Tier> {
    [
        (8.0, Duration::hours(24), true),
        (5.0, Duration::hours(1), false),
        (3.0, Duration::minutes(10), false),
    ]
    .into_iter()
    .find(|(t, _, _)| points >= *t)
    .map(|(threshold, mute, reset)| Tier { threshold, mute, reset })
}

/// Ajoute `weight` points; applique le mute du palier atteint et renvoie sa durée.
pub async fn add_strike(
    db: &PgPool,
    http: &HttpClient,
    guild: Id<GuildMarker>,
    user: Id<UserMarker>,
    weight: f32,
    reason: &str,
) -> Option<Duration> {
    let points: f32 = sqlx::query_scalar(
        "INSERT INTO automod_points (guild_id, user_id, points, updated_at) VALUES ($1, $2, $3, NOW())
         ON CONFLICT (guild_id, user_id) DO UPDATE SET
           points = CASE WHEN automod_points.updated_at < NOW() - make_interval(days => $4::int)
                         THEN EXCLUDED.points ELSE automod_points.points + EXCLUDED.points END,
           updated_at = NOW()
         RETURNING points",
    )
    .bind(guild.get() as i64)
    .bind(user.get() as i64)
    .bind(weight)
    .bind(TTL_DAYS as i32)
    .fetch_one(db)
    .await
    .ok()?;

    let tier = tier_for(points)?;
    let until = Utc::now() + tier.mute;

    // Ne jamais raccourcir un timeout déjà en cours (ex. 24h pour phishing).
    let current = http
        .guild_member(guild, user)
        .await
        .ok()?
        .model()
        .await
        .ok()
        .and_then(|m| m.communication_disabled_until)
        .map(|t| t.as_secs());
    if current.is_none_or(|c| c < until.timestamp()) {
        let ts = Timestamp::from_secs(until.timestamp()).ok()?;
        http.update_guild_member(guild, user)
            .communication_disabled_until(Some(ts))
            .reason(reason)
            .await
            .ok()?;
    }

    let id = format!("{:06x}", rand::random::<u32>() & 0x00ff_ffff);
    let _ = sqlx::query(
        "INSERT INTO sanctions (id, guild_id, user_id, mod_id, sanction_type, duration, reason, created_at, appealed)
         VALUES ($1, $2, $3, 0, 'mute', $4, $5, NOW(), FALSE)",
    )
    .bind(id)
    .bind(guild.get() as i64)
    .bind(user.get() as i64)
    .bind(format!("{}min", tier.mute.num_minutes()))
    .bind(format!("Automod, escalade ({points:.1} pts, palier {})", tier.threshold))
    .execute(db)
    .await;

    if tier.reset {
        let _ = sqlx::query("UPDATE automod_points SET points = 0 WHERE guild_id = $1 AND user_id = $2")
            .bind(guild.get() as i64)
            .bind(user.get() as i64)
            .execute(db)
            .await;
    }
    Some(tier.mute)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tiers_follow_points() {
        assert!(tier_for(2.9).is_none());
        assert_eq!(tier_for(3.0).unwrap().mute, Duration::minutes(10));
        assert_eq!(tier_for(5.0).unwrap().mute, Duration::hours(1));
        let top = tier_for(9.0).unwrap();
        assert_eq!(top.mute, Duration::hours(24));
        assert!(top.reset);
    }
}
