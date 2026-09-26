use std::env;
use anyhow::{Result, Context};

#[derive(Clone, Debug)]
pub struct Config {
    pub discord_token: String,
    pub database_url: String,
}

impl Config {
    pub fn load() -> Result<Self> {
        dotenvy::dotenv().ok();
        // Load from root if available
        dotenvy::from_path("../.env").ok();

        let discord_token = env::var("DISCORD_TOKEN").context("DISCORD_TOKEN is missing")?;
        let database_url = env::var("DATABASE_URL").context("DATABASE_URL is missing")?;

        Ok(Self {
            discord_token,
            database_url,
        })
    }
}
