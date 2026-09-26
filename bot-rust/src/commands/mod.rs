pub mod cartes;

pub fn get_commands() -> Vec<twilight_model::application::command::Command> {
    vec![
        cartes::register(),
    ]
}
