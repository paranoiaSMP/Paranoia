use serde::Serialize;
use serde_json::Value;
use sqlx::{postgres::PgListener, PgPool, Row};
use std::collections::{HashMap, HashSet};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, OnceLock, RwLock};
use twilight_http::Client as HttpClient;
use twilight_model::application::command::Command;
use twilight_model::application::interaction::Interaction;
use twilight_model::channel::message::MessageFlags;
use twilight_model::guild::Permissions;
use twilight_model::http::interaction::{InteractionResponse, InteractionResponseData, InteractionResponseType};
use twilight_model::id::{marker::{ApplicationMarker, RoleMarker}, Id};

use crate::commands;

pub mod activity;
pub mod applications;
pub mod automod;
pub mod backup;
pub mod conference;
pub mod drops;
pub mod embed;
pub mod message_log;
pub mod quiz;
pub mod giveaway;
pub mod tribunal;
pub mod invites;
pub mod welcome_image;
pub mod security;
pub mod honeypot;
pub mod gatekeeper;
pub mod staff;
pub mod wallet;

static DECLARED: AtomicBool = AtomicBool::new(false);

pub const NOTIFY_CHANNEL: &str = "bot_modules";

#[derive(Serialize, Clone, Copy)]
#[serde(rename_all = "lowercase")]
#[allow(dead_code)]
pub enum SettingKind {
    Text,
    Textarea,
    Channel,
    Role,
    Roles,
    Color,
    Url,
    Embed,
    Number,
    Choice,
}

#[derive(Serialize, Clone, Copy)]
pub struct Setting {
    pub key: &'static str,
    pub label: &'static str,
    pub kind: SettingKind,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub help: Option<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<&'static str>,
    #[serde(skip_serializing_if = "<[_]>::is_empty")]
    pub options: &'static [(&'static str, &'static str)],
}

const fn field(key: &'static str, label: &'static str, kind: SettingKind, help: Option<&'static str>, default: Option<&'static str>) -> Setting {
    Setting { key, label, kind, help, default, options: &[] }
}

pub struct ModuleDef {
    pub id: &'static str,
    pub name: &'static str,
    pub description: &'static str,
    pub category: &'static str,
    pub default_enabled: bool,
    pub legacy_column: Option<&'static str>,
    pub commands: fn() -> Vec<Command>,
    pub components: &'static [&'static str],
    pub settings: &'static [Setting],
}

fn none() -> Vec<Command> {
    Vec::new()
}

pub fn registry() -> &'static [ModuleDef] {
    static REGISTRY: OnceLock<Vec<ModuleDef>> = OnceLock::new();
    REGISTRY.get_or_init(|| {
        vec![
            ModuleDef {
                id: "tickets",
                name: "Tickets",
                description: "Ouverture de tickets par boutons, salons privés, synchronisation avec la page Support du site.",
                category: "Communauté",
                default_enabled: true,
                legacy_column: Some("moduleTickets"),
                commands: || vec![commands::tickets::register()],
                components: &["ticket_open:", "btn_open_", "ticket_claim", "btn_claim_general_ticket", "ticket_close", "btn_close_general_ticket", "modal_ticket:", "ticket_mods"],
                settings: &[],
            },
            ModuleDef {
                id: "moderation",
                name: "Modération",
                description: "Ban, mute, kick, avertissements, nettoyage de salon, annonces de promotion, appels de sanctions.",
                category: "Modération",
                default_enabled: true,
                legacy_column: None,
                commands: || {
                    vec![
                        commands::moderation::register_ban(),
                        commands::moderation::register_mute(),
                        commands::moderation::register_kick(),
                        commands::moderation::register_promote(),
                        commands::moderation::register_demote(),
                        commands::moderation::register_warn(),
                        commands::moderation::register_warnings(),
                        commands::moderation::register_clear(),
                        commands::moderation::register_unban(),
                        commands::moderation::register_unmute(),
                        commands::moderation::register_cases(),
                        commands::moderation::register_slowmode(),
                    ]
                },
                components: &["appeal_open:", "appeal_staff_accept:", "appeal_staff_reject:", "modal_appeal:"],
                settings: {
                    const S: &[Setting] = &[
                    field("perm_ban", "Rôles autorisés : /ban", SettingKind::Roles, Some("Vide : permission Discord « Bannir des membres » requise. Les administrateurs passent toujours. Identifiants séparés par une virgule."), None),
                    field("perm_unban", "Rôles autorisés : /unban", SettingKind::Roles, Some("Vide : permission Discord « Bannir des membres » requise. Les administrateurs passent toujours. Identifiants séparés par une virgule."), None),
                    field("perm_mute", "Rôles autorisés : /mute", SettingKind::Roles, Some("Vide : permission Discord « Exclure temporairement des membres » requise. Les administrateurs passent toujours. Identifiants séparés par une virgule."), None),
                    field("perm_unmute", "Rôles autorisés : /unmute", SettingKind::Roles, Some("Vide : permission Discord « Exclure temporairement des membres » requise. Les administrateurs passent toujours. Identifiants séparés par une virgule."), None),
                    field("perm_kick", "Rôles autorisés : /kick", SettingKind::Roles, Some("Vide : permission Discord « Expulser des membres » requise. Les administrateurs passent toujours. Identifiants séparés par une virgule."), None),
                    field("perm_warn", "Rôles autorisés : /warn", SettingKind::Roles, Some("Vide : permission Discord « Exclure temporairement des membres » requise. Les administrateurs passent toujours. Identifiants séparés par une virgule."), None),
                    field("perm_warnings", "Rôles autorisés : /warnings", SettingKind::Roles, Some("Vide : permission Discord « Exclure temporairement des membres » requise. Les administrateurs passent toujours. Identifiants séparés par une virgule."), None),
                    field("perm_cases", "Rôles autorisés : /cases", SettingKind::Roles, Some("Vide : permission Discord « Exclure temporairement des membres » requise. Les administrateurs passent toujours. Identifiants séparés par une virgule."), None),
                    field("perm_clear", "Rôles autorisés : /clear", SettingKind::Roles, Some("Vide : permission Discord « Gérer les messages » requise. Les administrateurs passent toujours. Identifiants séparés par une virgule."), None),
                    field("perm_promote", "Rôles autorisés : /promote", SettingKind::Roles, Some("Vide : permission Discord « Administrateur » requise. Les administrateurs passent toujours. Identifiants séparés par une virgule."), None),
                    field("perm_demote", "Rôles autorisés : /demote", SettingKind::Roles, Some("Vide : permission Discord « Administrateur » requise. Les administrateurs passent toujours. Identifiants séparés par une virgule."), None),
                    ];
                    S
                },
            },
            ModuleDef {
                id: "automod",
                name: "Modération automatique",
                description: "Protection anti-toxicité contextuelle, anti-bypass et diagnostic.",
                category: "Modération",
                default_enabled: false,
                legacy_column: Some("moduleAutoMod"),
                commands: || vec![crate::modules::automod::command::register()],
                components: &[],
                settings: &[],
            },
            ModuleDef {
                id: "audit",
                name: "Journal d'audit",
                description: "Messages modifiés (avant et après) ou supprimés (contenu, auteur, qui l'a supprimé), arrivées, départs et mouvements vocaux, dans le salon de logs.",
                category: "Modération",
                default_enabled: false,
                legacy_column: Some("moduleAuditLogs"),
                commands: none,
                components: &[],
                settings: {
                    const S: &[Setting] = &[
                        field("logChannelId", "Salon des logs", SettingKind::Channel, Some("Vide : le salon de logs par défaut du bot."), None),
                        field("bypassRoleIds", "Rôles ignorés", SettingKind::Roles, Some("Les messages des membres qui ont un de ces rôles ne sont pas journalisés. Identifiants séparés par une virgule."), None),
                    ];
                    S
                },
            },
            ModuleDef {
                id: "honeypot",
                name: "Honeypot",
                description: "Salon piège : tout membre non-staff qui y écrit est supprimé puis banni ou expulsé (comptes piratés, bots de spam).",
                category: "Modération",
                default_enabled: false,
                legacy_column: None,
                commands: none,
                components: &[],
                settings: {
                    const S: &[Setting] = &[
                        field("channelId", "Salon piège", SettingKind::Channel, Some("Un salon visible de tous où personne ne doit écrire, avec un message qui le dit."), None),
                        Setting {
                            key: "action",
                            label: "Sanction",
                            kind: SettingKind::Choice,
                            help: None,
                            default: Some("ban"),
                            options: &[("ban", "Bannir (efface 1 h de messages)"), ("kick", "Expulser")],
                        },
                        field("logChannelId", "Salon des alertes", SettingKind::Channel, Some("Vide : salon de logs du bot."), None),
                    ];
                    S
                },
            },
            ModuleDef {
                id: "security",
                name: "Anti-raid",
                description: "Bloque les comptes Discord trop récents et verrouille le serveur quand trop de membres arrivent d'un coup.",
                category: "Modération",
                default_enabled: false,
                legacy_column: Some("moduleSecurity"),
                commands: || vec![crate::modules::security::register()],
                components: &[],
                settings: {
                    const S: &[Setting] = &[
                        field("logChannelId", "Salon des alertes", SettingKind::Channel, Some("Vide : salon de logs du bot."), None),
                        field("minAccountAgeDays", "Âge minimum du compte Discord (jours)", SettingKind::Number, Some("0 pour désactiver."), Some("7")),
                        Setting {
                            key: "youngAccountAction",
                            label: "Compte trop récent",
                            kind: SettingKind::Choice,
                            help: None,
                            default: Some("kick"),
                            options: &[("kick", "Prévenir puis expulser"), ("alert", "Alerter le staff seulement")],
                        },
                        field("raidJoins", "Arrivées qui déclenchent le verrouillage", SettingKind::Number, None, Some("10")),
                        field("raidWindowSeconds", "Sur combien de secondes", SettingKind::Number, None, Some("5")),
                        field("lockdownMinutes", "Durée du verrouillage (minutes)", SettingKind::Number, Some("Fin plus tôt : /verrouillage off"), Some("10")),
                        Setting {
                            key: "kickRaidWave",
                            label: "Expulser la vague de raid",
                            kind: SettingKind::Choice,
                            help: Some("Expulse automatiquement tous les comptes ayant rejoint pendant le pic de raid."),
                            default: Some("yes"),
                            options: &[("yes", "Oui"), ("no", "Non")],
                        },
                        Setting {
                            key: "restrictChannels",
                            label: "Restreindre les salons",
                            kind: SettingKind::Choice,
                            help: Some("Bloque les permissions d'écriture et de parole pour @everyone dans tous les salons."),
                            default: Some("yes"),
                            options: &[("yes", "Oui"), ("no", "Non")],
                        },
                    ];
                    S
                },
            },
            ModuleDef {
                id: "gatekeeper",
                name: "Vérification Anti-Bot",
                description: "Vérifie automatiquement les nouveaux membres avec une image Captcha classique dans un salon dédié.",
                category: "Modération",
                default_enabled: true,
                legacy_column: None,
                commands: || vec![gatekeeper::register_config(), gatekeeper::register_test(), gatekeeper::register_rules()],
                components: &[gatekeeper::PREFIX],
                settings: {
                    const S: &[Setting] = &[
                        field("channelId", "Salon de vérification", SettingKind::Channel, Some("Salon où envoyer le captcha aux nouveaux arrivants."), None),
                        field("verifiedRoleId", "Rôle membre attribué", SettingKind::Role, Some("Rôle donné au membre une fois le captcha validé."), None),
                        field("unverifiedRoleId", "Rôle « Pas vérifié »", SettingKind::Role, Some("Créé par /config_verification : donné à l'arrivée, retiré après le captcha."), None),
                    ];
                    S
                },
            },
            ModuleDef {
                id: "giveaway",
                name: "Giveaways",
                description: "/giveaway : tirage au sort avec bouton « Participer », fin automatique et annonce des gagnants.",
                category: "Communauté",
                default_enabled: true,
                legacy_column: None,
                commands: || vec![giveaway::register()],
                components: &[giveaway::PREFIX],
                settings: {
                    const S: &[Setting] = &[field("pingRoleId", "Rôle à mentionner", SettingKind::Role, Some("Prévenu à chaque nouveau giveaway (ex. le rôle Giveaways). Vide : aucune mention."), None)];
                    S
                },
            },
            ModuleDef {
                id: "tribunal",
                name: "Tribunal",
                description: "/tribunal : procès communautaire humoristique, vote Coupable / Innocent, sentence automatique et immunité de 24 h.",
                category: "Communauté",
                default_enabled: true,
                legacy_column: None,
                commands: || vec![tribunal::register()],
                components: &[tribunal::VOTE, tribunal::EXTEND],
                settings: {
                    const S: &[Setting] = &[
                        field("voteSeconds", "Durée du vote (secondes)", SettingKind::Number, Some("Chaque « Prolonger » ajoute une minute, deux fois maximum."), Some("30")),
                        field("muteMinutes", "Durée de l'exclusion (minutes)", SettingKind::Number, Some("Peine « Exclusion temporaire »."), Some("1")),
                        field("fine", "Montant de l'amende (ParaCoins)", SettingKind::Number, Some("Peine « Amende ». Le solde ne passe jamais sous 0."), Some("500")),
                    ];
                    S
                },
            },
            ModuleDef {
                id: "welcome",
                name: "Bienvenue",
                description: "Message d'accueil envoyé quand un membre rejoint le serveur Discord.",
                category: "Communauté",
                default_enabled: false,
                legacy_column: Some("moduleWelcome"),
                commands: none,
                components: &[],
                settings: {
                    const S: &[Setting] = &[
                        field("channelId", "Salon d'accueil", SettingKind::Channel, None, None),
                        field(
                            "message",
                            "Message de bienvenue",
                            SettingKind::Embed,
                            Some("{user} : mention · {username} : pseudo · {avatar} : avatar · {server} : nom du serveur · {memberCount} : nombre de membres"),
                            Some(r##"{"content":"{user}","description":"**Un nouveau membre !**\n\nBienvenue {user} sur **{server}**, tu es notre **{memberCount}e** membre.","color":"#2563eb"}"##),
                        ),
                        Setting {
                            key: "imageEnabled",
                            label: "Image de bienvenue",
                            kind: SettingKind::Choice,
                            help: Some("Joint une carte « BIENVENUE » avec l'avatar du membre, sous le message."),
                            default: Some("yes"),
                            options: &[("yes", "Oui"), ("no", "Non")],
                        },
                        field("imageTitle", "Image : titre", SettingKind::Text, None, Some("Bienvenue")),
                        field("imageSubtitle", "Image : sous-titre", SettingKind::Text, Some("Mêmes variables que le message : {username} {server} {memberCount}"), Some("Tu es notre {memberCount}e membre")),
                        field("imageColorA", "Image : couleur de départ du dégradé", SettingKind::Color, None, Some("#1e3a8a")),
                        field("imageColorB", "Image : couleur d'arrivée du dégradé", SettingKind::Color, None, Some("#3b82f6")),
                        field("imageBackground", "Image : fond personnalisé (lien https)", SettingKind::Url, Some("Remplace le dégradé. Format paysage conseillé (1000×400)."), None),
                    ];
                    S
                },
            },
            ModuleDef {
                id: "temp_voice",
                name: "Salons vocaux temporaires",
                description: "Rejoindre le salon « créer » ouvre un vocal personnel, supprimé quand il se vide.",
                category: "Vocal",
                default_enabled: false,
                legacy_column: Some("moduleTempVoice"),
                commands: none,
                components: &[],
                settings: &[],
            },
            ModuleDef {
                id: "vocal_roles",
                name: "Rôles de salon vocal",
                description: "Donne un rôle portant le nom du salon vocal rejoint, et le supprime avec le salon.",
                category: "Vocal",
                default_enabled: true,
                legacy_column: None,
                commands: none,
                components: &[],
                settings: &[],
            },
            ModuleDef {
                id: "conference",
                name: "Conférences",
                description: "Conférence dans un salon vocal : tout le monde écoute, on lève la main ou on pose une question écrite, l'animateur donne la parole depuis une régie privée. Bilan à la fin.",
                category: "Vocal",
                default_enabled: true,
                legacy_column: None,
                commands: || vec![conference::register()],
                components: &[conference::PREFIX, "hand_raise:", "hand_accept:", "hand_reject:", "hand_revoke:"],
                settings: {
                    const S: &[Setting] = &[
                        field("announceChannelId", "Salon d'annonce", SettingKind::Channel, Some("Où l'annonce de la conférence est publiée. Vide : le salon où la commande est lancée."), None),
                        field("pingRoleId", "Rôle à mentionner", SettingKind::Role, Some("Mentionné dans l'annonce, par exemple @Conférences. Facultatif."), None),
                        field("cohostRoleId", "Rôle co-animateur", SettingKind::Role, Some("Voit la régie, peut parler et donner la parole."), None),
                        field("speakSeconds", "Temps de parole (secondes)", SettingKind::Number, Some("Après ce délai, l'intervenant repasse en écoute. 0 : sans limite."), Some("120")),
                        field("accentColor", "Couleur des cartes", SettingKind::Color, None, Some("#7c3aed")),
                    ];
                    S
                },
            },
            ModuleDef {
                id: "economy",
                name: "ParaCoins",
                description: "Solde de ParaCoins et récompense quotidienne.",
                category: "Jeu",
                default_enabled: true,
                legacy_column: Some("moduleEconomy"),
                commands: || vec![commands::economy::register_daily(), commands::pc::register()],
                components: &[],
                settings: &[],
            },
            ModuleDef {
                id: "tcg",
                name: "Cartes (TCG)",
                description: "Collection de cartes, ouverture de pack et carte la plus rare.",
                category: "Jeu",
                default_enabled: true,
                legacy_column: Some("moduleTcg"),
                commands: || vec![commands::cartes::register(), commands::tcg::register_pack(), commands::flex::register()],
                components: &["cartes:"],
                settings: &[],
            },
            ModuleDef {
                id: "xp",
                name: "Niveaux",
                description: "XP en écrivant et en vocal (comptes liés au site), niveaux, /rang, annonce de montée de niveau et rôles de récompense.",
                category: "Jeu",
                default_enabled: false,
                legacy_column: Some("moduleXp"),
                commands: || vec![crate::commands::levels::register_rank(), crate::commands::levels::register_manage()],
                components: &[],
                settings: {
                    const S: &[Setting] = &[
                        field("cooldownSeconds", "Délai entre deux gains d'XP (secondes)", SettingKind::Number, Some("Empêche de monter en spammant."), Some("60")),
                        field("voiceXpPerMinute", "XP par minute en vocal", SettingKind::Number, Some("À deux minimum dans le salon, sans être sourd. 0 pour désactiver."), Some("3")),
                        field("levelUpChannelId", "Salon des montées de niveau", SettingKind::Channel, Some("Vide : le salon où le membre a écrit."), None),
                        field(
                            "levelUpMessage",
                            "Message de montée de niveau",
                            SettingKind::Embed,
                            Some("{user} : mention · {username} : pseudo · {avatar} : avatar · {level} : nouveau niveau"),
                            Some(r##"{"content":"{user}","title":"Niveau {level} !","description":"Bravo {username}, tu passes niveau **{level}**.","color":"#7c3aed","thumbnail":"{avatar}"}"##),
                        ),
                        Setting {
                            key: "cardEnabled",
                            label: "Carte d'image (/rang et montée de niveau)",
                            kind: SettingKind::Choice,
                            help: Some("Joint une carte avec l'avatar, le niveau et la barre d'XP."),
                            default: Some("yes"),
                            options: &[("yes", "Oui"), ("no", "Non")],
                        },
                        field("cardColorA", "Carte : couleur de départ du dégradé", SettingKind::Color, None, Some("#4c1d95")),
                        field("cardColorB", "Carte : couleur d'arrivée du dégradé", SettingKind::Color, None, Some("#7c3aed")),
                        field("cardBackground", "Carte : fond personnalisé (lien https)", SettingKind::Url, Some("Remplace le dégradé. Format paysage conseillé (1000×300)."), None),
                        field("roleRewards", "Rôles de récompense", SettingKind::Textarea, Some("Une ligne par palier : niveau=identifiant du rôle (ex. 10=123456789012345678)"), None),
                    ];
                    S
                },
            },
            ModuleDef {
                id: "drops",
                name: "Drops",
                description: "De temps en temps, un paquet de ParaCoins apparaît dans le chat : le premier qui clique le gagne.",
                category: "Jeu",
                default_enabled: false,
                legacy_column: None,
                commands: none,
                components: &[drops::PREFIX],
                settings: {
                    const S: &[Setting] = &[
                        field("channels", "Salons des drops", SettingKind::Textarea, Some("Un identifiant de salon par ligne."), None),
                        field("minMessages", "Messages minimum entre deux drops", SettingKind::Number, None, Some("40")),
                        field("maxMessages", "Messages maximum entre deux drops", SettingKind::Number, None, Some("120")),
                        field("minCoins", "ParaCoins minimum", SettingKind::Number, None, Some("20")),
                        field("maxCoins", "ParaCoins maximum", SettingKind::Number, None, Some("100")),
                        field("expireSeconds", "Disparaît après (secondes)", SettingKind::Number, None, Some("120")),
                        field(
                            "message",
                            "Message du drop",
                            SettingKind::Embed,
                            Some("{amount} : nombre de ParaCoins"),
                            Some(r##"{"title":"Un drop est tombé !","description":"**{amount} ParaCoins** à prendre. Le premier qui clique les gagne.","color":"#7c3aed"}"##),
                        ),
                    ];
                    S
                },
            },
            ModuleDef {
                id: "quiz",
                name: "Quiz",
                description: "Questions de culture générale (QuizzAPI) ou les tiennes : la première bonne réponse dans le salon gagne des ParaCoins, puis le salon se verrouille jusqu'à la question suivante.",
                category: "Jeu",
                default_enabled: false,
                legacy_column: None,
                commands: || vec![quiz::register()],
                components: &[],
                settings: {
                    const S: &[Setting] = &[
                        field("channelId", "Salon du quiz", SettingKind::Channel, None, None),
                        Setting {
                            key: "source",
                            label: "Source des questions",
                            kind: SettingKind::Choice,
                            help: Some("QuizzAPI : questions en français. Si l'API ne répond pas, tes questions prennent le relais."),
                            default: Some("mix"),
                            options: &[("mix", "Les deux"), ("api", "QuizzAPI (culture générale)"), ("custom", "Mes questions")],
                        },
                        Setting {
                            key: "apiCategory",
                            label: "Catégorie QuizzAPI",
                            kind: SettingKind::Choice,
                            help: None,
                            default: Some("all"),
                            options: quiz::CATEGORIES,
                        },
                        Setting {
                            key: "apiDifficulty",
                            label: "Difficulté QuizzAPI",
                            kind: SettingKind::Choice,
                            help: None,
                            default: Some("all"),
                            options: &[("all", "Toutes"), ("facile", "Facile"), ("normal", "Normal"), ("difficile", "Difficile")],
                        },
                        Setting {
                            key: "lockChannel",
                            label: "Verrouiller le salon entre deux questions",
                            kind: SettingKind::Choice,
                            help: Some("Personne ne peut écrire après une bonne réponse ou la fin du temps, jusqu'à la question suivante. Le staff garde l'accès."),
                            default: Some("yes"),
                            options: &[("yes", "Oui"), ("no", "Non")],
                        },
                        field("intervalMinutes", "Une question toutes les (minutes)", SettingKind::Number, Some("0 : seulement avec /quiz. 720 = toutes les 12 h."), Some("720")),
                        field("answerSeconds", "Temps pour répondre (secondes)", SettingKind::Number, None, Some("60")),
                        field("reward", "ParaCoins gagnés", SettingKind::Number, None, Some("50")),
                        field("questions", "Questions", SettingKind::Textarea, Some("Une par ligne : question = réponse | autre réponse acceptée. Majuscules, accents et ponctuation sont ignorés, et la réponse compte aussi dans une phrase."), Some(quiz::DEFAULT_QUESTIONS)),
                        field(
                            "message",
                            "Message de la question",
                            SettingKind::Embed,
                            Some("{question} · {reward} : ParaCoins à gagner · {seconds} : temps pour répondre · {icon_quiz} {icon_reward} {icon_time} : emojis du bot"),
                            Some(r###"{"description":"## {icon_quiz} | Quiz\n\n**{question}**\n\n{icon_reward} | **Récompense :** {reward} ParaCoins pour la première bonne réponse\n\n{icon_time} | **Temps :** {seconds} secondes","color":"#7c3aed"}"###),
                        ),
                    ];
                    S
                },
            },
            ModuleDef {
                id: "leaderboards",
                name: "Classements",
                description: "/classement : top 10 des niveaux, des ParaCoins, des collections de cartes ou des gains au casino.",
                category: "Jeu",
                default_enabled: true,
                legacy_column: None,
                commands: || vec![crate::commands::levels::register_leaderboard()],
                components: &[],
                settings: &[],
            },
            ModuleDef {
                id: "profile",
                name: "Profil",
                description: "Commande /profile : compte du site, cartes et statistiques d'un membre.",
                category: "Jeu",
                default_enabled: true,
                legacy_column: None,
                commands: || vec![commands::profile::register()],
                components: &[],
                settings: &[],
            },
            ModuleDef {
                id: "quests",
                name: "Quêtes du jour",
                description: "Trois objectifs par jour (messages, vocal, booster ouvert), récompensés en ParaCoins. /quetes pour voir et réclamer.",
                category: "Jeu",
                default_enabled: false,
                legacy_column: None,
                commands: || vec![commands::quests::register()],
                components: &[commands::quests::PREFIX],
                settings: {
                    const S: &[Setting] = &[
                        field("messagesTarget", "Messages à envoyer", SettingKind::Number, None, Some("20")),
                        field("messagesReward", "Récompense (messages)", SettingKind::Number, None, Some("50")),
                        field("voiceTarget", "Minutes de vocal", SettingKind::Number, Some("Comptées à deux minimum dans le salon, sans être sourd."), Some("30")),
                        field("voiceReward", "Récompense (vocal)", SettingKind::Number, None, Some("50")),
                        field("boosterReward", "Récompense (booster ouvert sur le site)", SettingKind::Number, None, Some("75")),
                    ];
                    S
                },
            },
            ModuleDef {
                id: "events",
                name: "Événements",
                description: "Annonce d'événement avec inscription et désinscription par boutons.",
                category: "Communauté",
                default_enabled: true,
                legacy_column: None,
                commands: || vec![commands::events::register()],
                components: &["event_join", "event_leave"],
                settings: &[],
            },
            ModuleDef {
                id: "staff_notes",
                name: "Notes staff",
                description: "/note : notes privées du staff sur un membre (ajouter, voir, supprimer). Invisibles pour les membres.",
                category: "Staff",
                default_enabled: false,
                legacy_column: None,
                commands: || vec![staff::register_note()],
                components: &[],
                settings: &[],
            },
            ModuleDef {
                id: "mod_stats",
                name: "Statistiques de modération",
                description: "/statsmodo : nombre de sanctions et d'avertissements par membre du staff sur 7, 30 ou 90 jours.",
                category: "Staff",
                default_enabled: false,
                legacy_column: None,
                commands: || vec![staff::register_stats()],
                components: &[],
                settings: &[],
            },
            ModuleDef {
                id: "absences",
                name: "Absences du staff",
                description: "/absence : déclarer une absence, voir qui est absent. Annonce dans un salon et rôle « absent » pendant la période.",
                category: "Staff",
                default_enabled: false,
                legacy_column: None,
                commands: || vec![staff::register_absence()],
                components: &[],
                settings: {
                    const S: &[Setting] = &[
                        field("channelId", "Salon des absences", SettingKind::Channel, Some("Chaque absence déclarée y est annoncée."), None),
                        field("roleId", "Rôle « absent »", SettingKind::Role, Some("Donné pendant l'absence, retiré à la fin (vérifié toutes les heures)."), None),
                    ];
                    S
                },
            },
            ModuleDef {
                id: "applications",
                name: "Candidatures",
                description: "/candidature : formulaire pour rejoindre le staff. Le staff accepte ou refuse avec un bouton, le candidat reçoit la réponse en message privé.",
                category: "Staff",
                default_enabled: false,
                legacy_column: None,
                commands: || vec![applications::register(), applications::register_setup()],
                components: &[applications::OPEN, applications::MODAL, applications::ACCEPT, applications::REFUSE],
                settings: {
                    const S: &[Setting] = &[
                        field("reviewChannelId", "Salon d'examen", SettingKind::Channel, Some("Salon privé du staff où arrivent les candidatures."), None),
                        field("acceptRoleId", "Rôle donné si acceptée", SettingKind::Role, Some("Facultatif."), None),
                    ];
                    S
                },
            },
            ModuleDef {
                id: "backup",
                name: "Sauvegarde des rôles et salons",
                description: "/sauvegarde : enregistre les rôles, salons et permissions. La restauration recrée seulement ce qui manque, sans rien modifier ni supprimer.",
                category: "Staff",
                default_enabled: false,
                legacy_column: None,
                commands: || vec![backup::register()],
                components: &[backup::CONFIRM],
                settings: &[],
            },
            ModuleDef {
                id: "creators",
                name: "Vidéastes",
                description: "Présentation des vidéastes du studio avec un menu de sélection.",
                category: "Communauté",
                default_enabled: true,
                legacy_column: None,
                commands: || vec![commands::creators::register()],
                components: &["creators_select_menu"],
                settings: &[],
            },
            ModuleDef {
                id: "notifications",
                name: "Rôles de notification",
                description: "Boutons pour s'abonner ou se désabonner des rôles de notification.",
                category: "Communauté",
                default_enabled: true,
                legacy_column: None,
                commands: || vec![commands::notifications::register()],
                components: &["notif_toggle:"],
                settings: &[],
            },
            ModuleDef {
                id: "tiktok",
                name: "Alertes TikTok",
                description: "Surveille des comptes TikTok et annonce leurs lives dans un salon.",
                category: "Communauté",
                default_enabled: true,
                legacy_column: None,
                commands: || vec![commands::tiktok::register()],
                components: &[],
                settings: &[],
            },
        ]
    })
}

#[derive(Default)]
struct State {
    enabled: HashMap<String, bool>,
    config: HashMap<String, Value>,
}

fn state() -> &'static RwLock<State> {
    static STATE: OnceLock<RwLock<State>> = OnceLock::new();
    STATE.get_or_init(|| RwLock::new(State::default()))
}

fn def(id: &str) -> Option<&'static ModuleDef> {
    registry().iter().find(|m| m.id == id)
}

pub fn enabled(id: &str) -> bool {
    let st = state().read().unwrap();
    st.enabled.get(id).copied().unwrap_or_else(|| def(id).map(|d| d.default_enabled).unwrap_or(false))
}

pub fn setting(id: &str, key: &str) -> Option<String> {
    let st = state().read().unwrap();
    let from_db = st.config.get(id).and_then(|c| c.get(key)).and_then(|v| v.as_str()).map(str::to_string);
    from_db.filter(|v| !v.trim().is_empty()).or_else(|| {
        def(id)?.settings.iter().find(|s| s.key == key)?.default.map(str::to_string)
    })
}

pub fn setting_number(id: &str, key: &str, fallback: i64) -> i64 {
    setting(id, key).and_then(|v| v.trim().parse().ok()).unwrap_or(fallback)
}

pub fn setting_value(id: &str, key: &str) -> Option<Value> {
    let st = state().read().unwrap();
    let from_db = st.config.get(id).and_then(|c| c.get(key)).filter(|v| v.is_object()).cloned();
    from_db.or_else(|| {
        let raw = def(id)?.settings.iter().find(|s| s.key == key)?.default?;
        serde_json::from_str(raw).ok()
    })
}

pub fn update_module_config(id: &str, config: Value) {
    if let Ok(mut st) = state().write() {
        st.config.insert(id.to_string(), config);
    }
}

pub fn command_owner(name: &str) -> Option<&'static str> {
    static OWNERS: OnceLock<HashMap<String, &'static str>> = OnceLock::new();
    OWNERS
        .get_or_init(|| {
            let mut map = HashMap::new();
            for m in registry() {
                for c in (m.commands)() {
                    map.insert(c.name, m.id);
                }
            }
            map
        })
        .get(name)
        .copied()
}

pub fn component_owner(custom_id: &str) -> Option<&'static str> {
    registry()
        .iter()
        .find(|m| m.components.iter().any(|p| custom_id.starts_with(p)))
        .map(|m| m.id)
}

/// Commandes de modération réglables par rôle (réglage `perm_<commande>` du module « moderation »).
const GATED: &[(&str, Permissions)] = &[
    ("ban", Permissions::BAN_MEMBERS),
    ("unban", Permissions::BAN_MEMBERS),
    ("mute", Permissions::MODERATE_MEMBERS),
    ("unmute", Permissions::MODERATE_MEMBERS),
    ("kick", Permissions::KICK_MEMBERS),
    ("warn", Permissions::MODERATE_MEMBERS),
    ("warnings", Permissions::MODERATE_MEMBERS),
    ("cases", Permissions::MODERATE_MEMBERS),
    ("clear", Permissions::MANAGE_MESSAGES),
    ("promote", Permissions::ADMINISTRATOR),
    ("demote", Permissions::ADMINISTRATOR),
];

/// Rôle autorisé par réglage; sans réglage, la permission Discord d'origine est exigée (les commandes n'ont plus de filtre côté Discord).
/// shortcut: pas de hiérarchie entre rôles ni de refus sur membre de rang égal, à ajouter si le staff le demande.
pub fn command_allowed(interaction: &Interaction, command: &str) -> bool {
    let Some((_, required)) = GATED.iter().find(|(c, _)| *c == command) else { return true };
    let Some(member) = &interaction.member else { return false };
    let list = setting("moderation", &format!("perm_{command}"));
    allowed_by(member.permissions.unwrap_or_else(Permissions::empty), &member.roles, list.as_deref(), *required)
}

fn allowed_by(perms: Permissions, roles: &[Id<RoleMarker>], list: Option<&str>, required: Permissions) -> bool {
    if perms.contains(Permissions::ADMINISTRATOR) {
        return true;
    }
    match list {
        Some(list) => list.split(|c: char| c == ',' || c.is_whitespace()).filter_map(|r| r.parse::<u64>().ok()).any(|r| roles.iter().any(|m| m.get() == r)),
        None => perms.contains(required),
    }
}

#[cfg(test)]
mod perm_tests {
    use super::*;

    #[test]
    fn role_list_overrides_discord_perm() {
        let roles = [Id::new(5)];
        let (none, ban) = (Permissions::empty(), Permissions::BAN_MEMBERS);
        assert!(allowed_by(none, &roles, Some("1, 5"), ban));
        assert!(!allowed_by(ban, &roles, Some("1,2"), ban));
        assert!(allowed_by(ban, &[], None, ban));
        assert!(!allowed_by(none, &roles, None, ban));
        assert!(allowed_by(Permissions::ADMINISTRATOR, &[], Some("1"), ban));
    }
}

pub async fn reply_disabled(http: &HttpClient, interaction: &Interaction) {
    reply_notice(http, interaction, "Ce module est désactivé pour le moment.").await;
}

pub async fn reply_notice(http: &HttpClient, interaction: &Interaction, text: &str) {
    let response = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData {
            content: Some(text.to_string()),
            flags: Some(MessageFlags::EPHEMERAL),
            ..Default::default()
        }),
    };
    let _ = http
        .interaction(interaction.application_id)
        .create_response(interaction.id, &interaction.token, &response)
        .await;
}

pub async fn declare(db: &PgPool) -> anyhow::Result<()> {
    let legacy = sqlx::query(r#"SELECT * FROM "GuildConfig" WHERE "guildId" = 'default'"#)
        .fetch_optional(db)
        .await
        .ok()
        .flatten();

    for m in registry() {
        let enabled = m
            .legacy_column
            .and_then(|col| legacy.as_ref().and_then(|r| r.try_get::<bool, _>(col).ok()))
            .unwrap_or(m.default_enabled);

        let mut config = serde_json::Map::new();
        if m.id == "welcome" {
            if let Some(r) = legacy.as_ref() {
                for (key, col) in [("channelId", "welcomeChannelId"), ("title", "welcomeTitle"), ("description", "welcomeDesc"), ("color", "welcomeColor"), ("image", "welcomeImage")] {
                    if let Ok(Some(v)) = r.try_get::<Option<String>, _>(col) {
                        config.insert(key.to_string(), Value::String(v));
                    }
                }
            }
        }

        let commands: Vec<String> = (m.commands)().into_iter().map(|c| c.name).collect();
        sqlx::query(
            r#"INSERT INTO "BotModule" (id, name, description, category, commands, settings, enabled, config, "declaredAt", "updatedAt")
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
               ON CONFLICT (id) DO UPDATE SET
                 name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category,
                 commands = EXCLUDED.commands, settings = EXCLUDED.settings, "declaredAt" = NOW()"#,
        )
        .bind(m.id)
        .bind(m.name)
        .bind(m.description)
        .bind(m.category)
        .bind(&commands)
        .bind(serde_json::to_value(m.settings)?)
        .bind(enabled)
        .bind(Value::Object(config))
        .execute(db)
        .await?;
    }

    let ids: Vec<&str> = registry().iter().map(|m| m.id).collect();
    sqlx::query(r#"DELETE FROM "BotModule" WHERE NOT (id = ANY($1))"#).bind(&ids).execute(db).await?;
    DECLARED.store(true, Ordering::Relaxed);
    Ok(())
}

pub async fn reload(db: &PgPool) -> anyhow::Result<bool> {
    let rows = sqlx::query(r#"SELECT id, enabled, config FROM "BotModule""#).fetch_all(db).await?;
    let mut st = state().write().unwrap();
    let before: HashSet<&str> = registry().iter().filter(|m| st.enabled.get(m.id).copied().unwrap_or(m.default_enabled)).map(|m| m.id).collect();
    for r in rows {
        let id: String = r.try_get("id")?;
        st.enabled.insert(id.clone(), r.try_get("enabled")?);
        st.config.insert(id, r.try_get::<Value, _>("config").unwrap_or(Value::Null));
    }
    let after: HashSet<&str> = registry().iter().filter(|m| st.enabled.get(m.id).copied().unwrap_or(m.default_enabled)).map(|m| m.id).collect();
    Ok(before != after)
}

fn home_guild() -> Option<Id<twilight_model::id::marker::GuildMarker>> {
    crate::config::get_clean_var("DISCORD_GUILD_ID").and_then(|v| v.parse::<u64>().ok()).filter(|v| *v != 0).map(Id::new)
}

pub async fn sync_commands(http: &HttpClient, application_id: Id<ApplicationMarker>) -> anyhow::Result<usize> {
    let commands: Vec<Command> = registry().iter().filter(|m| enabled(m.id)).flat_map(|m| (m.commands)()).collect();
    let client = http.interaction(application_id);
    match home_guild() {
        Some(guild) => {
            client
                .set_guild_commands(guild, &commands)
                .await
                .map_err(|e| anyhow::anyhow!("serveur {guild} : {e} (le bot a-t-il été invité avec la permission applications.commands ?)"))?;
            client.set_global_commands(&[]).await?;
            tracing::info!("Modules : {} commandes envoyées sur le serveur {}", commands.len(), guild);
        }
        None => {
            client.set_global_commands(&commands).await?;
            tracing::info!("Modules : {} commandes globales envoyées (DISCORD_GUILD_ID absent)", commands.len());
        }
    }
    Ok(commands.len())
}

pub fn spawn_watcher(db: PgPool, http: Arc<HttpClient>, application_id: Id<ApplicationMarker>) {
    tokio::spawn(async move {
        loop {
            let mut listener = match PgListener::connect_with(&db).await {
                Ok(l) => l,
                Err(e) => {
                    tracing::warn!("Modules : écoute Postgres impossible ({}), nouvel essai dans 30 s", e);
                    tokio::time::sleep(std::time::Duration::from_secs(30)).await;
                    continue;
                }
            };
            if let Err(e) = listener.listen(NOTIFY_CHANNEL).await {
                tracing::warn!("Modules : LISTEN {} impossible ({})", NOTIFY_CHANNEL, e);
                tokio::time::sleep(std::time::Duration::from_secs(30)).await;
                continue;
            }
            loop {
                let notified = tokio::time::timeout(std::time::Duration::from_secs(60), listener.recv()).await;
                if let Ok(Err(e)) = notified {
                    tracing::warn!("Modules : écoute interrompue ({}), reconnexion", e);
                    break;
                }
                tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
                if !DECLARED.load(Ordering::Relaxed) && declare(&db).await.is_ok() {
                    tracing::info!("Modules : registre publié");
                }
                match reload(&db).await {
                    Ok(true) => match sync_commands(&http, application_id).await {
                        Ok(n) => tracing::info!("Modules : {} commandes slash enregistrées", n),
                        Err(e) => tracing::warn!("Modules : synchronisation des commandes échouée : {:?}", e),
                    },
                    Ok(false) => {}
                    Err(e) => tracing::warn!("Modules : relecture échouée : {}", e),
                }
            }
        }
    });
}
