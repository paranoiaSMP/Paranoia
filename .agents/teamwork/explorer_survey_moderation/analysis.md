# Analysis: Moderation Survey (R1 & R2)

**Author:** Moderation Survey Explorer  
**Date:** 2026-10-14  
**Target Codebase:** `/home/leo/Code/Paranoia_New/bot-rust`  
**Reference Document:** `/home/leo/Code/Paranoia_New/.agents/teamwork/ORIGINAL_REQUEST.md`  

---

## 1. Executive Summary

This report surveys the technical requirements, existing implementation, and proposed architecture for:
- **R1: Contextual Anti-Toxicity & Anti-Bypass Engine** (Leetspeak unmasking, confusable normalization, contextual harassment vs gaming frustration vs banter classification, and the `/test_message` diagnostic slash command).
- **R2: Message & Media Guard** (OCR/vision scam screenshot detection, phishing & unauthorized invite interception, anti-unauthorized mentions, and sliding-window burst anti-flood with purge and timeout).

The `bot-rust` codebase is built on **Twilight 0.17** (`twilight-gateway`, `twilight-http`, `twilight-model`, `twilight-util`, `twilight-cache-inmemory`) with **PostgreSQL / SQLx 0.9**, asynchronous runtime **Tokio 1.53**, and **Regex 1.11**. The current moderation logic is minimal (a simple hardcoded bad-words slice in `src/events/automod.rs`), leaving a clean canvas for a modular, zero-slop, high-performance moderation engine.

---

## 2. Existing Codebase Survey

### 2.1 Dependencies & Capabilities (`Cargo.toml`)
- `regex = "1.11"`: Available and already a dependency in `Cargo.toml`, though currently unused in `src/`. Ready for immediate use with pre-compiled `LazyLock` / `OnceLock` regular expressions.
- `reqwest = { version = "0.12", features = ["json"] }`: Configured for JSON API calls (currently used for support ticket web synchronization). Suitable for external OCR/Vision endpoints (e.g. Gemini Vision API).
- `chrono = { version = "0.4", features = ["serde"] }`: Available for timestamp arithmetic and duration parsing (`parse_duration`).
- `twilight-model = "0.17.1"`: Provides strong types for `Message`, `Attachment`, `Interaction`, `Timestamp`, `Permissions`, and snowflake IDs (`Id<UserMarker>`, `Id<ChannelMarker>`, `Id<GuildMarker>`, `Id<RoleMarker>`, `Id<MessageMarker>`).
- `twilight-http = "0.17.1"`: Supports `delete_message`, `delete_messages` (bulk delete for anti-flood purge), `update_guild_member` with `communication_disabled_until` (timeouts), and `create_response` (ephemeral slash command responses).
- `twilight-util = { version = "0.17.0", features = ["builder"] }`: Builders for slash commands (`CommandBuilder`, `StringBuilder`) and embeds (`EmbedBuilder`, `EmbedFieldBuilder`).

### 2.2 Current Moderation Logic (`src/events/automod.rs`)
In `src/events/automod.rs` (lines 6–44):
- Contains a static slice `const BAD_WORDS: &[&str] = &["fdp", "connard", "salope", "tg", "ta gueule", "pute", "ntm", "negre"];`.
- Checks `content.to_lowercase().contains(w)`.
- Calculates uppercase character ratio (`uppercase_count as f32 / total_chars as f32 > 0.7`).
- Deletes message, sends a public warning in the channel, and posts a plain message to `audit_channel`.
- **Deficiencies Identified**:
  - Easily bypassed via leetspeak (`f.d.p`, `c0nnard`, `s4lope`, `t-g`), Cyrillic homoglyphs (`сonnard` with Cyrillic `с`), or character elongation (`coooonnnnard`).
  - No contextual intelligence: false-flags gaming frustration ("fait chier ce creeper") and innocent banter ("mdr t'es con gg").
  - Lacks image scanning, link filtering, mention limits, and sliding-window rate limiting.
  - Hardcoded words and logic with no slash command diagnostics.

### 2.3 Module & Setting Architecture (`src/modules/mod.rs`)
The bot features a modular registry system:
- `ModuleDef` defines `id`, `name`, `description`, `category`, `default_enabled`, `legacy_column`, `commands: fn() -> Vec<Command>`, `components: &'static [&'static str]`, and `settings: &'static [Setting]`.
- Existing `automod` module:
  - `id: "automod"`, `category: "Modération"`, `default_enabled: false`.
  - Currently has `commands: none`, `components: &[]`, `settings: &[]`.
- Dynamically configurable via `setting(id, key)` and `setting_number(id, key, default)`.
- Automatically registered in the `BotModule` PostgreSQL table on startup.

### 2.4 Event Dispatch Flow (`src/events/mod.rs`)
In `src/events/mod.rs` (lines 24–41):
- `Event::MessageCreate(msg)` receives every message.
- If `msg.author.bot` is true, returns early.
- Currently calls `automod::check_message(&msg, &http, &db, Some(config.ticket_log_channel_id)).await`. If it returns `true`, message handling halts (no XP, drops, or ticket sync triggered).

---

## 3. R1: Contextual Anti-Toxicity & Anti-Bypass Design

### 3.1 Normalization & Unmasking Pipeline

To defeat intentional bypass attempts, the text must undergo a multi-pass normalization pipeline before any token or phrase matching:

```
Raw Discord Message Content
           │
           ▼
[Pass 1: Unicode Normalization & Homoglyph Unconfusing]
  - Convert Cyrillic/Greek lookalikes to Latin (e.g., а->a, с->c, е->e, о->o, р->p, х->x)
  - NFKD decomposition to strip combining diacritical marks (e.g., é, è, ê, ç -> e, e, e, c)
           │
           ▼
[Pass 2: Zero-Width & Separator Noise Stripping]
  - Remove zero-width spaces (\u{200B}, \u{200C}, \u{200D}, \u{FEFF}, \u{00AD})
  - Identify interstitial punctuation bypasses (e.g., f.d.p, f-d-p, f_d_p, f*d*p, s a l o p e)
           │
           ▼
[Pass 3: Leetspeak Substitutions]
  - Multi-character patterns (e.g., /\\ -> a, |3 -> b, |< -> k, |_ -> l, |\\| -> n, \\/\\/ -> w)
  - Single-character digit/symbol mapping:
      '4' -> 'a', '@' -> 'a', '^' -> 'a'
      '8' -> 'b'
      '3' -> 'e', '€' -> 'e'
      '0' -> 'o'
      '1' -> 'i', '!' -> 'i', '|' -> 'i'
      '7' -> 't', '+' -> 't'
      '5' -> 's', '$' -> 's'
      '9' -> 'g'
      '2' -> 'z'
           │
           ▼
[Pass 4: Character Elongation Collapse]
  - Collapse 3+ identical consecutive characters down to single/double instances
    (e.g., "cooooonnnnaaaard" -> "connard", "fuuuuck" -> "fuck")
           │
           ▼
[Pass 5: Acronym & Abbreviation Expansion]
  - Expand toxic shorthand tokens:
    "fdp" -> [TOXIC_ACRONYM: fdp / fils de pute]
    "ntm" -> [TOXIC_ACRONYM: ntm / nique ta mere]
    "tg"  -> [TOXIC_ACRONYM: tg / ta gueule]
    "kys" -> [TOXIC_ACRONYM: kys / kill yourself]
    "stfu"-> [TOXIC_ACRONYM: stfu / shut the fuck up]
  - Extract humor/banter tokens: "mdr", "ptdr", "lol", "xd", "xdd", "haha", "gg", "wp", "😂", "🤣"
```

### 3.2 Contextual Classification Model

Distinguishing between targeted harassment, gaming frustration, and friendly banter requires combining **Entity/Target Extraction** with **Intent & Tone Analysis**:

#### Target Extraction Dimensions:
1. **Direct User Mentions**: `<@id>`, `<@!id>`.
2. **Grammatical Second-Person Pronouns**:
   - French: `tu `, `t'`, `toi`, `ton`, `ta `, `tes`, `vous`, `votre`, `vos`, `t es`, `t'es`, `es-tu`, `va te`, `jte`, `je te`.
   - English: `you `, `ur `, `you're`, `your`, `u `, `yourself`.
3. **Discord Reply Context**: Message replying to another user (`msg.referenced_message.is_some()`). If a user replies with "sale fdp" without tagging, the target is the author of the referenced message.
4. **Game Objects & Environment**:
   - Minecraft Mobs: `creeper`, `zombie`, `skeleton`, `squelette`, `enderman`, `warden`, `dragon`, `wither`, `boss`, `mob`, `araignee`.
   - Mechanics/World: `lave`, `feu`, `chute`, `diamant`, `stuff`, `base`, `coffre`, `pioche`, `mort`, `die`, `fall damage`, `lag`, `ping`, `crash`, `serveur`, `chunk`, `rollback`.

#### Classification Matrix:
| Category | Toxic/Profane Words | Target Detected | Humor/Banter Markers | Action |
|---|---|---|---|---|
| **Clean** | None | Irrelevant | Irrelevant | Allow message |
| **GamingFrustration** | Profanity detected (`merde`, `putain`, `chier`) | Game object / Self / Abstract | Optional | Allow message (or log as low priority) |
| **FriendlyBanter** | Mild swear / light insult (`nul`, `con`, `noob`) | Second-person / Mention | High (`mdr`, `lol`, `gg`, `😂`, `haha`) | Allow message |
| **Harassment** | Severe insult / toxic acronym (`fdp`, `connard`, `tg`) | Second-person / User Mention / Reply | Low / Absent | Delete + Warning / Timeout |
| **SevereToxicity** | Hate speech, racial slurs, death threats (`kys`, `crève`) | Any or none (zero tolerance) | Irrelevant | Delete + Immediate Timeout + Staff Alert |

### 3.3 Slash Command `/test_message`

**Signature & Options:**
- Name: `test_message`
- Description: `Diagnostiquer un message avec le moteur anti-toxicité (sans sanction)`
- Default Permissions: `Permissions::MODERATE_MEMBERS`
- Options:
  - `message`: `StringBuilder::new("message", "Contenu du message à tester").required(true)`

**Diagnostic Response (Ephemeral Embed):**
- **Embed Color**:
  - `0x22c55e` (Green) for Clean / FriendlyBanter
  - `0xfacc15` (Yellow) for GamingFrustration
  - `0xef4444` (Red) for Harassment / SevereToxicity
- **Fields**:
  - `Verdict`: Enum display (`Clean`, `GamingFrustration`, `FriendlyBanter`, `Harassment`, `SevereToxicity`).
  - `Score`: Confidence score formatted as `0.00` – `1.00`.
  - `Cible Détectée`: Details of identified target (`Aucune`, `<@USER_ID>`, `Deuxième personne (tu / t'es)`, or `Jeu: creeper`).
  - `Texte Démasqué`: Normalized leetspeak output in code block.
  - `Mots & Abréviations`: Matched patterns and expanded acronyms.
- **Guarantee**: Read-only diagnostics; no database sanctions, member timeouts, or message deletions are triggered.

---

## 4. R2: Message & Media Guard Design

### 4.1 OCR / Vision Scam Screenshot Detection

#### Attack Vector:
Scammers bypass text filters by uploading image screenshots (PNG/JPEG/WebP) promoting crypto giveaways, casino/gambling bonus codes, fake Nitro promotions, or fraudulent withdrawal balance notifications.

#### Pluggable Architecture:
```rust
#[async_trait::async_trait]
pub trait VisionOcrEngine: Send + Sync {
    async fn extract_text(&self, image_url: &str) -> anyhow::Result<String>;
}
```
1. **Production Engine**: External Vision API (e.g. Google Gemini 2.0/1.5 Flash via `reqwest`) utilizing high-accuracy multimodal visual understanding with ~400ms latency.
2. **Local/Deterministic Fallback Engine**: Embedded regex scanner on image metadata or fast heuristic scanner.
3. **Mock Engine**: In-memory mock for unit tests (`cargo test`) returning configured scam transcripts without external network dependencies.

#### Scam Pattern Matrix:
- **Crypto Scams**: `(?i)(giveaway|bonus|airdrop|claim|deposit|withdraw)\s*(?:of|:)?\s*(\$?\d+[\d,.]*\s*(?:btc|eth|sol|usdt|\$))`, `(?i)(crypto|bitcoin|ethereum|binance)\s*(gift|giveaway|promo|voucher)`.
- **Casino / Gambling Scams**: `(?i)(free\s*spins|deposit\s*bonus|promocode|claim\s*\$\d+|rollbit|stake\.com|csgoluck)`.
- **Fake Nitro & Steam**: `(?i)(free\s*nitro|nitro\s*generator|steam\s*gift|claim\s*nitro)`.
- **Urgent Action / Phishing**: `(?i)(promo\s*code|voucher\s*code|use\s*code)\s*:\s*([A-Z0-9_\-]{4,16})`, `(?i)(unauthorized\s*withdrawal|account\s*suspended|hurry\s*up|limited\s*time)`.

#### Sanction & Alert:
When scam confidence exceeds `0.80`:
1. Message deleted immediately (`http.delete_message`).
2. User timed out for 1 hour (`http.update_guild_member` with `communication_disabled_until`).
3. Embed alert sent to audit log channel with extracted text snippet, scam category, and attachment URL.

### 4.2 Phishing & Link Interception

#### Interception Pipeline:
1. **Extract all URLs**: Using URL regex `(?i)https?://[^\s/$.?#].[^\s]*`.
2. **Canonicalize Domain**: Strip scheme, port, query strings, and path. Lowercase and normalize IDN/punycode homoglyphs.
3. **Whitelist Check**:
   - Authorized Project Domains: `paranoia-mc.fr`, `paranoia.studio`, `paranoiasmp.fr`.
   - Streaming/Video: `youtube.com`, `youtu.be`, `twitch.tv`, `tiktok.com`.
   - Platforms: `github.com`, `gitlab.com`, `twitter.com`, `x.com`, `reddit.com`, `minecraft.net`, `curseforge.com`, `modrinth.com`.
   - Media: `tenor.com`, `giphy.com`, `imgur.com`.
4. **Phishing & Lookalike Detection**:
   - Discord typosquatting: domains containing `dlscord`, `discoord`, `disbord-`, `discord-nitro`, `nitro-discord`, `discord-gift`.
   - Steam typosquatting: `steamcomminuty`, `steamcommunity-trade`.
5. **Discord Invite Enforcement**:
   - Match regex `(?i)(?:https?://)?(?:www\.)?(?:discord\.(?:gg|io|me|li)|discord(?:app)?\.com/invite)/([a-zA-Z0-9\-]+)`.
   - Extract invite code. Compare against configured guild allowed invite codes. If not allowed, classify as `UnauthorizedInvite`.
6. **Action**:
   - `Phishing`: Immediate delete + 24h timeout + audit log alert.
   - `UnauthorizedInvite`: Immediate delete + user warning + audit log.

### 4.3 Anti-Unauthorized Mentions

#### Rules:
1. **`@everyone` / `@here` Guard**:
   - Read `msg.mention_everyone`.
   - If `true` and author lacks staff role or `Permissions::MENTION_EVERYONE`:
     - Action: Delete message + 10-minute timeout + audit log alert.
2. **Protected Roles Guard**:
   - Read `msg.mention_roles`.
   - Compare with protected role IDs (Staff role, Videaste role, Admin role).
   - If author is not staff:
     - Action: Delete message + warning + audit log alert.
3. **Mass Mention Spam**:
   - Count `msg.mentions.len()`.
   - If count > 4 for a non-staff user:
     - Action: Delete message + 5-minute timeout + audit log alert.

### 4.4 Sliding-Window Burst Anti-Flood

#### Data Structures & Algorithm:
```rust
pub struct MessageRecord {
    pub id: Id<MessageMarker>,
    pub timestamp: Instant,
    pub content_hash: u64,
}

pub struct UserFloodBucket {
    pub history: VecDeque<MessageRecord>,
}

pub struct AntiFloodTracker {
    // Key: (guild_id, user_id)
    pub buckets: HashMap<(u64, u64), UserFloodBucket>,
}
```

#### Evaluation Logic:
1. When message arrives, prune all records older than the sliding window (`now - record.timestamp > window_duration`, default 5 seconds).
2. Append new message record (`id`, `timestamp`, `content_hash`).
3. Check burst threshold:
   - **Velocity**: `history.len() >= max_messages` (default: 5 messages in 5 seconds).
   - **Repetition**: Count identical `content_hash` in window >= 3.
4. If threshold exceeded:
   - Extract all message IDs in the bucket: `Vec<Id<MessageMarker>>`.
   - Call `http.delete_messages(channel_id, &message_ids).await` (bulk purge).
   - Apply timeout sanction (default: 5 minutes) via `update_guild_member`.
   - Clear purged records from bucket to prevent redundant purges.
5. **Pure Evaluation Method for Unit Testing**:
   Accept `now: Instant` parameter so unit tests can simulate millisecond bursts deterministically without real clock sleeps.

---

## 5. Concrete Interfaces & Architecture

### 5.1 Proposed Module Layout

To keep code clean, modular, and maintainable, the moderation suite should be structured under `src/modules/automod/`:

```
src/
├── modules/
│   ├── automod/
│   │   ├── mod.rs          # Module registration, settings, entry points
│   │   ├── leetspeak.rs    # Normalization, homoglyphs, acronym expansion
│   │   ├── toxicity.rs     # Contextual classifier, target detection, scoring
│   │   ├── command.rs      # /test_message slash command handler & embeds
│   │   ├── flood.rs        # Sliding-window rate limiter & purge logic
│   │   ├── links.rs        # Phishing heuristics & unauthorized invites
│   │   ├── mentions.rs     # Mention authorization & mass-ping guard
│   │   └── media.rs        # OCR scam screenshot detection & vision trait
│   └── ...
├── events/
│   ├── automod.rs          # Bridge calling automod::process_message
│   └── mod.rs              # Gateway dispatch
```

### 5.2 Key Rust Type Definitions

```rust
// In src/modules/automod/toxicity.rs

#[derive(Debug, Clone, PartialEq)]
pub enum TargetKind {
    None,
    SelfTarget,
    GameObject(String),
    SecondPersonPronoun(String),
    ExplicitUserMention(u64),
    ReplyTarget(u64),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ToxicityCategory {
    Clean,
    GamingFrustration,
    FriendlyBanter,
    Harassment,
    SevereToxicity,
}

#[derive(Debug, Clone)]
pub struct ToxicityVerdict {
    pub category: ToxicityCategory,
    pub score: f32,
    pub target: TargetKind,
    pub unmasked_text: String,
    pub matched_words: Vec<String>,
    pub matched_abbreviations: Vec<String>,
}

// In src/modules/automod/flood.rs

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FloodAction {
    Allow,
    PurgeAndTimeout {
        message_ids: Vec<u64>,
        timeout_seconds: u64,
        reason: &'static str,
    },
}

pub struct AntiFloodConfig {
    pub window_seconds: u64,
    pub max_messages: usize,
    pub repeat_threshold: usize,
    pub timeout_seconds: u64,
}

// In src/modules/automod/media.rs

#[async_trait::async_trait]
pub trait VisionOcrEngine: Send + Sync {
    async fn extract_text(&self, image_url: &str) -> anyhow::Result<String>;
}

#[derive(Debug, Clone, PartialEq)]
pub enum ScamVerdict {
    Safe,
    DetectedScam {
        category: &'static str,
        confidence: f32,
        extracted_snippet: String,
    },
}
```

### 5.3 Settings Integration in `src/modules/mod.rs`

Expand the `automod` module definition with configurable settings:

```rust
ModuleDef {
    id: "automod",
    name: "Modération automatique",
    description: "Protection anti-toxicité contextuelle, anti-flood, filtrage de liens et détection OCR.",
    category: "Modération",
    default_enabled: false,
    legacy_column: Some("moduleAutoMod"),
    commands: || vec![crate::modules::automod::command::register()],
    components: &[],
    settings: {
        const S: &[Setting] = &[
            field("logChannelId", "Salon des alertes", SettingKind::Channel, Some("Vide : salon de logs par défaut."), None),
            field("floodWindowSeconds", "Fenêtre anti-flood (s)", SettingKind::Number, None, Some("5")),
            field("floodMaxMessages", "Messages max avant sanction", SettingKind::Number, None, Some("5")),
            field("floodTimeoutMinutes", "Durée du timeout flood (min)", SettingKind::Number, None, Some("5")),
            field("enableOcrScan", "Activer détection OCR scams", SettingKind::Choice, None, Some("true")),
            field("enableLinkFilter", "Activer filtrage de liens", SettingKind::Choice, None, Some("true")),
        ];
        S
    },
}
```

---

## 6. Testing & Independent Verification Method

1. **Unit Testing Leetspeak Normalization (`cargo test test_leetspeak`)**:
   - Test digit substitutions: `4` -> `a`, `0` -> `o`, `3` -> `e`, `7` -> `t`, `1` -> `i`, `5` -> `s`, `@` -> `a`, `$` -> `s`.
   - Test punctuation & interstitial noise: `f.d.p`, `f-d-p`, `s a l o p e`, `c.o.n.n.a.r.d`.
   - Test Cyrillic confusables: `сonnard` (Cyrillic `с` U+0441), `fԁр` (Cyrillic `ԁ` U+0501).
   - Test character elongation: `cooooonnnnard` -> `connard`.
   - Test toxic acronyms: `fdp`, `ntm`, `tg`, `kys`, `stfu`.

2. **Unit Testing Contextual Toxicity (`cargo test test_contextual_toxicity`)**:
   - Frustration test: `"Fait chier ce creeper qui a explosé ma base"` -> `GamingFrustration`, allow.
   - Banter test: `"Mdr t'es trop con bien joué gg"` -> `FriendlyBanter`, allow.
   - Harassment test: `"T'es un sale fdp dégage d'ici"` -> `Harassment`, sanction.
   - Mention harassment test: `"<@123456789> gros connard"` -> `Harassment`, target: `ExplicitUserMention(123456789)`.
   - Severe toxicity test: `"Va crever sale negre"` -> `SevereToxicity`, immediate sanction.

3. **Unit Testing Sliding-Window Anti-Flood (`cargo test test_anti_flood`)**:
   - Simulated timeline with `now = Instant::now()`:
     - 4 messages in 4 seconds -> `FloodAction::Allow`.
     - 5th message at 4.5 seconds -> `FloodAction::PurgeAndTimeout` returning 5 message IDs to purge.
     - Pruning test: 4 messages at t=0s, 1 message at t=6s -> `FloodAction::Allow` (old messages pruned).
     - Duplicate repetition test: 3 identical messages within 3 seconds -> `FloodAction::PurgeAndTimeout`.

4. **Unit Testing Phishing & Links (`cargo test test_link_filter`)**:
   - Authorized links: `https://paranoia-mc.fr/forum`, `https://youtube.com/watch?v=123` -> Allowed.
   - Phishing links: `https://dlscord-nitro.com/gift`, `https://steamcomminuty.com/trade` -> Blocked.
   - Invites: `https://discord.gg/other-server` -> Blocked if not on allowed list; allowed if matching server invite.

5. **Compilation Verification**:
   - `cargo check` and `cargo test` execute with zero errors.

---

## 7. Antislop & Quality Guidelines

- **No AI placeholder comments**: Avoid `// TODO: add more words here`, `// Implement logic`, `// Handle error properly`.
- **Purposeful Error Handling**: Return typed `anyhow::Result` or domain error enums; log operational errors with `tracing::warn!` or `tracing::error!`.
- **Pre-compiled Regexes**: Use `std::sync::LazyLock` or `OnceLock` for all static regexes to avoid compiling regexes on every message event.
- **Performance**: Ensure the whole evaluation chain per message runs in `< 50 microseconds` for pure text checks, maintaining real-time chat responsiveness.
