use sqlx::{postgres::PgPoolOptions, PgPool};
use anyhow::Result;

pub async fn connect(url: &str) -> Result<PgPool> {
    let clean_url = url.replace("?schema=public", "");
    
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&clean_url)
        .await?;
        
    Ok(pool)
}
