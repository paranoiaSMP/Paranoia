use std::sync::Arc;
use twilight_gateway::Event;
use twilight_http::Client as HttpClient;
use sqlx::PgPool;

pub async fn handle_event(event: Event, http: Arc<HttpClient>, db: PgPool) {
    match event {
        Event::MessageCreate(msg) => {
            if msg.author.bot {
                return;
            }
            if msg.content == "!ping" {
                let _ = http.create_message(msg.channel_id).content("Pong!").await;
            }
        }
        Event::InteractionCreate(mut interaction) => {
            let data = interaction.data.take();
            match data {
                Some(twilight_model::application::interaction::InteractionData::ApplicationCommand(cmd)) => {
                    match cmd.name.as_str() {
                        "cartes" => {
                            if let Err(e) = crate::commands::cartes::run(interaction.0, http, db).await {
                                println!("Erreur lors de l'exécution de /cartes : {:?}", e);
                            }
                        }
                        _ => {}
                    }
                }
                Some(twilight_model::application::interaction::InteractionData::MessageComponent(comp)) => {
                    if comp.custom_id.starts_with("cartes:") {
                        if let Err(e) = crate::commands::cartes::handle_button(interaction.0, http, db, &comp.custom_id).await {
                            println!("Erreur lors de la pagination /cartes : {:?}", e);
                        }
                    }
                }
                _ => {}
            }
        }
        Event::Ready(_) => {
            println!("Shard is ready");
        }
        _ => {}
    }
}
