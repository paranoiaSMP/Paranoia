# Architectural Survey & Integration Blueprint for Paranoia SMP Bot (`bot-rust`)

## 1. Executive Summary

The Paranoia SMP Discord bot is an asynchronous, multi-threaded Rust application built with the **Twilight** ecosystem (v0.17) on top of **Tokio** and **SQLx** (PostgreSQL). It connects to Discord via a single gateway shard (`ShardId::ONE`) and handles slash commands, interactive message components (buttons, select menus), modals, and message/guild events.

A key strength of the codebase is its dynamic module system defined in `src/modules/mod.rs`. Modules (`tickets`, `moderation`, `automod`, `security`, `audit`, etc.) register their commands, component prefixes, and configurable settings dynamically into the database, with real-time reload capability driven by PostgreSQL `LISTEN/NOTIFY`.

This survey maps the architectural entry points, shared state conventions, event pipelines, database constraints, and test suite nuances to ensure seamless integration of the upcoming moderation and security modules (**R1** Anti-Toxicity, **R2** Media & Message Guard, **R3** Anti-Raid, **R4** Gatekeeper & Temp Roles).

---

## 2. Dependency Analysis (`Cargo.toml`)

- **Rust Edition**: `2024` (modern idioms, let-chains, standard concurrency primitives).
- **Core Async Runtime**:
  - `tokio = { version = "1.53.1", features = ["full"] }`: Full multi-threaded runtime with timing, signals, and channels.
- **Discord Framework (Twilight v0.17)**:
  - `twilight-gateway = "0.17.1"`: WebSockets gateway connection and event stream.
  - `twilight-http = "0.17.1"`: REST client for interacting with the Discord API.
  - `twilight-model = "0.17.1"`: Strongly-typed models for Discord entities (snowflakes, interactions, embeds, permissions).
  - `twilight-cache-inmemory = "0.17.1"`: In-memory cache support.
  - `twilight-util = { version = "0.17.0", features = ["builder"] }`: Fluent builders for commands, embeds, and permissions.
- **Database**:
  - `sqlx = { version = "0.9.0", features = ["postgres", "runtime-tokio", "tls-rustls", "macros", "chrono", "uuid", "migrate", "json"] }`: Asynchronous PostgreSQL pool and migration runner.
- **Serialization & Data**:
  - `serde = { version = "1.0", features = ["derive"] }` & `serde_json = "1.0"`: JSON serialization/deserialization.
  - `chrono = { version = "0.4", features = ["serde"] }` & `chrono-tz = "0.10"`: Timestamps and duration parsing.
  - `uuid = { version = "1.10", features = ["v4", "serde"] }`: Unique IDs.
- **Utilities**:
  - `regex = "1.11"`: Regular expressions for pattern matching and text normalization.
  - `reqwest = { version = "0.12", features = ["json"] }`: Asynchronous HTTP client (used for web API sync and external endpoints, ideal for OCR/vision analysis).
  - `rand = "0.8"`: Random generation for sanction IDs and tokens.
  - `dotenvy = "0.15.7"`: Environment variable loading.
  - `tracing = "0.1"` & `tracing-subscriber = "0.3"`: Structured logging.
  - `anyhow = "1.0.104"`: Idiomatic application error handling.

---

## 3. Architecture & Entry Point (`src/main.rs`)

### 3.1 Startup Sequence
1. **Tracing**: `tracing_subscriber::fmt()` initializes with `EnvFilter` (default `info`).
2. **Configuration**: `Arc<Config>` is loaded via `Config::load()?` (validates `DISCORD_TOKEN`, `DATABASE_URL`, snowflake IDs, and fallback URLs).
3. **Database Connection**: `db::init_pool_lazy(&config.database_url)?` creates a resilient pool.
   - Runs `db::health_check(&pool)`.
   - If reachable, applies pending migrations (`db::run_migrations(&pool)`) and JSON data migrations (`db::migrate_json_data(&pool)`).
   - If unreachable, enters resilient mode allowing commands that don't depend on DB to run.
4. **Gateway & Shard Initialization**:
   - Intents configured:
     ```rust
     Intents::GUILDS
         | Intents::GUILD_MESSAGES
         | Intents::MESSAGE_CONTENT
         | Intents::GUILD_MEMBERS
         | Intents::GUILD_VOICE_STATES
     ```
     *(Note: `MESSAGE_CONTENT` and `GUILD_MEMBERS` are privileged gateway intents, already declared and active).*
   - `Shard::new(ShardId::ONE, config.discord_token.clone(), intents)`
   - `HttpClient::new(config.discord_token.clone())` wrapped in `Arc`.
5. **Modules & Background Schedulers**:
   - `modules::declare(&pool).await`: Seeds module definitions into `"BotModule"` table.
   - `modules::reload(&pool).await`: Loads active module flags into in-memory `RwLock<State>`.
   - `modules::sync_commands(&http, application.id).await`: Registers slash commands for enabled modules to Discord (guild-scoped if `DISCORD_GUILD_ID` is set, else global).
   - Tokio background tasks spawned:
     - `modules::spawn_watcher`: Postgres `LISTEN bot_modules` loop for hot-reloading configurations.
     - `modules::quiz::spawn_scheduler`: Quiz interval runner.
     - `modules::activity::spawn`: Activity and voice XP tracker.
     - `modules::staff::spawn_absence_sync`: Absence sync.
     - `modules::conference::restore`: Conference voice state restore.
     - TikTok background poller (90-second tick).
6. **Gateway Event Loop**:
   - Loops on `shard.next_event(EventTypeFlags::all()).await`.
   - Spawns an isolated Tokio task per event:
     ```rust
     tokio::spawn(events::handle_event(event, http_clone, pool_clone, config_clone));
     ```
   - Graceful shutdown handled via `tokio::select!` on `tokio::signal::ctrl_c()`, closing the PostgreSQL pool before exiting.

---

## 4. Event Dispatching Pipeline (`src/events/mod.rs`)

`events::handle_event` takes ownership of each `twilight_gateway::Event`:

1. **`Event::MessageCreate(msg)`**:
   - Ignores bot messages (`if msg.author.bot { return; }`).
   - Caches message in `message_log::on_create(&msg)`.
   - Dispatches to modules: XP (`xp::give_xp`), Activity (`activity::count_message`), Drops (`drops::on_message`), Quiz (`quiz::on_message`).
   - Runs Auto-Mod (`automod::check_message(&msg, &http, &db, ...)`). If auto-mod intercepts and deletes the message, it returns `true` and short-circuits.
   - Handles legacy ticket commands (`!close`) and ticket sync to web API.
2. **`Event::InteractionCreate(interaction)`**:
   - **`ApplicationCommand(cmd)`**:
     - Resolves module ownership via `modules::command_owner(&cmd.name)`.
     - Rejects with `reply_disabled` if module is turned off.
     - Matches command name: `"ban"`, `"mute"`, `"kick"`, `"warn"`, `"warnings"`, `"clear"`, `"verrouillage"`, etc.
   - **`MessageComponent(comp)`**:
     - Resolves ownership via `modules::component_owner(&comp.custom_id)`.
     - Routes based on `custom_id` prefixes (e.g. `appeal_open:`, `appeal_staff_accept:`, `ticket_open:`, `cartes:`, `drops:`, etc.).
   - **`ModalSubmit(modal)`**:
     - Routes based on `custom_id` prefix (`modal_appeal:`, `modal_ticket:`, `candidature`, `conference`).
3. **`Event::MemberAdd(ev)`**:
   - Calls `modules::security::on_member_add(&ev, &http, log_channel)`. If security kicks or handles the user, it short-circuits.
   - Otherwise, invokes `audit::handle_member_add` (welcome message and join audit log).
4. **`Event::MemberRemove(ev)`**:
   - Dispatches to `audit::handle_member_remove`.
5. **`Event::MessageUpdate`, `MessageDelete`, `MessageDeleteBulk`**:
   - Dispatched to `modules::message_log` for before/after difference auditing.
6. **`Event::VoiceStateUpdate(vsu)`**:
   - Routes to `activity`, `conference`, `temp_voice`, `audit`, and automatic vocal roles.

---

## 5. Module Registry & Dynamic Configuration (`src/modules/mod.rs`)

The module registry pattern provides a blueprint for integrating any new capability:
- **`ModuleDef`**:
  ```rust
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
  ```
- **In-Memory Global State**:
  - `static STATE: OnceLock<RwLock<State>>` maintains `enabled: HashMap<String, bool>` and `config: HashMap<String, Value>`.
  - Helpers `modules::enabled(id)`, `modules::setting(id, key)`, `modules::setting_number(id, key, default)`.
- **Command & Component Ownership**:
  - `command_owner(name)`: Automatically maps registered command names to their parent module.
  - `component_owner(custom_id)`: Checks `m.components.iter().any(|prefix| custom_id.starts_with(prefix))`.
  - If a module is toggled off in the web admin dashboard, slash commands and interactive buttons instantly reply with ephemeral `reply_disabled`.

---

## 6. Commands, Interactions, & Shared State

### 6.1 Slash Commands
- Constructed with `twilight_util::builder::command::CommandBuilder`.
- Permission enforcement: uses `.default_member_permissions(Permissions::...)` so Discord client enforces required roles/privileges natively.
- Ephemeral replies:
  ```rust
  let response = InteractionResponse {
      kind: InteractionResponseType::ChannelMessageWithSource,
      data: Some(InteractionResponseData {
          content: Some(...),
          embeds: Some(vec![embed]),
          flags: Some(MessageFlags::EPHEMERAL),
          components: Some(vec![...]),
          ..Default::default()
      }),
  };
  http.interaction(interaction.application_id)
      .create_response(interaction.id, &interaction.token, &response)
      .await?;
  ```

### 6.2 Modals & Buttons
- Inputs extracted cleanly with helper `crate::utils::extract_modal_inputs(&modal.components)` returning `Vec<(String, String)>`.
- Buttons created with `twilight_model::channel::message::component::Button` wrapped in `Component::ActionRow`.

### 6.3 Shared State Conventions
- Read-heavy or high-frequency states use `OnceLock<Mutex<T>>` or `OnceLock<RwLock<T>>` (e.g. `modules::security::guard()`, `message_log::store()`).
- Database handles (`sqlx::PgPool`) and HTTP clients (`twilight_http::Client`) are wrapped in `Arc` or cloned directly.

---

## 7. Database & Migrations

### 7.1 PostgreSQL Migrations via SQLx
- File location: `bot-rust/migrations/`.
- Existing migration: `0001_initial_schema.sql` creates:
  - `sanctions` (`id VARCHAR(6) PRIMARY KEY`, `guild_id`, `user_id`, `mod_id`, `sanction_type`, `duration`, `reason`, `created_at`, `appealed`)
  - `appeals` (`id TEXT PRIMARY KEY`, `sanction_id VARCHAR(6) REFERENCES sanctions(id)`, `pseudo_mc`, `arguments`, `status`, `created_at`)
  - `tiktok_targets` (`username TEXT PRIMARY KEY`, `channel_id`, `role_id`, `last_video_id`, `is_live`)
  - Indexes: `idx_sanctions_user`, `idx_sanctions_guild_user`, `idx_appeals_sanction_id`, `idx_appeals_status`.

### 7.2 Strict Schema Invariant Discovered
- `tests/db_schema_stress_test.rs` line 75 strictly asserts:
  ```rust
  assert_eq!(statements.len(), 7);
  ```
  **Rule**: `0001_initial_schema.sql` must remain exactly 7 statements. Any new tables (such as `temp_roles`) **must** be created in a new migration file: `migrations/0002_moderation_security_suite.sql`.
- All statements must include `IF NOT EXISTS` for idempotent execution.

---

## 8. Test Suite Analysis & Root-Cause Discovery

### 8.1 Test Inventory
- `src/modules/conference.rs`: 2 unit tests (embed string length limits).
- `src/modules/quiz.rs`: 3 unit tests (answer matching, accents, word parsing).
- `tests/config_test.rs`: 9 integration tests for configuration parsing and normalization.
- `tests/adversarial_stress_test.rs`: 10 integration tests for stress parsing of JSON, snowflakes, and malformed inputs.
- `tests/db_schema_test.rs` & `tests/db_schema_stress_test.rs`: 14 tests validating table definitions, foreign keys, and indexes.
- `tests/json_migration_test.rs`: 7 tests validating JSON migration parsing and idempotency.

### 8.2 Root Cause of Current `cargo test` Failure
When running plain `cargo test`, two tests fail:
- `test_config_empty_discord_token_fails` (`tests/config_test.rs`)
- `test_stress_env_missing_required_variables` (`tests/adversarial_stress_test.rs`)

**Root Cause**:
In `src/config.rs:37-43`:
```rust
pub fn load() -> Result<Self> {
    dotenvy::dotenv().ok();
    dotenvy::from_path("../.env").ok();

    let discord_token = get_clean_var("DISCORD_TOKEN")
        .or_else(|| get_clean_var("DISCORD_BOT_TOKEN"))
        .context("DISCORD_TOKEN ou DISCORD_BOT_TOKEN manquant")?;
```
1. The repository root contains `/home/leo/Code/Paranoia_New/.env`, which sets `DISCORD_BOT_TOKEN="MTU1..."`.
2. When the tests run, they set `env::set_var("DISCORD_TOKEN", "")`, but do not modify `DISCORD_BOT_TOKEN`.
3. `Config::load()` reads `../.env` via `dotenvy::from_path("../.env")`, populating `DISCORD_BOT_TOKEN`.
4. As a result, `get_clean_var("DISCORD_TOKEN")` returns `None`, but `.or_else(|| get_clean_var("DISCORD_BOT_TOKEN"))` succeeds by finding `DISCORD_BOT_TOKEN`.
5. Therefore, `Config::load()` returns `Ok` instead of `Err`, failing the assertion.

**Verification**:
Setting `DISCORD_BOT_TOKEN=""` during testing resolves the leak, allowing `test_stress_env_missing_required_variables` and `test_config_empty_discord_token_fails` to pass. Both `config.rs` and the tests should ensure test isolation without relying on local `.env` values.

---

## 9. Integration Blueprint for Moderation & Security Suite (R1–R4)

```
                    +-------------------------------------+
                    |       Twilight Gateway Event        |
                    +-------------------------------------+
                                       |
                +----------------------+----------------------+
                |                                             |
        [MessageCreate]                                  [MemberAdd]
                |                                             |
    +-----------v-----------+                     +-----------v-----------+
    | automod::check_message|                     | security::on_member   |
    +-----------+-----------+                     +-----------+-----------+
                |                                             |
  +-------------+-------------+                  +------------+------------+
  |                           |                  |                         |
[R1: Anti-Toxicity]   [R2: Media/Msg Guard]   [R3: Anti-Raid]       [R4: Gatekeeper]
- Leetspeak unmasking - OCR & Anti-Scam       - Join velocity       - Button captcha
- Contextual model    - Anti-Phishing/Invite  - Auto-lockdown       - Assign @Nouveau
- /test_message cmd   - Mention guard         - Auto-kick wave      - Store temp_roles
                      - Anti-Flood window                           |
                                                                    v
                                                            [R4: Decay Worker]
                                                            - Tokio background
                                                            - SELECT expired
                                                            - Strip @Nouveau
```

### 9.1 R1: Contextual Anti-Toxicity & Anti-Bypass Engine
- **Module Structure**: Create `src/modules/toxicity.rs` (or extend `src/events/automod.rs`).
- **Leetspeak & Normalization Engine**:
  - Substitution mapping table:
    - `0` -> `o`, `1` / `!` / `|` -> `i`, `3` -> `e`, `4` / `@` -> `a`, `5` / `$` -> `s`, `7` -> `t`, `8` -> `b`.
  - Invisible character removal: strip zero-width characters (`\u{200B}`, `\u{200C}`, `\u{200D}`, `\u{FEFF}`).
  - Homoglyph normalization: normalize lookalike Cyrillic/Greek characters to ASCII.
  - Spacing/Punctuation collapse: normalize `f.d.p`, `f-d-p`, `f d p` into `fdp`.
  - Abbreviation expansion: handle common abbreviations.
- **Contextual Classifier**:
  - Distinguish between **targeted attacks** vs. **generic gaming frustration**:
    - Second-person pronouns & direct targets: `"t'es"`, `"tu es"`, `"toi"`, `"t un"`, `<@id>`, `"sale..."`.
    - Frustration markers: `"putain"`, `"fait chier"`, `"je lag"`, `"merde"`, `"jeu cassé"`.
  - Returns classification struct:
    ```rust
    pub struct ToxicityVerdict {
        pub raw: String,
        pub normalized: String,
        pub is_toxic: bool,
        pub is_targeted: bool,
        pub score: f32, // 0.0 to 1.0
        pub target: Option<String>,
        pub reasons: Vec<String>,
    }
    ```
- **Slash Command `/test_message`**:
  - Registered under `moderation` or `automod` module with `Permissions::MODERATE_MEMBERS`.
  - Input option: `message` (String).
  - Responds ephemerally with diagnostic Embed displaying:
    - Verdict: `✅ Propre` / `⚠️ Frustration de jeu (toléré)` / `🚨 Harcèlement ciblé`
    - Target detected: `Oui (<cible>)` / `Non`
    - Unmasked/Normalized text
    - Toxicity score (percentage / confidence)
    - Clarification: *"Mode diagnostic : aucune sanction appliquée."*

### 9.2 R2: Message & Media Guard (OCR & Anti-Scam)
- **Module Structure**: Integrate in `src/modules/guard.rs` or `src/events/automod.rs`.
- **Image Attachment OCR & Scam Detection**:
  - Checks `msg.attachments` for image content types (`image/png`, `image/jpeg`, `image/webp`).
  - Implements image text extraction (supporting local heuristic extraction and external vision API call via `reqwest`).
  - Scans for crypto/casino giveaway and unauthorized withdrawal patterns:
    - `"crypto giveaway"`, `"promo code"`, `"deposit ... get ..."`, `"free nitro"`, `"airdrop"`, `"claim bonus"`, `"withdrawal pending"`, `"telegram"`.
  - Action: deletes image message, notifies user, dispatches alert embed to audit channel with attachment preview.
- **Anti-Phishing & Invite Interception**:
  - Regex for Discord invites: `(?:discord\.gg|discord(?:app)?\.com/invite)/([a-zA-Z0-9\-]+)`.
  - Compares against whitelist (e.g. guild's own invite or configured safe invites).
  - Phishing domain heuristics: typosquatting domains (`discorcl`, `dlscord`, `steamcommunlty`, `gift-nitro`).
  - Action: immediate message deletion, user warning, audit logging.
- **Anti-Unauthorized Mentions**:
  - Detects `@everyone`, `@here`, or protected roles (such as `config.role_staff_id`).
  - Checks member roles: if non-staff, deletes message and warns author.
- **Sliding-Window Anti-Flood Rate Limiting**:
  - In-memory tracker per user:
    ```rust
    struct FloodTracker {
        history: HashMap<u64, VecDeque<Instant>>,
    }
    ```
  - Configurable parameters: e.g. threshold = 5 messages within 3 seconds.
  - When triggered:
    - Automatically purges recent messages from the user in that channel (`http.delete_messages`).
    - Issues Discord timeout sanction (e.g. 10m communication disable) via `http.update_guild_member(guild_id, user_id).communication_disabled_until(...)`.
    - Inserts sanction into `sanctions` table and logs event to audit channel.

### 9.3 R3: Join-Velocity Anti-Raid Engine
- **Module Structure**: Enhance existing `src/modules/security.rs`.
- **Real-Time Velocity Monitor**:
  - Expand `Guard`:
    ```rust
    struct RaidGuard {
        joins: VecDeque<(Instant, Id<UserMarker>)>,
        lockdown: Option<LockdownState>,
    }
    ```
  - Tracks incoming member IDs alongside timestamps in `on_member_add`.
  - Condition: join count exceeding threshold in sliding window (e.g. >10 joins in 5 seconds).
- **Automated Lockdown Execution**:
  - Guild verification level set to `VerificationLevel::VeryHigh`.
  - **Permission Restriction on `@everyone`**:
    - Fetches guild public text channels.
    - Sets permission overwrites denying `Permissions::SEND_MESSAGES` for `@everyone` (role ID = `guild_id.get()`).
  - **Raid Wave Account Kick**:
    - Automatically kicks all accounts stored in the burst window (`http.remove_guild_member`).
    - DMs kicked accounts: *"Le serveur est en verrouillage d'urgence anti-raid. Réessayez plus tard."*
  - All subsequent joins while `lockdown.is_some()` are automatically kicked.
  - Posts prominent alert in audit log channel with wave size, duration, and kick summary.
- **Command Integration**:
  - `/verrouillage on|off|statut` updated to inspect and control channel permissions and report raid metrics.

### 9.4 R4: Gatekeeper Verification & Temporary Decay Roles
- **Module Structure**: Create `src/modules/gatekeeper.rs`.
- **Interactive Button Captcha**:
  - Deploys verification message with button (`custom_id = "gatekeeper:verify"`).
  - Upon click, opens ephemeral challenge (button math challenge or modal code).
  - On correct completion:
    - Grants base member role.
    - Assigns temporary decay role (`@Nouveau` / newbie role).
    - Stores record in database `temp_roles`.
    - Responds ephemerally: *"Vérification réussie ! Bienvenue sur le serveur."*
- **Database Schema Migration**:
  - Create file: `bot-rust/migrations/0002_temp_roles.sql`:
    ```sql
    CREATE TABLE IF NOT EXISTS temp_roles (
        id BIGSERIAL PRIMARY KEY,
        guild_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        role_id BIGINT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_temp_roles_expires ON temp_roles(expires_at);
    CREATE INDEX IF NOT EXISTS idx_temp_roles_guild_user ON temp_roles(guild_id, user_id);
    ```
- **Persistent Role Decay Background Worker**:
  - Function: `pub fn spawn_decay_worker(http: Arc<HttpClient>, pool: PgPool)`
  - Spawned in `src/main.rs`.
  - Runs on a periodic timer (e.g. every 30 seconds):
    ```rust
    let expired = sqlx::query!(
        "SELECT id, guild_id, user_id, role_id FROM temp_roles WHERE expires_at <= NOW() LIMIT 100"
    ).fetch_all(&pool).await?;

    for row in expired {
        let _ = http.remove_guild_member_role(
            Id::new(row.guild_id as u64),
            Id::new(row.user_id as u64),
            Id::new(row.role_id as u64)
        ).await;

        sqlx::query!("DELETE FROM temp_roles WHERE id = $1", row.id)
            .execute(&pool)
            .await?;
    }
    ```
  - Ensures role expiration survives bot crashes and restarts.

---

## 10. Antislop & Clean Code Guidelines

To uphold the highest code quality across the bot:
1. **Meaningful Error Context**: Use `anyhow::Context` with explanatory messages rather than bare `.unwrap()` or vague `format!("{e}")`.
2. **No Placeholders**: Every branch must either execute complete logic or purposefully log/return; avoid `todo!()` or `// implement later`.
3. **Idiomatic Rust**: Prefer match statements, iterators (`filter_map`, `fold`), let-chains, and `OnceLock` over unsafe globals or redundant clones.
4. **Clean Comments**: Comments should clarify subtle protocol requirements (e.g. snowflake bit shifts or Discord rate limit timings), omitting self-evident code narrations.
