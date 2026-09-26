use sqlx::PgPool;
use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::{
    application::{
        command::{CommandOption, CommandOptionType},
        interaction::{Interaction, application_command::CommandOptionValue, InteractionData},
    },
    channel::message::{
        component::{ActionRow, Button, ButtonStyle, Component},
        embed::{Embed, EmbedField},
    },
    http::interaction::{InteractionResponse, InteractionResponseType},
};
use twilight_util::builder::{
    command::{CommandBuilder, StringBuilder},
    embed::{EmbedBuilder, EmbedFieldBuilder, ImageSource},
    InteractionResponseDataBuilder,
};

#[derive(Debug, sqlx::FromRow)]
struct UserCard {
    id: String,
    title: String,
    rarity: String,
    edition: Option<String>,
    #[sqlx(rename = "imageUrl")]
    image_url: Option<String>,
    #[sqlx(rename = "renderedImageUrl")]
    rendered_image_url: Option<String>,
    proba: i32,
}

pub async fn run(interaction: Interaction, http: Arc<HttpClient>, db: PgPool) -> anyhow::Result<()> {
    let interaction_id = interaction.id;
    let interaction_token = interaction.token.clone();
    
    let defer_response = InteractionResponse {
        kind: InteractionResponseType::DeferredChannelMessageWithSource,
        data: None,
    };
    http.interaction(interaction.application_id)
        .create_response(interaction_id, &interaction_token, &defer_response)
        .await?;

    let mut pseudo_mc = None;
    if let Some(InteractionData::ApplicationCommand(cmd_data)) = &interaction.data {
        for option in &cmd_data.options {
            if option.name == "pseudo" {
                if let CommandOptionValue::String(value) = &option.value {
                    pseudo_mc = Some(value.clone());
                }
            }
        }
    }

    let discord_id = interaction.author_id().unwrap().to_string();
    let display_name = pseudo_mc.clone().unwrap_or_else(|| "vous".to_string());
    
    let (embed, components) = build_page(&db, &discord_id, pseudo_mc.as_deref(), &display_name, 0).await?;

    let interaction_client = http.interaction(interaction.application_id);
    let mut req = interaction_client.update_response(&interaction_token);
    
    let embeds = [embed];
    req = req.embeds(Some(&embeds));
    
    if !components.is_empty() {
        req = req.components(Some(&components));
    }
    
    req.await?;

    Ok(())
}

pub async fn handle_button(interaction: Interaction, http: Arc<HttpClient>, db: PgPool, custom_id: &str) -> anyhow::Result<()> {
    let interaction_id = interaction.id;
    let interaction_token = interaction.token.clone();
    
    let defer_response = InteractionResponse {
        kind: InteractionResponseType::DeferredUpdateMessage,
        data: None,
    };
    http.interaction(interaction.application_id)
        .create_response(interaction_id, &interaction_token, &defer_response)
        .await?;

    // custom_id format: "cartes:page:discord_id:pseudo"
    let parts: Vec<&str> = custom_id.splitn(4, ':').collect();
    if parts.len() < 4 {
        return Ok(());
    }
    
    let page: usize = parts[1].parse().unwrap_or(0);
    let discord_id = parts[2];
    let pseudo_mc_raw = parts[3];
    let pseudo_mc = if pseudo_mc_raw.is_empty() { None } else { Some(pseudo_mc_raw) };
    let display_name = pseudo_mc.unwrap_or("vous");

    let (embed, components) = build_page(&db, discord_id, pseudo_mc, display_name, page).await?;

    let interaction_client = http.interaction(interaction.application_id);
    let mut req = interaction_client.update_response(&interaction_token);
    
    let embeds = [embed];
    req = req.embeds(Some(&embeds));
    
    if !components.is_empty() {
        req = req.components(Some(&components));
    }
    
    req.await?;

    Ok(())
}

async fn build_page(db: &PgPool, discord_id: &str, pseudo_mc: Option<&str>, display_name: &str, page: usize) -> anyhow::Result<(Embed, Vec<Component>)> {
    let mut cards: Vec<UserCard> = Vec::new();

    if let Some(pseudo) = pseudo_mc {
        let clean_pseudo = pseudo.trim();
        let records = sqlx::query_as::<_, UserCard>(
            r#"
            SELECT DISTINCT tc.id, tc.title, tc.rarity, tc.edition, tc."imageUrl", tc."renderedImageUrl", tc.proba
            FROM "UserCard" uc
            JOIN "TradingCard" tc ON uc."tradingCardId" = tc.id
            JOIN "User" u ON uc."userId" = u.id
            LEFT JOIN "Account" a ON a."userId" = u.id
            WHERE u."minecraftName" ILIKE $1 OR u.name ILIKE $1 OR a."providerAccountId" = $2
            "#
        )
        .bind(format!("%{}%", clean_pseudo))
        .bind(clean_pseudo)
        .fetch_all(db)
        .await?;
        cards.extend(records);
    } else {
        let records = sqlx::query_as::<_, UserCard>(
            r#"
            SELECT DISTINCT tc.id, tc.title, tc.rarity, tc.edition, tc."imageUrl", tc."renderedImageUrl", tc.proba
            FROM "UserCard" uc
            JOIN "TradingCard" tc ON uc."tradingCardId" = tc.id
            JOIN "User" u ON uc."userId" = u.id
            LEFT JOIN "Account" a ON a."userId" = u.id
            WHERE u."discordId" = $1 OR a."providerAccountId" = $1
            "#
        )
        .bind(discord_id)
        .fetch_all(db)
        .await?;
        cards.extend(records);
    }

    let get_rarity_weight = |rarity: &str| -> i32 {
        match rarity.to_uppercase().as_str() {
            "MYTHIC" => 1,
            "LEGENDARY" => 2,
            "EPIC" => 3,
            "RARE" => 4,
            "UNCOMMON" => 5,
            "COMMON" => 6,
            _ => 99,
        }
    };

    cards.sort_by(|a, b| {
        get_rarity_weight(&a.rarity)
            .cmp(&get_rarity_weight(&b.rarity))
            .then_with(|| a.proba.cmp(&b.proba))
    });

    if cards.is_empty() {
        let embed = EmbedBuilder::new()
            .title("🃏 Cartes Introuvables")
            .description(format!("Aucune carte trouvée pour **{}**.", display_name))
            .color(0xef4444)
            .build();
        return Ok((embed, vec![]));
    }

    let total = cards.len();
    let safe_page = page.min(total.saturating_sub(1));
    let card = &cards[safe_page];
    
    let edition = card.edition.as_deref().unwrap_or("Standard");
    let mut builder = EmbedBuilder::new()
        .title(format!("🎒 Inventaire de {} ({}/{})", display_name, safe_page + 1, total))
        .description(format!("**{}** ({})\nÉdition : `{}`\nProbabilité : `{}%`", card.title, card.rarity, edition, card.proba))
        .color(0x7a0aad);

    if let Some(img) = card.rendered_image_url.as_ref().or(card.image_url.as_ref()) {
        if img.starts_with("http") {
            if let Ok(src) = ImageSource::url(img.clone()) {
                builder = builder.image(src);
            }
        }
    }

    let embed = builder.build();

    let mut buttons = Vec::new();
    
    let pseudo_str = pseudo_mc.unwrap_or("");
    
    if safe_page > 0 {
        buttons.push(Component::Button(Button {
            id: None,
            custom_id: Some(format!("cartes:{}:{}:{}", safe_page - 1, discord_id, pseudo_str)),
            disabled: false,
            emoji: None,
            label: Some("◀ Précédent".to_string()),
            style: ButtonStyle::Primary,
            url: None,
            sku_id: None,
        }));
    }
    
    if safe_page < total - 1 {
        buttons.push(Component::Button(Button {
            id: None,
            custom_id: Some(format!("cartes:{}:{}:{}", safe_page + 1, discord_id, pseudo_str)),
            disabled: false,
            emoji: None,
            label: Some("Suivant ▶".to_string()),
            style: ButtonStyle::Primary,
            url: None,
            sku_id: None,
        }));
    }

    let components = if buttons.is_empty() {
        vec![]
    } else {
        vec![Component::ActionRow(ActionRow {
            id: None,
            components: buttons,
        })]
    };

    Ok((embed, components))
}

pub fn register() -> twilight_model::application::command::Command {
    CommandBuilder::new("cartes", "Affiche les cartes d'un joueur ou de votre inventaire", twilight_model::application::command::CommandType::ChatInput)
        .option(StringBuilder::new("pseudo", "Pseudo Minecraft ou laisser vide pour votre inventaire").required(false))
        .build()
}
