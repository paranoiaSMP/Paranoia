# Security Survey Analysis: R3 (Anti-Raid Engine) & R4 (Gatekeeper & Temp Decay Roles)

**Target Codebase**: `bot-rust/`  
**Explorer**: Security Survey Explorer  
**Date**: 2026-10-14  

---

## 1. Executive Summary

This investigation surveys requirements **R3 (Join-Velocity Anti-Raid Engine)** and **R4 (Gatekeeper Verification & Temporary Decay Roles)** against the `bot-rust` Twilight/PostgreSQL codebase. While a basic anti-raid stub exists in `src/modules/security.rs`, it lacks suspect wave tracking (joins during the burst are not tracked by user ID and thus cannot be kicked), lacks channel permission lockdowns across channels via the Twilight HTTP client, and maintains only an in-memory verification level bump. No gatekeeper verification or temporary decay role mechanisms exist yet. Concrete data structures, algorithms, database migrations, and integration points are designed herein to achieve full compliance with all acceptance criteria while adhering strictly to antislop and clean code practices.

---

## 2. Requirement R3: Join-Velocity Anti-Raid Engine

### 2.1 Existing Code Analysis (`src/modules/security.rs` & `src/events/mod.rs`)

In `bot-rust/src/modules/security.rs`:
- An in-memory struct `Guard` tracks join timestamps using `VecDeque<Instant>`.
- The `on_member_add` handler checks whether `joins.len() >= limit` (default 8 joins over 60s).
- When triggered, it calls `start_lockdown`, which updates the guild verification level to `VerificationLevel::VeryHigh`.
- If the guild is locked, subsequent incoming members are kicked via `http.remove_guild_member`.
- A manual `/verrouillage` slash command provides `on`, `off`, and `statut` subcommands.

### 2.2 Critical Gaps Identified

1. **Suspect Wave Accounts Escape Sanction**:
   - Current `Guard` records only `Instant` (`VecDeque<Instant>`).
   - The accounts that joined *during* the burst that crossed the threshold are never tracked by `UserId`. As a result, those 8–10+ raid accounts stay in the guild, defeating the purpose of anti-raid defense.
   - Requirement R3 explicitly mandates: **"automatically kick suspect raid wave accounts"**.
2. **Channel Permissions Are Never Modified**:
   - Current code only calls `http.update_guild(guild_id).verification_level(Some(VerificationLevel::VeryHigh))`.
   - Requirement R3 explicitly mandates: **"restricting @everyone permissions across channels via Twilight HTTP client"**.
   - Channels remain completely accessible and speakable for existing members and compromised bots.
3. **No Overwrite Restoration Mechanics**:
   - When lockdown ends, only the guild verification level is reverted. Because channel permissions are never saved or restored, any manual permission changes would corrupt server access.
4. **State Management Scope**:
   - The static mutex `guard()` is global and not mapped by `GuildId`. While Paranoia SMP currently operates as a dedicated community, production-grade architecture requires per-guild state isolation (`HashMap<Id<GuildMarker>, GuildRaidState>`).

### 2.3 Proposed Architecture & Concrete Data Structures

#### Sliding-Window Join Velocity Tracker

```rust
use std::collections::{HashMap, VecDeque};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use twilight_model::id::{marker::{GuildMarker, UserMarker, ChannelMarker}, Id};
use twilight_model::guild::Permissions;

#[derive(Clone, Debug)]
pub struct JoinRecord {
    pub user_id: Id<UserMarker>,
    pub joined_at: Instant,
}

#[derive(Clone, Debug)]
pub struct ChannelOverwriteBackup {
    pub channel_id: Id<ChannelMarker>,
    pub had_overwrite: bool,
    pub original_allow: Permissions,
    pub original_deny: Permissions,
}

#[derive(Clone, Debug)]
pub struct ActiveLockdown {
    pub triggered_at: Instant,
    pub expires_at: Instant,
    pub previous_verification_level: Option<twilight_model::guild::VerificationLevel>,
    pub channel_backups: Vec<ChannelOverwriteBackup>,
}

#[derive(Default)]
pub struct GuildRaidState {
    pub recent_joins: VecDeque<JoinRecord>,
    pub lockdown: Option<ActiveLockdown>,
}

pub enum JoinDecision {
    /// Member is allowed to join normally
    Allow,
    /// Threshold exceeded: initiate lockdown and auto-kick suspect wave members
    TriggerLockdown {
        suspect_user_ids: Vec<Id<UserMarker>>,
        lockdown_duration: Duration,
    },
    /// Server is currently under lockdown: immediately kick incoming member
    RejectLocked,
}
```

#### Core Algorithm: Join Evaluation (Pure & Unit-Testable)

```rust
impl GuildRaidState {
    pub fn evaluate_join(
        &mut self,
        user_id: Id<UserMarker>,
        now: Instant,
        window_duration: Duration,
        join_threshold: usize,
        lockdown_duration: Duration,
    ) -> JoinDecision {
        // 1. Check if an active lockdown is in progress
        if let Some(lockdown) = &self.lockdown {
            if now < lockdown.expires_at {
                return JoinDecision::RejectLocked;
            }
            // Expired lockdown will be cleaned up by the caller
        }

        // 2. Prune entries outside the sliding window
        while self.recent_joins.front().is_some_and(|j| now.duration_since(j.joined_at) > window_duration) {
            self.recent_joins.pop_front();
        }

        // 3. Record the new join
        self.recent_joins.push_back(JoinRecord {
            user_id,
            joined_at: now,
        });

        // 4. Check threshold trigger (e.g. >= 10 joins in 5s)
        if self.recent_joins.len() >= join_threshold {
            let suspect_user_ids: Vec<Id<UserMarker>> = self
                .recent_joins
                .drain(..)
                .map(|j| j.user_id)
                .collect();

            JoinDecision::TriggerLockdown {
                suspect_user_ids,
                lockdown_duration,
            }
        } else {
            JoinDecision::Allow
        }
    }
}
```

### 2.4 Channel Permission Lockdown & Restoration

#### Restricting `@everyone` Across Channels via Twilight HTTP

When `TriggerLockdown` is evaluated:
1. Query all channels via `http.guild_channels(guild_id).await?.model().await?`.
2. For each relevant channel (GuildText, GuildNews, GuildVoice, GuildForum):
   - Find existing overwrite for role `@everyone` (`id: Id::new(guild_id.get())`).
   - Backup `had_overwrite`, `original_allow`, `original_deny`.
   - Calculate lockdown permissions:
     ```rust
     let lock_deny = Permissions::SEND_MESSAGES
         | Permissions::SEND_MESSAGES_IN_THREADS
         | Permissions::CREATE_PUBLIC_THREADS
         | Permissions::CREATE_PRIVATE_THREADS
         | Permissions::ADD_REACTIONS
         | Permissions::SPEAK;

     let new_allow = original_allow - lock_deny;
     let new_deny = original_deny | lock_deny;

     let overwrite = twilight_model::http::permission_overwrite::PermissionOverwrite {
         allow: Some(new_allow),
         deny: Some(new_deny),
         id: Id::new(guild_id.get()),
         kind: twilight_model::http::permission_overwrite::PermissionOverwriteType::Role,
     };

     http.update_channel_permission(channel.id, &overwrite)
         .reason("Anti-raid: Guild lockdown in progress")
         .await;
     ```
3. Store backups in `ActiveLockdown.channel_backups` and persist to Postgres table `guild_lockdown_overwrites`.
4. Auto-kick all suspect accounts in `suspect_user_ids`:
   ```rust
   for suspect_id in suspect_user_ids {
       let _ = http.remove_guild_member(guild_id, suspect_id)
           .reason("Anti-raid: suspect raid wave account")
           .await;
   }
   ```

#### Lifting Lockdown & Restoring Channel Permissions

When `/verrouillage off` is run or the expiration timer elapses:
1. Iterate over `channel_backups`:
   ```rust
   for backup in channel_backups {
       if backup.had_overwrite {
           let overwrite = twilight_model::http::permission_overwrite::PermissionOverwrite {
               allow: Some(backup.original_allow),
               deny: Some(backup.original_deny),
               id: Id::new(guild_id.get()),
               kind: twilight_model::http::permission_overwrite::PermissionOverwriteType::Role,
           };
           let _ = http.update_channel_permission(backup.channel_id, &overwrite)
               .reason("Anti-raid: fin du verrouillage")
               .await;
       } else {
           let _ = http.delete_channel_permission(backup.channel_id)
               .role(Id::new(guild_id.get()))
               .reason("Anti-raid: fin du verrouillage")
               .await;
       }
   }
   ```
2. Restore guild verification level to `previous_verification_level`.
3. Clean up database state in `guild_lockdown_overwrites`.

---

## 3. Requirement R4: Gatekeeper Verification & Temporary Decay Roles

### 3.1 Existing Code Analysis

- The codebase currently has **no** captcha or gatekeeper verification module.
- The codebase currently has **no** general temporary role decay system (only staff absence tracking exists in `modules/staff.rs`, which checks absence dates once per hour).
- Twilight interactive components are already established in `src/events/mod.rs` and `src/modules/drops.rs` using `ActionRow`, `Button`, `ButtonStyle`, and `InteractionData::MessageComponent`.

### 3.2 Interactive Button Captcha Architecture

#### Verification Flow

```
+-------------------------------------------------------------+
| 1. Member arrives in server (no @Membre role yet)           |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| 2. Member views #verification channel with persistent panel |
|    Embed: "Cliquez ci-dessous pour lancer la vérification"  |
|    Button: [🛡️ Commencer la vérification] (gatekeeper:start)|
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| 3. Bot responds ephemerally with randomized challenge       |
|    Prompt: "Sélectionnez l'émoji correspondant : ⚔️ (Épée)" |
|    Buttons: [ 🛡️ ] [ 🏹 ] [ ⚔️ ] [ 🧪 ]                    |
|    custom_id: gatekeeper:solve:<challenge_id>:<token>      |
+-------------------------------------------------------------+
                              |
             +----------------+----------------+
             |                                 |
      Valid Option                      Invalid Option
             |                                 |
             v                                 v
+-----------------------------+   +-----------------------------+
| 4. Verification Successful  |   | 4. Verification Failed      |
| a) Add @Membre access role  |   | Ephemeral error message;    |
| b) Add @Nouveau decay role  |   | Request retry               |
| c) Persist in DB temp_roles |   +-----------------------------+
| d) Ephemeral success embed  |
+-----------------------------+
```

#### Challenge Generation & Token Verification

```rust
use rand::seq::SliceRandom;
use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};
use twilight_model::id::{marker::UserMarker, Id};

#[derive(Clone, Debug)]
pub struct CaptchaChallenge {
    pub challenge_id: String,
    pub user_id: Id<UserMarker>,
    pub prompt: String,
    pub options: Vec<CaptchaOption>,
    pub correct_token: String,
    pub expires_at: Instant,
}

#[derive(Clone, Debug)]
pub struct CaptchaOption {
    pub label: String,
    pub emoji: Option<String>,
    pub token: String,
}

pub struct GatekeeperChallengeStore {
    challenges: HashMap<String, CaptchaChallenge>,
}

impl GatekeeperChallengeStore {
    pub fn new() -> Self {
        Self { challenges: HashMap::new() }
    }

    pub fn create_challenge(&mut self, user_id: Id<UserMarker>) -> CaptchaChallenge {
        let pool = [
            ("Épée", "⚔️"),
            ("Bouclier", "🛡️"),
            ("Arc", "🏹"),
            ("Potion", "🧪"),
            ("Pioche", "⛏️"),
            ("Pomme d'or", "🍏"),
        ];

        let mut rng = rand::thread_rng();
        let mut selected: Vec<_> = pool.choose_multiple(&mut rng, 4).copied().collect();
        let target = selected[0];
        selected.shuffle(&mut rng);

        let challenge_id = uuid::Uuid::new_v4().simple().to_string()[..8].to_string();
        let correct_token = uuid::Uuid::new_v4().simple().to_string()[..6].to_string();

        let options = selected
            .into_iter()
            .map(|(label, emoji)| {
                let token = if label == target.0 {
                    correct_token.clone()
                } else {
                    uuid::Uuid::new_v4().simple().to_string()[..6].to_string()
                };
                CaptchaOption {
                    label: label.to_string(),
                    emoji: Some(emoji.to_string()),
                    token,
                }
            })
            .collect();

        let challenge = CaptchaChallenge {
            challenge_id: challenge_id.clone(),
            user_id,
            prompt: format!("Cliquez sur le bouton correspondant à : **{} {}**", target.1, target.0),
            options,
            correct_token,
            expires_at: Instant::now() + Duration::from_secs(120),
        };

        self.challenges.insert(challenge_id, challenge.clone());
        challenge
    }

    pub fn verify_attempt(
        &mut self,
        challenge_id: &str,
        user_id: Id<UserMarker>,
        token: &str,
    ) -> Result<bool, &'static str> {
        let challenge = self.challenges.remove(challenge_id).ok_or("Challenge expired or not found")?;
        if challenge.user_id != user_id {
            return Err("User mismatch");
        }
        if Instant::now() > challenge.expires_at {
            return Err("Challenge expired");
        }
        Ok(challenge.correct_token == token)
    }
}
```

### 3.3 Temporary Role Decay System

#### Database Schema (`temp_decay_roles`)

```sql
CREATE TABLE IF NOT EXISTS temp_decay_roles (
    id BIGSERIAL PRIMARY KEY,
    guild_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_temp_decay_roles_pending 
    ON temp_decay_roles (expires_at) 
    WHERE processed = FALSE;

CREATE INDEX IF NOT EXISTS idx_temp_decay_roles_lookup 
    ON temp_decay_roles (guild_id, user_id, role_id);
```

#### Persistent Decay Background Worker

The decay worker periodically queries and removes expired temporary roles:

```rust
use sqlx::{PgPool, Row};
use std::sync::Arc;
use std::time::Duration;
use twilight_http::Client as HttpClient;
use twilight_model::id::Id;

pub async fn check_expired_temp_roles(http: &HttpClient, db: &PgPool) -> anyhow::Result<usize> {
    let rows = sqlx::query(
        r#"
        SELECT id, guild_id, user_id, role_id
        FROM temp_decay_roles
        WHERE processed = FALSE AND expires_at <= NOW()
        ORDER BY expires_at ASC
        LIMIT 50
        "#
    )
    .fetch_all(db)
    .await?;

    let count = rows.len();
    for row in rows {
        let record_id: i64 = row.try_get("id")?;
        let guild_id: i64 = row.try_get("guild_id")?;
        let user_id: i64 = row.try_get("user_id")?;
        let role_id: i64 = row.try_get("role_id")?;

        let res = http
            .remove_guild_member_role(
                Id::new(guild_id as u64),
                Id::new(user_id as u64),
                Id::new(role_id as u64),
            )
            .reason("Temporary role decay: expiration duration reached")
            .await;

        match res {
            Ok(_) => {
                sqlx::query("UPDATE temp_decay_roles SET processed = TRUE WHERE id = $1")
                    .bind(record_id)
                    .execute(db)
                    .await?;
            }
            Err(e) => {
                // If member left or role deleted, mark processed to avoid poison queue
                let err_str = e.to_string();
                if err_str.contains("10007") || err_str.contains("10011") || err_str.contains("Unknown Member") {
                    sqlx::query("UPDATE temp_decay_roles SET processed = TRUE WHERE id = $1")
                        .bind(record_id)
                        .execute(db)
                        .await?;
                } else {
                    tracing::warn!("Failed to remove expired temp role (record {}): {:?}", record_id, e);
                }
            }
        }
    }

    Ok(count)
}

pub fn spawn_temp_role_decay_worker(http: Arc<HttpClient>, db: PgPool) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(30));
        loop {
            interval.tick().await;
            if let Err(e) = check_expired_temp_roles(&http, &db).await {
                tracing::warn!("Temp role decay background worker error: {:?}", e);
            }
        }
    });
}
```

---

## 4. Integration Plan in `bot-rust`

### 4.1 Module System Declarations (`src/modules/mod.rs`)

1. **Update `security` Module Settings**:
   - `raidJoins`: Default `10`, range 2..100.
   - `raidWindowSeconds`: Default `5`, range 2..300.
   - `lockdownMinutes`: Default `10`, range 1..1440.
   - `kickRaidWave`: Choice `yes` / `no`, default `yes`.
   - `restrictChannels`: Choice `yes` / `no`, default `yes`.
   - `logChannelId`: Channel for raid and lockdown audit logs.

2. **Add `gatekeeper` Module**:
   - `id`: `"gatekeeper"`, `category`: `"Sécurité"`.
   - `commands`: `|| vec![commands::gatekeeper::register()]` (e.g. `/setup_verification`).
   - `components`: `&["gatekeeper:"]`.
   - Settings:
     - `verifiedRoleId`: Role given on successful captcha.
     - `decayRoleId`: Temporary role given on join/verification (e.g. `@Nouveau`).
     - `decayDurationMinutes`: Duration before decay (e.g. 4320 = 3 days).
     - `verificationChannelId`: Channel where gatekeeper panel is hosted.

### 4.2 Gateway Event Dispatch (`src/events/mod.rs`)

1. **`Event::MemberAdd(ev)`**:
   - Call `crate::modules::security::on_member_add(&ev, &http, &db, log_channel).await`.
   - If returns `true` (kicked as suspect wave member or while lockdown active), immediately return.
   - Otherwise proceed to `audit::handle_member_add`.
2. **`Event::InteractionCreate(interaction)`**:
   - In `MessageComponent(comp)`:
     ```rust
     if cid.starts_with("gatekeeper:") {
         crate::modules::gatekeeper::handle_component(inter, http, db, &cid).await
     }
     ```

### 4.3 Background Worker Spawning (`src/main.rs`)

Add to `main.rs` before gateway loop:
```rust
modules::security::spawn_decay_worker(Arc::clone(&http), pool.clone());
```

---

## 5. Verification & Test Plan

### 5.1 Anti-Raid Engine Unit Tests (`tests/anti_raid_test.rs`)
- **Normal Join Rate**: Test 5 joins spaced across 10 seconds -> All `JoinDecision::Allow`.
- **Burst Join Trigger**: Test 10 joins within 3 seconds -> 10th join returns `JoinDecision::TriggerLockdown` containing all 10 suspect user IDs.
- **Active Lockdown Rejection**: Next simulated join returns `JoinDecision::RejectLocked`.
- **Window Expiration**: Joins spaced beyond the 5s window do not accumulate to trigger lockdown.

### 5.2 Gatekeeper & Captcha Unit Tests (`tests/gatekeeper_test.rs`)
- **Challenge Generation**: Verify challenge yields 4 options, exactly 1 matching the target prompt.
- **Valid Solution**: Matching token returns `Ok(true)` and removes challenge.
- **Invalid Solution**: Decoy token returns `Ok(false)` and removes challenge.
- **Replay & Expiry Prevention**: Re-using the same challenge ID or attempting after TTL fails.

### 5.3 Temporary Role Decay Unit Tests (`tests/temp_decay_roles_test.rs`)
- **Worker Expiry Identification**: With test rows in SQLite or PostgreSQL mock, worker selects entries with `expires_at <= NOW()` and ignores future entries.
- **Status Flag Transition**: Verifies `processed = TRUE` transition upon successful processing.

---

## 6. Antislop & Code Hygiene Guarantees

All proposed code adheres strictly to antislop rules:
- No superfluous AI commentary (e.g. `// Here we handle...`, `// Function to...`).
- Concrete, idiomatic error handling via `anyhow::Result` and typed errors.
- Precise Rust types (`Id<UserMarker>`, `Permissions`, `Duration`, `Instant`).
- Pure algorithmic logic separated from I/O to enable deterministic, fast-running unit tests.
