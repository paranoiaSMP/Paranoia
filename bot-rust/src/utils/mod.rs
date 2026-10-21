use chrono::Duration;
use twilight_model::application::interaction::Interaction;
use twilight_model::id::{marker::UserMarker, Id};

pub const COLOR_SUCCESS: u32 = 0x22c55e;
pub const COLOR_ERROR: u32 = 0xef4444;
pub const COLOR_INFO: u32 = 0x3b82f6;
pub const COLOR_PURPLE: u32 = 0xa855f7;
pub const COLOR_GOLD: u32 = 0xfbbf24;
pub const FOOTER_TEXT: &str = "Paranoia Studio";

/// Emojis du serveur Discord hébergés sur Paranoia Studio DEV (visibles partout avec les perms externes).
pub mod emoji {
    pub const TITLE: &str = "<:am_title:1562454385311879240>";
    pub const AUTHOR: &str = "<:am_author:1562454392857428081>";
    pub const MESSAGE: &str = "<:am_message:1562454400935526450>";
    pub const SANCTION: &str = "<:am_sanction:1562454409563214004>";
    pub const TIME: &str = "<:am_time:1562454415708000397>";
    pub const OK: &str = "<:em_ok:1562454422871744585>";
    pub const OFF: &str = "<:em_off:1562454430887055463>";
    pub const STATS: &str = "<:em_stats:1562454437400944730>";
    pub const SETTINGS: &str = "<:em_settings:1562454444065562725>";
    pub const ECONOMY: &str = "<:em_economy:1562454451346743337>";
    pub const TIKTOK: &str = "<:em_tiktok:1562454458653483098>";
    pub const SUPPORT: &str = "<:em_support:1562454465481539645>";
    pub const STAFF: &str = "<:em_staff:1562454471915872278>";
    pub const UTILS: &str = "<:em_utils:1562454478584676382>";
    pub const PROMOTE: &str = "<:em_promote:1562454485622857768>";
    pub const DEMOTE: &str = "<:em_demote:1562454492534800384>";
    pub const CHANNEL: &str = "#️⃣";
}

pub fn rarity_weight(rarity: &str) -> i32 {
    match rarity.to_uppercase().as_str() {
        "MYTHIC" | "MYTHIQUE" => 5,
        "LEGENDARY" | "LEGENDAIRE" => 4,
        "EPIC" | "EPIQUE" => 3,
        "RARE" => 2,
        "UNCOMMON" | "PEU_COMMUNE" => 1,
        _ => 0,
    }
}

pub fn rarity_color(rarity: &str) -> u32 {
    match rarity.to_uppercase().as_str() {
        "MYTHIC" | "MYTHIQUE" => 0xff00ff,
        "LEGENDARY" | "LEGENDAIRE" => 0xffaa00,
        "EPIC" | "EPIQUE" => 0x9333ea,
        "RARE" => 0x3b82f6,
        "UNCOMMON" | "PEU_COMMUNE" => 0x22c55e,
        _ => 0x9ca3af,
    }
}

pub fn parse_duration(s: &str) -> Option<Duration> {
    let s = s.trim().to_lowercase();
    if s.is_empty() {
        return None;
    }

    let (num_part, unit) = s.split_at(s.len().saturating_sub(1));
    let num: i64 = num_part.parse().ok()?;

    match unit {
        "s" => Some(Duration::seconds(num)),
        "m" => Some(Duration::minutes(num)),
        "h" => Some(Duration::hours(num)),
        "d" => Some(Duration::days(num)),
        "w" => Some(Duration::weeks(num)),
        _ => {
            let full_num: i64 = s.parse().ok()?;
            Some(Duration::minutes(full_num))
        }
    }
}

#[allow(dead_code)]
pub fn get_interaction_user_id(interaction: &Interaction) -> Option<Id<UserMarker>> {
    interaction.author_id()
}

pub fn get_interaction_user_name(interaction: &Interaction) -> String {
    if let Some(member) = &interaction.member {
        if let Some(nick) = &member.nick {
            return nick.clone();
        }
        if let Some(user) = &member.user {
            return user.global_name.clone().unwrap_or_else(|| user.name.clone());
        }
    }
    if let Some(user) = &interaction.user {
        return user.global_name.clone().unwrap_or_else(|| user.name.clone());
    }
    "Utilisateur".to_string()
}

pub fn extract_modal_inputs(
    components: &[twilight_model::application::interaction::modal::ModalInteractionComponent],
) -> Vec<(String, String)> {
    let mut inputs = Vec::new();
    for comp in components {
        match comp {
            twilight_model::application::interaction::modal::ModalInteractionComponent::ActionRow(row) => {
                for sub in &row.components {
                    if let twilight_model::application::interaction::modal::ModalInteractionComponent::TextInput(input) = sub {
                        inputs.push((input.custom_id.clone(), input.value.clone()));
                    }
                }
            }
            twilight_model::application::interaction::modal::ModalInteractionComponent::TextInput(input) => {
                inputs.push((input.custom_id.clone(), input.value.clone()));
            }
            _ => {}
        }
    }
    inputs
}

/// `<:nom:id>` -> (nom, id) pour l'emoji d'un bouton.
pub fn emoji_parts(e: &str) -> Option<(&str, u64)> {
    let (name, id) = e.trim_matches(|c| c == '<' || c == '>').strip_prefix(':')?.split_once(':')?;
    Some((name, id.parse().ok()?))
}

