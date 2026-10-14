use chrono::Utc;
use chrono_tz::Europe::Paris;
use sqlx::{PgPool, Row};

pub async fn credit(db: &PgPool, discord_id: &str, amount: i32) -> Option<i32> {
    let row = sqlx::query(r#"UPDATE "User" SET "paraCoins" = "paraCoins" + $1 WHERE "discordId" = $2 RETURNING "paraCoins""#)
        .bind(amount)
        .bind(discord_id)
        .fetch_optional(db)
        .await
        .ok()??;
    row.try_get("paraCoins").ok()
}

pub async fn user_id(db: &PgPool, discord_id: &str) -> Option<String> {
    sqlx::query_scalar(r#"SELECT id FROM "User" WHERE "discordId" = $1 LIMIT 1"#)
        .bind(discord_id)
        .fetch_optional(db)
        .await
        .ok()?
}

pub fn today() -> String {
    Utc::now().with_timezone(&Paris).format("%Y-%m-%d").to_string()
}

pub const NOT_LINKED: &str = "Ton compte Discord n'est pas lié au site. Connecte-toi sur https://paranoiastudio.fr pour récupérer tes ParaCoins.";
