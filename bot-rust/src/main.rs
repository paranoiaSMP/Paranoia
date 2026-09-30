mod commands;
mod config;
mod db;
mod events;
mod utils;

use anyhow::Result;
use std::sync::Arc;
use twilight_gateway::{EventTypeFlags, Intents, Shard, ShardId, StreamExt as _};
use twilight_http::Client as HttpClient;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    tracing::info!("Initializing Paranoia SMP Discord Bot (Rust/Twilight)...");

    let config = Arc::new(config::Config::load()?);
    tracing::info!("Configuration loaded successfully");

    tracing::info!("Initializing PostgreSQL pool...");
    let pool = db::init_pool_lazy(&config.database_url)?;

    match db::health_check(&pool).await {
        Ok(_) => {
            tracing::info!("Database health check OK");
            if let Err(e) = db::run_migrations(&pool).await {
                tracing::warn!("Database migrations could not be applied: {}", e);
            } else {
                tracing::info!("Database migrations applied successfully");
            }

            if let Err(e) = db::migrate_json_data(&pool).await {
                tracing::warn!("JSON migration skipped: {}", e);
            } else {
                tracing::info!("JSON data migration complete");
            }
        }
        Err(e) => {
            tracing::warn!(
                "PostgreSQL is unreachable ({}). Bot starting in resilient mode (commands requiring DB will connect once available).",
                e
            );
        }
    }

    let intents = Intents::GUILDS
        | Intents::GUILD_MESSAGES
        | Intents::MESSAGE_CONTENT
        | Intents::GUILD_MEMBERS
        | Intents::GUILD_VOICE_STATES;

    let mut shard = Shard::new(ShardId::ONE, config.discord_token.clone(), intents);
    let http = Arc::new(HttpClient::new(config.discord_token.clone()));

    let current_user = http.current_user().await?.model().await?;
    tracing::info!("Bot ready: {} (ID: {})", current_user.name, current_user.id);

    let application = http.current_user_application().await?.model().await?;
    let commands = commands::get_commands();
    http.interaction(application.id)
        .set_global_commands(&commands)
        .await?;
    tracing::info!("Registered {} global commands", commands.len());

    // Background task: TikTok monitoring loop
    let http_tiktok = Arc::clone(&http);
    let pool_tiktok = pool.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(90));
        loop {
            interval.tick().await;
            if let Err(e) = commands::tiktok::check_all_tiktok(&http_tiktok, &pool_tiktok).await {
                tracing::warn!("TikTok background check error: {:?}", e);
            }
        }
    });

    tracing::info!("Starting gateway event loop...");

    tokio::select! {
        _ = tokio::signal::ctrl_c() => {
            tracing::info!("Received shutdown signal (Ctrl+C), stopping shard...");
        }
        _ = async {
            loop {
                let event = match shard.next_event(EventTypeFlags::all()).await {
                    Some(Ok(event)) => event,
                    Some(Err(source)) => {
                        tracing::warn!("Gateway event error: {:?}", source);
                        continue;
                    }
                    None => break,
                };

                let http_clone = Arc::clone(&http);
                let pool_clone = pool.clone();
                let config_clone = Arc::clone(&config);
                tokio::spawn(events::handle_event(event, http_clone, pool_clone, config_clone));
            }
        } => {}
    }

    pool.close().await;
    tracing::info!("Shutdown complete");

    Ok(())
}
