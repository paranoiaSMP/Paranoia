# Project: Paranoia SMP Discord Bot Moderation & Security Suite

## Architecture
The Paranoia SMP Discord bot is written in idiomatic Rust (edition 2024) using Tokio 1.53, Twilight 0.17 (`twilight-gateway`, `twilight-http`, `twilight-model`, `twilight-util`, `twilight-cache-inmemory`), and SQLx 0.9.0 with PostgreSQL.

The security and moderation suite is architected around modular components hooked into Twilight's gateway event dispatch loop:
1. **Event Dispatch Loop (`src/events/mod.rs`)**:
   - `Event::MessageCreate`: Invokes `automod::check_message` which evaluates R1 (Anti-Toxicity & Anti-Bypass) and R2 (Media/Scam OCR, Phishing/Link Interception, Mention Guard, Anti-Flood).
   - `Event::InteractionCreate`:
     - `ApplicationCommand`: Dispatches slash commands including `/test_message` (R1) and `/verrouillage` (R3).
     - `MessageComponent`: Dispatches custom component IDs including `gatekeeper:verify` (R4 interactive button captcha).
   - `Event::MemberAdd`: Invokes `modules::security::on_member_add` which executes R3 (Anti-Raid join velocity evaluation) and sends R4 (Gatekeeper captcha prompt).
2. **Background Workers (`src/main.rs`)**:
   - Spawns persistent tokio background tasks including `temp_role_decay_worker` (ticking every 30 seconds against PostgreSQL `temp_roles`).
3. **Database Schema (`migrations/`)**:
   - `0001_initial_schema.sql` (fixed at 7 statements to satisfy schema stress tests).
   - `0002_temp_roles.sql` (adds `temp_roles` for temporary decay role persistence).

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Leetspeak & Homoglyph Normalization | Normalize leetspeak substitutions (4->a, 0->o, 3->e, 7->t), Cyrillic/Greek homoglyphs, repeated chars, punctuation stripping, toxic abbreviations | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Contextual Toxicity Classification | Classify messages to distinguish targeted harassment directed at players from gaming frustration (mobs/deaths) or friendly banter | M1 | ORIGINAL_REQUEST §R1 |
| 3 | `/test_message` Slash Command | Ephemeral diagnostics command returning verdict, target detected, unmasked text, confidence score without applying sanctions | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Media & OCR Scam Detection | Scan image attachments using OCR/vision pattern matching for crypto/casino/giveaway/promo code/unauthorized withdrawal scams | M2 | ORIGINAL_REQUEST §R2 |
| 5 | Link & Phishing Interception | Detect and intercept phishing domains, typosquats, and unauthorized Discord invites while allowing whitelisted domains | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Anti-Unauthorized Mentions | Intercept and purge unauthorized `@everyone`, `@here`, protected staff roles, and mass pings with automatic timeout | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Sliding-Window Burst Anti-Flood | Per-user sliding-window rate limiter with automatic message purge and timeout sanctions | M2 | ORIGINAL_REQUEST §R2 |
| 8 | Join-Velocity Anti-Raid Engine | Real-time sliding window tracking `(Instant, UserId)` to detect burst joins (>10 joins in 5s) and trigger guild lockdown | M3 | ORIGINAL_REQUEST §R3 |
| 9 | Channel Permission Restriction & Kick Sequence | Restrict `@everyone` channel permission overwrites during lockdown and automatically kick suspect raid wave accounts | M3 | ORIGINAL_REQUEST §R3 |
| 10 | Interactive Gatekeeper Captcha | Button captcha challenge with randomized button/emoji arrangement for new arrivals before granting member access | M4 | ORIGINAL_REQUEST §R4 |
| 11 | Persistent Temporary Role Decay | PostgreSQL-backed temporary decay roles (`temp_roles`) with persistent background worker removing expired roles | M4 | ORIGINAL_REQUEST §R4 |
| 12 | End-to-End Test Suite & Verification | Pass `cargo check` and `cargo test` across all unit and integration tests, fix config test env leak, ensure antislop hygiene | M5 | ORIGINAL_REQUEST §Acceptance Criteria |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Contextual Anti-Toxicity & Anti-Bypass Engine | R1: Leetspeak unmasking, contextual classifier (frustration vs banter vs harassment), `/test_message` slash command | None | DONE |
| M2 | Message & Media Guard (OCR, Anti-Scam, Anti-Flood) | R2: Pluggable OCR vision scam detector, link/phishing filter, unauthorized mention guard, sliding-window anti-flood | M1 | DONE |
| M3 | Anti-Raid Join-Velocity Engine | R3: Real-time join velocity tracking with member IDs, auto-kick of raid burst wave, `@everyone` channel permission lockdown & restoration | None | PLANNED |
| M4 | Gatekeeper Verification & Temporary Decay Roles | R4: Interactive button captcha gatekeeper, `migrations/0002_temp_roles.sql`, persistent 30s background role decay worker | None | PLANNED |
| M5 | E2E Integration Testing & Hardening | Full system integration, comprehensive unit/E2E tests, config test isolation fix, cargo check/test pass | M1, M2, M3, M4 | PLANNED |

---

## Interface Contracts

### M1: Toxicity & Leetspeak
```rust
pub enum TargetKind {
    None,
    GameObject,
    SecondPersonPronoun,
    ExplicitUserMention,
    ReplyTarget,
}

pub enum ToxicityCategory {
    Clean,
    GamingFrustration,
    FriendlyBanter,
    Harassment,
    SevereToxicity,
}

pub struct ToxicityVerdict {
    pub category: ToxicityCategory,
    pub is_toxic: bool,
    pub score: f32,
    pub target: TargetKind,
    pub normalized_text: String,
    pub detected_words: Vec<String>,
}

pub fn unmask_leetspeak(input: &str) -> String;
pub fn classify_toxicity(content: &str, mentions: &[Id<UserMarker>]) -> ToxicityVerdict;
```

### M2: Message & Media Guard
```rust
#[async_trait::async_trait]
pub trait VisionOcrEngine: Send + Sync {
    async fn scan_image(&self, url: &str) -> anyhow::Result<String>;
}

pub enum ScamVerdict {
    Clean,
    CryptoCasinoScam { reason: String, confidence: f32 },
}

pub enum LinkVerdict {
    Allowed,
    Phishing { domain: String },
    UnauthorizedInvite { code: String },
}

pub enum FloodAction {
    Allow,
    PurgeAndTimeout { message_ids: Vec<Id<MessageMarker>>, duration_seconds: u64 },
}

pub struct AntiFloodTracker { ... }
impl AntiFloodTracker {
    pub fn record_and_evaluate(&mut self, user_id: Id<UserMarker>, message_id: Id<MessageMarker>, content: &str, now: Instant) -> FloodAction;
}
```

### M3: Anti-Raid & Security
```rust
pub struct JoinRecord {
    pub user_id: Id<UserMarker>,
    pub joined_at: Instant,
}

pub enum JoinDecision {
    Allow,
    TriggerLockdown { suspect_user_ids: Vec<Id<UserMarker>>, reason: String },
    KickRaidMember { user_id: Id<UserMarker> },
}

pub struct GuildRaidState { ... }
impl GuildRaidState {
    pub fn evaluate_join(&mut self, user_id: Id<UserMarker>, now: Instant) -> JoinDecision;
}
```

### M4: Gatekeeper & Temp Roles
```rust
pub struct CaptchaChallenge {
    pub user_id: Id<UserMarker>,
    pub prompt: String,
    pub correct_token: String,
    pub options: Vec<(String, String)>, // (label, token)
}

pub struct TempRoleDecayRecord {
    pub id: i64,
    pub guild_id: i64,
    pub user_id: i64,
    pub role_id: i64,
    pub expires_at: chrono::DateTime<chrono::Utc>,
}
```

---

## Code Layout
- `bot-rust/src/modules/automod/`: AutoMod modular suite
  - `mod.rs`: AutoMod module entry point, setting definitions, dispatcher
  - `leetspeak.rs`: Leetspeak, Cyrillic/Greek homoglyphs, repeated char normalization
  - `toxicity.rs`: Contextual toxicity engine, target extraction, banter/frustration scoring
  - `command.rs`: `/test_message` slash command handler
  - `media.rs`: OCR vision scanner & crypto/casino scam pattern detection
  - `links.rs`: Link whitelist, phishing domain detector, unauthorized invite filter
  - `mentions.rs`: Unauthorized `@everyone`/`@here`/role mention guard
  - `flood.rs`: Sliding-window anti-flood message tracker & purge logic
- `bot-rust/src/modules/security.rs`: Anti-raid join velocity, raid wave kick, channel permission restriction & restore
- `bot-rust/src/modules/gatekeeper.rs`: Interactive button captcha generator & verification handler
- `bot-rust/src/modules/temp_roles.rs`: Temporary role assignment and decay queries
- `bot-rust/migrations/0002_temp_roles.sql`: SQLx migration for temporary decay roles
- `bot-rust/tests/`: Integration tests for all requirements
