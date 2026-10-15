# Security Survey Handoff Report (R3 Anti-Raid & R4 Gatekeeper)

**Explorer**: Security Survey Explorer  
**Working Directory**: `/home/leo/Code/Paranoia_New/.agents/teamwork/explorer_survey_security`  
**Date**: 2026-10-14  

---

## 1. Observation

1. **Cargo Configuration (`Cargo.toml:15-32`)**:
   - `twilight-http = "0.17.1"`, `twilight-model = "0.17.1"`, `twilight-gateway = "0.17.1"`, `twilight-util = "0.17.0"` with builder feature are installed.
   - `sqlx = "0.9.0"` with postgres, runtime-tokio, tls-rustls, macros, chrono, uuid, migrate, json is available.
2. **Current Database Migrations (`migrations/0001_initial_schema.sql:1-34`)**:
   - Only `sanctions`, `appeals`, and `tiktok_targets` tables exist.
   - No table exists for persisting temporary decay roles or storing original channel permission overwrites during lockdown.
3. **Gateway Intents & Event Loop (`src/main.rs:53-57, 105-118`)**:
   - `Intents::GUILD_MEMBERS` is enabled on the gateway shard.
   - `events::handle_event` is called via `tokio::spawn` for all gateway events.
4. **Existing Anti-Raid Engine (`src/modules/security.rs:22-121`)**:
   - Line 24: `joins: VecDeque<Instant>` records only join timestamps and drops `UserId`.
   - Lines 61-66: `start_lockdown` calls `http.update_guild(guild_id).verification_level(Some(VerificationLevel::VeryHigh))`. It does not modify channel permission overwrites for `@everyone`.
   - Lines 93-114: When `burst >= limit`, `start_lockdown` is called, but the accounts that joined during the burst are not kicked.
   - Lines 116-121: Only members who join *after* the lockdown state is set are kicked via `http.remove_guild_member`.
5. **Channel Overwrite Management Pattern (`src/modules/conference.rs:330-347`)**:
   - Uses `twilight_model::http::permission_overwrite::{PermissionOverwrite as HttpOverwrite, PermissionOverwriteType as HttpOverwriteType}`.
   - Calls `http.update_channel_permission(channel_id, &overwrite)` and `http.delete_channel_permission(channel_id).role(...)`.
6. **Role Management Pattern (`src/modules/staff.rs:319-337`)**:
   - Calls `http.add_guild_member_role(guild_id, user_id, role_id)` and `http.remove_guild_member_role(guild_id, user_id, role_id)`.
7. **Interactive Components (`src/events/mod.rs:133-189`)**:
   - Dispatches `InteractionData::MessageComponent(comp)` by matching custom ID prefixes against `crate::modules::component_owner(&cid)`.
8. **Test Execution Status (`cargo test`)**:
   - Unit tests pass (5 in `main.rs`, 10 in `adversarial_stress_test.rs`).
   - One test in `tests/config_test.rs` failed (`test_config_empty_discord_token_fails`) due to `DISCORD_BOT_TOKEN` fallback loading from `../.env`.

---

## 2. Logic Chain

1. **R3 Suspect Account Evasion**:
   - Observation 4 shows `joins: VecDeque<Instant>` does not record `UserId`.
   - When a burst of 10 accounts joins within 5 seconds, the trigger fires, but the 10 suspect accounts that caused the burst are already in the guild and remain unpunished.
   - Therefore, tracking `JoinRecord { user_id: Id<UserMarker>, joined_at: Instant }` and draining the suspect accounts on threshold breach is strictly necessary to satisfy requirement R3 ("automatically kick suspect raid wave accounts").
2. **R3 Channel Permission Restriction**:
   - Observation 4 shows `start_lockdown` only adjusts the guild verification level.
   - Observation 5 confirms `update_channel_permission` and `delete_channel_permission` are available and idiomatic in Twilight for modifying channel permission overwrites.
   - Therefore, during lockdown, the bot must iterate guild channels, record original `@everyone` overwrites, apply denials (`SEND_MESSAGES`, `ADD_REACTIONS`, `CREATE_PUBLIC_THREADS`, `SPEAK`), and restore them upon lockdown expiration to satisfy requirement R3.
3. **R4 Gatekeeper & Captcha Verification Flow**:
   - Observations 2 and 7 show no gatekeeper module exists, but component routing is supported.
   - Therefore, a `gatekeeper` module registering prefix `gatekeeper:` can generate ephemeral captcha challenges (emoji/code buttons with randomized order) and handle clicks.
   - When answered correctly, it grants the verified role and the temporary decay role.
4. **R4 Temporary Role Decay**:
   - Observation 2 shows no database table exists for temporary decay roles.
   - Observation 6 shows role addition and removal via Twilight HTTP client.
   - Observation 3 shows background workers can run periodic intervals via `tokio::spawn`.
   - Therefore, a `temp_decay_roles` PostgreSQL table paired with a 30s background worker in `main.rs` that queries `WHERE processed = FALSE AND expires_at <= NOW()` and calls `http.remove_guild_member_role` will ensure persistent, crash-resilient role decay across bot restarts.

---

## 3. Caveats

1. **Channel Rate Limits**:
   - Restricting permissions across hundreds of channels sequentially during lockdown could hit Discord HTTP rate limits (50 requests/second). Batching or prioritizing public text channels and logging warnings ensures the bot does not stall.
2. **Crash Resilience for Lockdown State**:
   - If the bot restarts while a guild is locked, in-memory overwrites would be lost if not stored in Postgres. Storing `guild_lockdown_overwrites` in the database guarantees lossless restoration even across restarts.
3. **Existing Failed Test in `config_test.rs`**:
   - `test_config_empty_discord_token_fails` failed because `.env` contains `DISCORD_BOT_TOKEN`, which acts as fallback in `Config::load`. This is an environment configuration quirk in the test suite and does not impact security logic.

---

## 4. Conclusion

The implementation of R3 and R4 requires:
1. **Upgrading `src/modules/security.rs`**:
   - Replace `Guard` with `GuildRaidState` tracking `VecDeque<JoinRecord>` (`user_id`, `joined_at`).
   - Implement pure `evaluate_join` returning `JoinDecision::TriggerLockdown { suspect_user_ids, .. }`.
   - Implement channel permission lockdown using `http.update_channel_permission` and restoration using `ChannelOverwriteBackup`.
   - Kick all accounts in `suspect_user_ids` upon threshold trigger.
2. **Introducing `gatekeeper` & Temporary Decay Roles**:
   - Create migration `0002_security_gatekeeper.sql` defining `temp_decay_roles` and `guild_lockdown_overwrites`.
   - Implement interactive button captcha challenge generator and verification validator.
   - Implement `spawn_temp_role_decay_worker` running every 30s in `main.rs`.
3. **Unit Tests**:
   - Write deterministic unit tests for sliding window burst detection, captcha validation, and expired role query processing.

---

## 5. Verification Method

1. **Compilation Check**:
   ```bash
   cd /home/leo/Code/Paranoia_New/bot-rust && cargo check
   ```
2. **Unit Test Execution**:
   ```bash
   cd /home/leo/Code/Paranoia_New/bot-rust && cargo test --test anti_raid_test --test gatekeeper_test
   ```
3. **Files to Inspect**:
   - `/home/leo/Code/Paranoia_New/.agents/teamwork/explorer_survey_security/analysis.md` (detailed architectural survey).
   - `bot-rust/src/modules/security.rs` (anti-raid join velocity and channel permission restriction).
   - `bot-rust/migrations/` (new database tables).
4. **Invalidation Conditions**:
   - If join velocity sliding window triggers without identifying and kicking accounts that joined during the burst wave.
   - If channel permissions for `@everyone` are not reverted to their exact pre-lockdown state when lockdown ends.
   - If temporary roles are not persisted to PostgreSQL or are lost upon bot restart.
