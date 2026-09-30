use sqlx::{PgPool, Row};
use twilight_model::channel::Message;
use rand::Rng;

pub async fn give_xp(msg: &Message, db: &PgPool) {
    let config = sqlx::query(r#"SELECT "moduleXp" FROM "GuildConfig" WHERE "guildId" = 'default'"#)
        .fetch_optional(db)
        .await
        .unwrap_or(None);

    let xp_enabled = config.map(|r| r.try_get("moduleXp").unwrap_or(false)).unwrap_or(false);
    if !xp_enabled {
        return;
    }

    let xp_to_give: i32 = {
        let mut rng = rand::thread_rng();
        rng.gen_range(5..=15)
    }; // Drop rng here before await

    let author_id = msg.author.id.to_string();
    
    let _ = sqlx::query(r#"UPDATE "User" SET xp = xp +  WHERE "discordId" = "#)
        .bind(xp_to_give)
        .bind(&author_id)
        .execute(db)
        .await;
}
