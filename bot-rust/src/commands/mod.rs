pub mod cartes;
pub mod creators;
pub mod events;
pub mod flex;
pub mod moderation;
pub mod notifications;
pub mod pc;
pub mod profile;
pub mod quests;
pub mod tickets;
pub mod tiktok;

pub fn get_commands() -> Vec<twilight_model::application::command::Command> {
    vec![
        cartes::register(),
        pc::register(),
        flex::register(),
        profile::register(),
        creators::register(),
        notifications::register(),
        events::register(),
        quests::register(),
        moderation::register_ban(),
        moderation::register_mute(),
        moderation::register_kick(),
        moderation::register_promote(),
        moderation::register_demote(),
        tickets::register(),
        tiktok::register(),
    ]
}
