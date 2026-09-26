mod config;
mod database;
mod commands;
mod events;
mod utils;

use anyhow::Result;
use std::sync::Arc;
use twilight_gateway::{EventTypeFlags, Intents, Shard, ShardId, StreamExt as _};
use twilight_http::Client as HttpClient;

#[tokio::main]
async fn main() -> Result<()> {
    let config = config::Config::load()?;

    println!("Connecting to database...");
    let pool = database::connect(&config.database_url).await?;
    println!("[SUCCESS] DB connected successfully");

    let intents = Intents::GUILDS 
        | Intents::GUILD_MESSAGES 
        | Intents::MESSAGE_CONTENT 
        | Intents::GUILD_MEMBERS 
        | Intents::GUILD_VOICE_STATES;
    
    let mut shard = Shard::new(ShardId::ONE, config.discord_token.clone(), intents);
    let http = Arc::new(HttpClient::new(config.discord_token));
    
    let current_user = http.current_user().await?.model().await?;
    println!("[SUCCESS] Bot connecté : {} (ID: {})", current_user.name, current_user.id);

    let application = http.current_user_application().await?.model().await?;

    println!("Enregistrement des commandes slash...");
    let commands = commands::get_commands();
    http.interaction(application.id)
        .set_global_commands(&commands)
        .await?;
    println!("[SUCCESS] Commandes slash enregistrées");

    println!("Starting event loop...");
    loop {
        let event = match shard.next_event(EventTypeFlags::all()).await {
            Some(Ok(event)) => event,
            Some(Err(source)) => {
                println!("Error receiving event: {:?}", source);
                continue;
            }
            None => break,
        };

        // On spawn une tâche tokio pour ne pas bloquer la réception d'autres événements
        tokio::spawn(events::handle_event(event, Arc::clone(&http), pool.clone()));
    }

    Ok(())
}
