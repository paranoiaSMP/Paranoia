# Architecture Survey Explorer - Handoff Report

## 1. Observation

1. **Dependencies (`bot-rust/Cargo.toml`)**:
   - Rust edition `2024`.
   - `twilight-gateway = "0.17.1"`, `twilight-http = "0.17.1"`, `twilight-model = "0.17.1"`, `twilight-cache-inmemory = "0.17.1"`, `twilight-util = { version = "0.17.0", features = ["builder"] }`.
   - `tokio = { version = "1.53.1", features = ["full"] }`.
   - `sqlx = { version = "0.9.0", features = ["postgres", "runtime-tokio", "tls-rustls", "macros", "chrono", "uuid", "migrate", "json"] }`.
   - `reqwest = { version = "0.12", features = ["json"] }`, `regex = "1.11"`, `serde = { version = "1.0", features = ["derive"] }`, `chrono = "0.4"`.
   - Verified via `view_file` on `bot-rust/Cargo.toml:1-35`.

2. **Entry Point & Runtime (`bot-rust/src/main.rs`)**:
   - `src/main.rs:24`: `config::Config::load()?` loads configuration into `Arc<Config>`.
   - `src/main.rs:28-51`: `db::init_pool_lazy(&config.database_url)?` creates SQLx PostgreSQL pool, verifies health (`SELECT 1`), and runs `db::run_migrations(&pool)` and `db::migrate_json_data(&pool)`.
   - `src/main.rs:53-57`: Gateway intents are `Intents::GUILDS | Intents::GUILD_MESSAGES | Intents::MESSAGE_CONTENT | Intents::GUILD_MEMBERS | Intents::GUILD_VOICE_STATES`.
   - `src/main.rs:59-60`: `Shard::new(ShardId::ONE, config.discord_token.clone(), intents)` and `HttpClient::new(...)`.
   - `src/main.rs:67-80`: Calls `modules::declare(&pool)`, `modules::reload(&pool)`, `modules::sync_commands(&http, application.id)`, and spawns module background tasks (`spawn_watcher`, `quiz::spawn_scheduler`, `activity::spawn`, `staff::spawn_absence_sync`, `conference::restore`, and TikTok 90s interval).
   - `src/main.rs:105-118`: Gateway loop consumes events and spawns a tokio task per event: `tokio::spawn(events::handle_event(event, http_clone, pool_clone, config_clone))`.

3. **Event Dispatching (`bot-rust/src/events/mod.rs`)**:
   - `src/events/mod.rs:24-82`: `Event::MessageCreate(msg)` skips bots, logs to `message_log`, awards XP, checks drops/quiz, and invokes `automod::check_message(&msg, &http, &db, ...)`.
   - `src/events/mod.rs:84-189`: `Event::InteractionCreate(inter)` matches:
     - `ApplicationCommand(cmd)`: checks `modules::command_owner(&cmd_name)` and dispatches to command handlers.
     - `MessageComponent(comp)`: checks `modules::component_owner(&cid)` and routes by prefix (`appeal_open:`, `ticket_open:`, `cartes:`, `drops:`, etc.).
     - `ModalSubmit(modal)`: routes modal submissions (`modal_appeal:`, `modal_ticket:`, `candidature`, `conference`).
   - `src/events/mod.rs:248-253`: `Event::MemberAdd(ev)` calls `modules::security::on_member_add(&ev, &http, log_channel)` and `audit::handle_member_add`.

4. **Dynamic Modules (`bot-rust/src/modules/mod.rs`)**:
   - `src/modules/mod.rs:81-529`: `registry()` defines module metadata (`tickets`, `moderation`, `automod`, `security`, `audit`, etc.) with commands, component prefixes, and configurable settings.
   - Hot-reload via `PgListener::connect_with(&db).await` listening on channel `bot_modules`.

5. **Existing Security Prototype (`bot-rust/src/modules/security.rs`)**:
   - `src/modules/security.rs:22-31`: In-memory `Guard` using `OnceLock<Mutex<Guard>>` holding `joins: VecDeque<Instant>` and `lockdown: Option<(Instant, Option<VerificationLevel>)>`.
   - `src/modules/security.rs:79-145`: `on_member_add` kicks incoming users if locked, checks `minAccountAgeDays` from snowflake timestamp, and triggers lockdown if join limit is reached (`raidJoins` in `raidWindowSeconds`).
   - `src/modules/security.rs:33-40, 155-206`: `/verrouillage on|off|statut` slash command.

6. **Database Schema & Migrations (`bot-rust/migrations/`)**:
   - `migrations/0001_initial_schema.sql` defines 7 statements: tables `sanctions`, `appeals`, `tiktok_targets` and 4 indexes.
   - `tests/db_schema_stress_test.rs:75`: Verbatim assertion `assert_eq!(statements.len(), 7);` requiring exactly 7 statements in `0001_initial_schema.sql`.

7. **Test Failure Observation (`tests/adversarial_stress_test.rs:97` & `tests/config_test.rs:39`)**:
   - Tool command: `cargo test`
   - Output:
     ```
     ---- test_stress_env_missing_required_variables stdout ----
     thread 'test_stress_env_missing_required_variables' (1321010) panicked at tests/adversarial_stress_test.rs:97:9:
     Expected failure when DISCORD_TOKEN is ''

     ---- test_config_empty_discord_token_fails stdout ----
     thread 'test_config_empty_discord_token_fails' (1321049) panicked at tests/config_test.rs:39:5:
     Empty DISCORD_TOKEN must cause Config::load() to fail
     ```
   - In `src/config.rs:39`: `dotenvy::from_path("../.env").ok()` loads `/home/leo/Code/Paranoia_New/.env`.
   - `/home/leo/Code/Paranoia_New/.env` contains `DISCORD_BOT_TOKEN="MTU1..."`.
   - When tests empty `DISCORD_TOKEN`, `Config::load()` falls back to `DISCORD_BOT_TOKEN`, so `Config::load()` returns `Ok` instead of `Err`.
   - When run with `DISCORD_BOT_TOKEN="" cargo test --test adversarial_stress_test`, 10 of 10 tests passed.

---

## 2. Logic Chain

1. **Gateway Event Flow**:
   - Observation 2 & 3 show that all gateway events enter `events::handle_event` in `src/events/mod.rs`.
   - `MessageCreate` events pass directly to `automod::check_message` (Observation 3).
   - Therefore, R1 (Anti-Toxicity) and R2 (Media/Message Guard) must hook into `automod::check_message` or be called before message logging/XP dispatching in `handle_event`.
   - `MemberAdd` events pass directly to `modules::security::on_member_add` (Observation 3 & 5).
   - Therefore, R3 (Join-Velocity Anti-Raid) and R4 (Gatekeeper Captcha) integrate directly in `MemberAdd` handling and component interaction routing.

2. **Slash Command & Component Registration**:
   - Observation 4 shows that slash commands and component IDs must be registered in `src/modules/mod.rs:registry()` to be dispatched and synchronized to Discord (`sync_commands`).
   - Therefore, the `/test_message` command for R1 must be declared in `registry()` under `automod` or `moderation` commands, and its name routed in `events/mod.rs:ApplicationCommand`.
   - Interactive button custom IDs for R4 (e.g. `gatekeeper:verify`) must be declared in `registry().components` and routed in `events/mod.rs:MessageComponent`.

3. **Anti-Raid Invariant**:
   - Observation 5 shows `src/modules/security.rs` already maintains join timestamps in `VecDeque<Instant>` and has `/verrouillage`.
   - However, it does not currently store the user IDs of the burst arrivals to kick the initial wave, nor does it adjust `@everyone` channel permission overwrites.
   - Therefore, R3 should upgrade `Guard` to store `VecDeque<(Instant, Id<UserMarker>)>`, kick the burst accounts upon triggering lockdown, and adjust channel permission overwrites for role `@everyone` (`guild_id`).

4. **Persistence & Schema Evolution**:
   - Observation 6 shows `tests/db_schema_stress_test.rs` explicitly checks that `migrations/0001_initial_schema.sql` contains exactly 7 statements.
   - Appending to or modifying `0001_initial_schema.sql` would break `cargo test`.
   - Therefore, R4's `temp_roles` table must be declared in a new migration: `migrations/0002_temp_roles.sql`.
   - Because `sqlx::migrate!("./migrations")` automatically executes all migration files in order, the new table will be created during startup.

5. **Test Suite Hygiene**:
   - Observation 7 proves that `test_config_empty_discord_token_fails` and `test_stress_env_missing_required_variables` fail solely because `../.env` defines `DISCORD_BOT_TOKEN`, which leaks into tests when only `DISCORD_TOKEN` is cleared.
   - Therefore, passing `cargo test` cleanly requires ensuring `DISCORD_BOT_TOKEN` is also sanitized or isolated during config tests.

---

## 3. Caveats

- **External Vision / OCR API**: The repository does not currently bundle a compiled native OCR C-library (e.g. Tesseract). `reqwest` is available in `Cargo.toml`, so OCR/vision scam analysis can run via a configurable HTTP vision endpoint or deterministic heuristic parser in demo mode as requested by `ORIGINAL_REQUEST.md` ("Integrity mode: demo").
- **Voice States & Other Modules**: Voice state modules (`conference`, `temp_voice`, `vocal_roles`) were examined for architecture compatibility but are outside the direct scope of R1-R4.
- **Read-Only Constraint**: In accordance with the Explorer archetype, no source files were modified.

---

## 4. Conclusion

The `bot-rust` architecture provides clean, well-isolated entry points for all four requirements:
- **R1 (Anti-Toxicity & `/test_message`)**: Add `src/modules/toxicity.rs`, integrate into `automod::check_message`, register `/test_message` with `Permissions::MODERATE_MEMBERS`, and return ephemeral diagnostics.
- **R2 (Message & Media Guard)**: Implement OCR/crypto scam scan on `msg.attachments`, regex invite filter, domain typosquatting check, mention guard on `@everyone`/`@here`/protected roles, and sliding-window rate limiter with auto-purge and timeout mute.
- **R3 (Join-Velocity Anti-Raid)**: Enhance `src/modules/security.rs` with member-tracking sliding window, `@everyone` channel permission restriction, and automatic burst wave kick sequence.
- **R4 (Gatekeeper & Temp Decay Roles)**: Create `migrations/0002_temp_roles.sql`, add interactive button captcha handler in `events/mod.rs`, and spawn a persistent tokio background decay worker in `src/main.rs`.
- **Test Integrity**: Resolve test leakage by ensuring `DISCORD_BOT_TOKEN` is cleared alongside `DISCORD_TOKEN` in tests.

---

## 5. Verification Method

1. **Verify Cargo Compilation**:
   ```bash
   cd /home/leo/Code/Paranoia_New/bot-rust
   cargo check
   ```
2. **Verify Existing Database Schema Tests**:
   ```bash
   cargo test --test db_schema_test
   cargo test --test db_schema_stress_test
   cargo test --test json_migration_test
   ```
3. **Verify Config Tests Isolation**:
   ```bash
   DISCORD_BOT_TOKEN="" cargo test --test adversarial_stress_test
   ```
4. **Inspect Analysis Report**:
   ```bash
   cat /home/leo/Code/Paranoia_New/.agents/teamwork/explorer_survey_arch/analysis.md
   ```
