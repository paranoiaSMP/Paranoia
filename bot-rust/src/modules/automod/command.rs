use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::{
    application::interaction::{
        application_command::CommandOptionValue, Interaction, InteractionData,
    },
    channel::message::MessageFlags,
    guild::Permissions,
    http::interaction::{InteractionResponse, InteractionResponseType, InteractionResponseData},
};
use twilight_util::builder::{
    command::{CommandBuilder, StringBuilder},
    embed::{EmbedBuilder, EmbedFieldBuilder, EmbedFooterBuilder},
};

use super::toxicity::{classify_toxicity, TargetKind, ToxicityCategory};
use crate::utils::{COLOR_ERROR, COLOR_GOLD, COLOR_SUCCESS, FOOTER_TEXT};

pub fn format_unmasked_display(normalized_text: &str) -> String {
    if normalized_text.is_empty() {
        "*(vide)*".to_string()
    } else if normalized_text.chars().count() > 1000 {
        let truncated: String = normalized_text.chars().take(997).collect();
        format!("```\n{}...```", truncated)
    } else {
        format!("```\n{}\n```", normalized_text)
    }
}

pub fn register() -> twilight_model::application::command::Command {
    CommandBuilder::new(
        "test_message",
        "Diagnostiquer un message avec le moteur anti-toxicité (sans sanction)",
        twilight_model::application::command::CommandType::ChatInput,
    )
    .default_member_permissions(Permissions::MODERATE_MEMBERS)
    .option(StringBuilder::new("message", "Contenu du message à tester").required(true))
    .build()
}

pub async fn run(interaction: Interaction, http: Arc<HttpClient>) -> anyhow::Result<()> {
    let message_input = if let Some(InteractionData::ApplicationCommand(cmd_data)) = &interaction.data {
        cmd_data
            .options
            .iter()
            .find(|o| o.name == "message")
            .and_then(|o| match &o.value {
                CommandOptionValue::String(s) => Some(s.clone()),
                _ => None,
            })
            .unwrap_or_default()
    } else {
        String::new()
    };

    let verdict = classify_toxicity(&message_input, &[]);

    let (color, verdict_label) = match verdict.category {
        ToxicityCategory::Clean => (COLOR_SUCCESS, "✅ Propre (Clean)"),
        ToxicityCategory::FriendlyBanter => (COLOR_SUCCESS, "🤝 Taquinerie amicale (FriendlyBanter)"),
        ToxicityCategory::GamingFrustration => (COLOR_GOLD, "🎮 Frustration de jeu (GamingFrustration)"),
        ToxicityCategory::Harassment => (COLOR_ERROR, "🚨 Harcèlement / Attaque ciblée (Harassment)"),
        ToxicityCategory::SevereToxicity => (COLOR_ERROR, "⛔ Toxicité sévère / Propos haineux (SevereToxicity)"),
    };

    let target_label = match verdict.target {
        TargetKind::None => "Aucune".to_string(),
        TargetKind::GameObject => "Objet de jeu / Mobs / Environnement".to_string(),
        TargetKind::SecondPersonPronoun => "Deuxième personne (tu / toi / t'es / vous)".to_string(),
        TargetKind::ExplicitUserMention => "Mention explicite d'utilisateur".to_string(),
        TargetKind::ReplyTarget => "Cible de réponse au message".to_string(),
    };

    let detected_words_str = if verdict.detected_words.is_empty() {
        "Aucun".to_string()
    } else {
        verdict.detected_words.join(", ")
    };

    let score_str = format!("{:.2} / 1.00 (Toxique: {})", verdict.score, if verdict.is_toxic { "Oui" } else { "Non" });

    let unmasked_display = format_unmasked_display(&verdict.normalized_text);

    let embed = EmbedBuilder::new()
        .description(format!("## {} | Diagnostic Anti-Toxicité & Anti-Bypass", crate::utils::emoji::TITLE))
        .color(color)
        .field(EmbedFieldBuilder::new("Verdict", verdict_label).inline())
        .field(EmbedFieldBuilder::new("Score", score_str).inline())
        .field(EmbedFieldBuilder::new("Cible Détectée", target_label).inline())
        .field(EmbedFieldBuilder::new("Texte Démasqué", unmasked_display))
        .field(EmbedFieldBuilder::new("Mots & Motifs Détectés", detected_words_str))
        .footer(EmbedFooterBuilder::new(FOOTER_TEXT))
        .build();

    let resp = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData {
            embeds: Some(vec![embed]),
            flags: Some(MessageFlags::EPHEMERAL),
            ..Default::default()
        }),
    };

    http.interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &resp)
        .await?;

    Ok(())
}
