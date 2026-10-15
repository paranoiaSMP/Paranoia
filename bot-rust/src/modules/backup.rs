#![allow(deprecated)]

use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use std::collections::HashMap;
use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::application::command::{Command, CommandType};
use twilight_model::application::interaction::Interaction;
use twilight_model::channel::message::component::{ActionRow, Button, ButtonStyle, Component};
use twilight_model::channel::message::MessageFlags;
use twilight_model::channel::permission_overwrite::{PermissionOverwrite, PermissionOverwriteType};
use twilight_model::channel::ChannelType;
use twilight_model::guild::Permissions;
use twilight_model::http::interaction::{InteractionResponse, InteractionResponseData, InteractionResponseType};
use twilight_model::id::{marker::GuildMarker, Id};
use twilight_util::builder::command::{CommandBuilder, StringBuilder, SubCommandBuilder};
use twilight_util::builder::embed::EmbedBuilder;

use crate::modules::staff::{opt_str, reply_private, sub};

pub const CONFIRM: &str = "backup_restore:";

#[derive(Serialize, Deserialize)]
struct RoleSave {
    name: String,
    color: u32,
    hoist: bool,
    mentionable: bool,
    permissions: String,
    position: i64,
}

#[derive(Serialize, Deserialize)]
struct OverwriteSave {
    target: String,
    is_role: bool,
    allow: String,
    deny: String,
}

#[derive(Serialize, Deserialize)]
struct ChannelSave {
    name: String,
    kind: u8,
    parent: Option<String>,
    position: Option<i32>,
    topic: Option<String>,
    nsfw: Option<bool>,
    bitrate: Option<u32>,
    user_limit: Option<u16>,
    slowmode: Option<u16>,
    overwrites: Vec<OverwriteSave>,
}

#[derive(Serialize, Deserialize)]
struct Snapshot {
    roles: Vec<RoleSave>,
    channels: Vec<ChannelSave>,
}

pub fn register() -> Command {
    CommandBuilder::new("sauvegarde", "Sauvegarder ou restaurer les rôles et salons du serveur", CommandType::ChatInput)
        .default_member_permissions(Permissions::ADMINISTRATOR)
        .option(SubCommandBuilder::new("creer", "Créer une sauvegarde maintenant").option(StringBuilder::new("nom", "Nom de la sauvegarde").required(false).max_length(80)))
        .option(SubCommandBuilder::new("liste", "Voir les sauvegardes"))
        .option(SubCommandBuilder::new("restaurer", "Recréer les rôles et salons manquants").option(StringBuilder::new("id", "Identifiant de la sauvegarde").required(true)))
        .build()
}

async fn snapshot(http: &HttpClient, guild: Id<GuildMarker>) -> anyhow::Result<Snapshot> {
    let roles = http.roles(guild).await?.model().await?;
    let role_name: HashMap<u64, String> = roles.iter().map(|r| (r.id.get(), r.name.clone())).collect();
    let channels = http.guild_channels(guild).await?.model().await?;
    let channel_name: HashMap<u64, String> = channels.iter().filter_map(|c| Some((c.id.get(), c.name.clone()?))).collect();

    let roles = roles
        .iter()
        .filter(|r| !r.managed && r.id.get() != guild.get())
        .map(|r| RoleSave {
            name: r.name.clone(),
            color: r.color,
            hoist: r.hoist,
            mentionable: r.mentionable,
            permissions: r.permissions.bits().to_string(),
            position: r.position,
        })
        .collect();

    let channels = channels
        .iter()
        .filter_map(|c| {
            Some(ChannelSave {
                name: c.name.clone()?,
                kind: u8::from(c.kind),
                parent: c.parent_id.and_then(|p| channel_name.get(&p.get()).cloned()),
                position: c.position,
                topic: c.topic.clone(),
                nsfw: c.nsfw,
                bitrate: c.bitrate,
                user_limit: c.user_limit.map(|u| u.min(u16::MAX as u32) as u16),
                slowmode: c.rate_limit_per_user,
                overwrites: c
                    .permission_overwrites
                    .clone()
                    .unwrap_or_default()
                    .iter()
                    .filter_map(|o| {
                        let is_role = o.kind == PermissionOverwriteType::Role;
                        let target = if is_role {
                            if o.id.get() == guild.get() { "@everyone".to_string() } else { role_name.get(&o.id.get())?.clone() }
                        } else {
                            o.id.get().to_string()
                        };
                        Some(OverwriteSave { target, is_role, allow: o.allow.bits().to_string(), deny: o.deny.bits().to_string() })
                    })
                    .collect(),
            })
        })
        .collect();
    Ok(Snapshot { roles, channels })
}

pub async fn run(interaction: Interaction, http: Arc<HttpClient>, db: PgPool) -> anyhow::Result<()> {
    let Some(guild) = interaction.guild_id else { return Ok(()) };
    let author = interaction.author_id().map(|u| u.to_string()).unwrap_or_default();
    let (name, opts) = sub(&interaction);

    match name.as_str() {
        "creer" => {
            let snap = snapshot(&http, guild).await?;
            let label = opt_str(&opts, "nom").unwrap_or_else(|| chrono::Utc::now().format("Sauvegarde du %d/%m/%Y %H:%M").to_string());
            let id = uuid::Uuid::new_v4().to_string();
            sqlx::query(r#"INSERT INTO "GuildBackup" (id, "guildId", label, data, "createdBy", "createdAt") VALUES ($1, $2, $3, $4, $5, NOW())"#)
                .bind(&id)
                .bind(guild.to_string())
                .bind(&label)
                .bind(serde_json::to_value(&snap)?)
                .bind(&author)
                .execute(&db)
                .await?;
            reply_private(&http, &interaction, Some(format!("**{label}** créée : {} rôles, {} salons. Identifiant `{}`.", snap.roles.len(), snap.channels.len(), &id[..8])), vec![]).await
        }
        "restaurer" => {
            let Some(prefix) = opt_str(&opts, "id").filter(|p| p.len() >= 6) else {
                return reply_private(&http, &interaction, Some("Donne au moins les 6 premiers caractères de l'identifiant.".into()), vec![]).await;
            };
            let row = sqlx::query(r#"SELECT id, label FROM "GuildBackup" WHERE "guildId" = $1 AND id LIKE $2 || '%' LIMIT 1"#)
                .bind(guild.to_string())
                .bind(&prefix)
                .fetch_optional(&db)
                .await?;
            let Some(row) = row else { return reply_private(&http, &interaction, Some("Sauvegarde introuvable.".into()), vec![]).await };
            let id: String = row.try_get("id")?;
            let label: String = row.try_get("label")?;
            let confirm = vec![Component::ActionRow(ActionRow {
                id: None,
                components: vec![Component::Button(Button {
                    id: None,
                    custom_id: Some(format!("{CONFIRM}{id}")),
                    disabled: false,
                    emoji: None,
                    label: Some("Recréer ce qui manque".into()),
                    style: ButtonStyle::Danger,
                    url: None,
                    sku_id: None,
                })],
            })];
            let response = InteractionResponse {
                kind: InteractionResponseType::ChannelMessageWithSource,
                data: Some(InteractionResponseData {
                    content: Some(format!("Restaurer **{label}** ? Seuls les rôles et salons absents seront recréés ; rien d'existant n'est modifié ni supprimé.")),
                    components: Some(confirm),
                    flags: Some(MessageFlags::EPHEMERAL),
                    ..Default::default()
                }),
            };
            http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &response).await?;
            Ok(())
        }
        _ => {
            let rows = sqlx::query(r#"SELECT id, label, "createdBy", "createdAt" FROM "GuildBackup" WHERE "guildId" = $1 ORDER BY "createdAt" DESC LIMIT 15"#)
                .bind(guild.to_string())
                .fetch_all(&db)
                .await?;
            let lines: Vec<String> = rows
                .iter()
                .map(|r| {
                    let id: String = r.try_get("id").unwrap_or_default();
                    let label: String = r.try_get("label").unwrap_or_default();
                    let by: String = r.try_get("createdBy").unwrap_or_default();
                    format!("`{}` · **{label}** · <@{by}>", &id[..8.min(id.len())])
                })
                .collect();
            let embed = EmbedBuilder::new()
                .description(format!("{}\n\n{}", format!("## {} | Sauvegardes", crate::utils::emoji::UTILS), if lines.is_empty() { "Aucune sauvegarde. `/sauvegarde creer` pour en faire une.".to_string() } else { lines.join("\n") }))
                .color(0x7c3aed)
                .build();
            reply_private(&http, &interaction, None, vec![embed]).await
        }
    }
}

pub async fn handle_confirm(interaction: Interaction, http: Arc<HttpClient>, db: PgPool, custom_id: &str) -> anyhow::Result<()> {
    let Some(guild) = interaction.guild_id else { return Ok(()) };
    let admin = interaction.member.as_ref().and_then(|m| m.permissions).is_some_and(|p| p.contains(Permissions::ADMINISTRATOR));
    if !admin {
        return reply_private(&http, &interaction, Some("Réservé aux administrateurs.".into()), vec![]).await;
    }
    let Some(id) = custom_id.strip_prefix(CONFIRM) else { return Ok(()) };

    let defer = InteractionResponse {
        kind: InteractionResponseType::DeferredUpdateMessage,
        data: None,
    };
    http.interaction(interaction.application_id).create_response(interaction.id, &interaction.token, &defer).await?;

    let data: serde_json::Value = sqlx::query_scalar(r#"SELECT data FROM "GuildBackup" WHERE id = $1 AND "guildId" = $2"#)
        .bind(id)
        .bind(guild.to_string())
        .fetch_one(&db)
        .await?;
    let snap: Snapshot = serde_json::from_value(data)?;

    let mut roles: HashMap<String, Id<twilight_model::id::marker::RoleMarker>> =
        http.roles(guild).await?.model().await?.into_iter().map(|r| (r.name, r.id)).collect();
    roles.insert("@everyone".into(), Id::new(guild.get()));
    let mut created_roles = 0;
    let mut saved_roles: Vec<&RoleSave> = snap.roles.iter().collect();
    saved_roles.sort_by_key(|r| r.position);
    for r in saved_roles {
        if roles.contains_key(&r.name) {
            continue;
        }
        let perms = Permissions::from_bits_truncate(r.permissions.parse().unwrap_or(0));
        if let Ok(res) = http.create_role(guild).name(&r.name).color(r.color).hoist(r.hoist).mentionable(r.mentionable).permissions(perms).await {
            if let Ok(role) = res.model().await {
                roles.insert(role.name.clone(), role.id);
                created_roles += 1;
            }
        }
    }

    let existing = http.guild_channels(guild).await?.model().await?;
    let mut channels: HashMap<(String, u8), Id<twilight_model::id::marker::ChannelMarker>> =
        existing.iter().filter_map(|c| Some(((c.name.clone()?, u8::from(c.kind)), c.id))).collect();
    let mut created_channels = 0;
    let mut ordered: Vec<&ChannelSave> = snap.channels.iter().collect();
    ordered.sort_by_key(|c| (c.kind != u8::from(ChannelType::GuildCategory), c.position.unwrap_or(0)));
    for c in ordered {
        if channels.contains_key(&(c.name.clone(), c.kind)) {
            continue;
        }
        let overwrites: Vec<PermissionOverwrite> = c
            .overwrites
            .iter()
            .filter_map(|o| {
                let id = if o.is_role { roles.get(&o.target)?.cast() } else { Id::new(o.target.parse().ok()?) };
                Some(PermissionOverwrite {
                    allow: Permissions::from_bits_truncate(o.allow.parse().unwrap_or(0)),
                    deny: Permissions::from_bits_truncate(o.deny.parse().unwrap_or(0)),
                    id,
                    kind: if o.is_role { PermissionOverwriteType::Role } else { PermissionOverwriteType::Member },
                })
            })
            .collect();
        let mut req = http.create_guild_channel(guild, &c.name).kind(ChannelType::from(c.kind)).permission_overwrites(&overwrites);
        if let Some(p) = c.parent.as_ref().and_then(|p| channels.get(&(p.clone(), u8::from(ChannelType::GuildCategory)))) {
            req = req.parent_id(*p);
        }
        if let Some(pos) = c.position {
            req = req.position(pos.max(0) as u64);
        }
        if let Some(t) = c.topic.as_deref() {
            req = req.topic(t);
        }
        if let Some(n) = c.nsfw {
            req = req.nsfw(n);
        }
        if let Some(b) = c.bitrate {
            req = req.bitrate(b);
        }
        if let Some(u) = c.user_limit {
            req = req.user_limit(u);
        }
        if let Some(s) = c.slowmode {
            req = req.rate_limit_per_user(s);
        }
        if let Ok(res) = req.await {
            if let Ok(ch) = res.model().await {
                channels.insert((c.name.clone(), c.kind), ch.id);
                created_channels += 1;
            }
        }
    }

    let summary = format!("Restauration terminée : {created_roles} rôle(s) et {created_channels} salon(s) recréés.");
    let _ = http.interaction(interaction.application_id).update_response(&interaction.token).content(Some(&summary)).components(Some(&[])).await;
    Ok(())
}
