use sqlx::{PgPool, Row};
use std::sync::Arc;
use twilight_http::Client as HttpClient;
use twilight_model::{
    channel::{ChannelType, permission_overwrite::{PermissionOverwrite, PermissionOverwriteType}},
    guild::Permissions,
    id::Id,
};

pub async fn handle_voice_state(
    vsu: &twilight_model::gateway::payload::incoming::VoiceStateUpdate,
    http: &Arc<HttpClient>,
    db: &PgPool
) {
    let guild_id = match vsu.guild_id {
        Some(gid) => gid,
        None => return,
    };
    let user_id = vsu.user_id;
    let channel_id = match vsu.channel_id {
        Some(cid) => cid,
        None => return,
    };

    let row = sqlx::query(r#"SELECT "moduleTempVoice" FROM "GuildConfig" WHERE "guildId" = 'default'"#)
        .fetch_optional(db)
        .await
        .unwrap_or(None);

    let temp_voice_enabled = if let Some(r) = row {
        r.try_get("moduleTempVoice").unwrap_or(false)
    } else {
        false
    };

    if !temp_voice_enabled {
        return;
    }

    if let Ok(ch) = http.channel(channel_id).await {
        if let Ok(chan) = ch.model().await {
            let cname = chan.name.unwrap_or_default().to_lowercase();
            if cname.contains("creer") || cname.contains("create") || cname.contains("créer") {
                let user_name = if let Ok(u) = http.user(user_id).await {
                    if let Ok(user) = u.model().await {
                        user.name
                    } else { "Vocal".to_string() }
                } else { "Vocal".to_string() };

                let permission_overwrite = PermissionOverwrite {
                    allow: Permissions::MANAGE_CHANNELS | Permissions::MANAGE_ROLES,
                    deny: Permissions::empty(),
                    id: Id::new(user_id.get()),
                    kind: PermissionOverwriteType::Member,
                };

                let new_chan_name = format!("Vocal de {}", user_name);
                if let Ok(new_ch) = http.create_guild_channel(guild_id, &new_chan_name)
                    .kind(ChannelType::GuildVoice)
                    .parent_id(chan.parent_id.unwrap_or_else(|| Id::new(1)))
                    .permission_overwrites(&[permission_overwrite])
                    .await
                {
                    if let Ok(created) = new_ch.model().await {
                        let _ = http.update_guild_member(guild_id, user_id)
                            .channel_id(Some(created.id))
                            .await;
                    }
                }
            }
        }
    }
}
