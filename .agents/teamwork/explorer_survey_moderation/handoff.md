# Handoff Report: Moderation Survey (R1 & R2)

**Agent:** Moderation Survey Explorer (`explorer_survey_moderation`)  
**Date:** 2026-10-14  
**Target:** `/home/leo/Code/Paranoia_New/bot-rust`  
**Parent Orchestrator:** `6856306e-cb82-41f1-9d88-3a986dad1d40`  

---

## 1. Observation

1. **Framework & Dependencies (`bot-rust/Cargo.toml:6-35`)**:
   The bot is built on Twilight 0.17 (`twilight-gateway 0.17.1`, `twilight-http 0.17.1`, `twilight-model 0.17.1`, `twilight-util 0.17.0`), Tokio 1.53 (`features = ["full"]`), SQLx 0.9.0 (`features = ["postgres", "runtime-tokio", "tls-rustls", "chrono", "uuid", "migrate", "json"]`), `chrono 0.4`, and `regex 1.11`.
   `regex = "1.11"` is already in `Cargo.toml`, but search for `Regex::new` or `regex` across `bot-rust/src/` returned zero matches—it is not yet used in source files.

2. **Existing AutoMod Implementation (`bot-rust/src/events/automod.rs:6-44`)**:
   ```rust
   const BAD_WORDS: &[&str] = &["fdp", "connard", "salope", "tg", "ta gueule", "pute", "ntm", "negre"];
   ...
   let has_bad_word = BAD_WORDS.iter().any(|&w| content_lower.contains(w));
   let uppercase_count = content.chars().filter(|c| c.is_uppercase()).count();
   let total_chars = content.chars().filter(|c| c.is_alphabetic()).count();
   let has_too_much_caps = total_chars > 10 && (uppercase_count as f32 / total_chars as f32) > 0.7;
   ```
   No normalization of leetspeak, homoglyphs, or character repetition exists. No context awareness exists (e.g. profanity directed at game mobs vs players). No media scanning, link interception, mention guard, or sliding-window rate limiting is implemented.

3. **Module Registration Pattern (`bot-rust/src/modules/mod.rs:118-128`)**:
   `automod` is declared in `registry()`:
   ```rust
   ModuleDef {
       id: "automod",
       name: "Modération automatique",
       description: "Supprime les messages contenant des insultes de la liste du bot.",
       category: "Modération",
       default_enabled: false,
       legacy_column: Some("moduleAutoMod"),
       commands: none,
       components: &[],
       settings: &[],
   }
   ```
   Commands can be added via `commands: || vec![command_builder]`. Dynamic settings can be configured via `Setting` structs and read using `setting("automod", key)` and `setting_number("automod", key, fallback)`.

4. **Event Loop Hook (`bot-rust/src/events/mod.rs:24-41`)**:
   `Event::MessageCreate(msg)` invokes:
   ```rust
   if crate::modules::enabled("automod")
       && automod::check_message(&msg, &http, &db, Some(config.ticket_log_channel_id)).await
   {
       return;
   }
   ```
   Returning `true` cancels further event propagation (preventing XP gain, drops, quiz participation, and ticket web synchronization).

5. **Existing Sanctions & Moderation Actions (`bot-rust/src/commands/moderation.rs:213-221, 624`)**:
   - Timeouts are executed using `twilight_model::util::Timestamp` and `http.update_guild_member(guild_id, target_id).communication_disabled_until(Some(ts)).await`.
   - Message deletions use `http.delete_message(channel_id, message_id).await` for single messages and `http.delete_messages(channel_id, &message_ids).await` for bulk purge.
   - Slash command responses are delivered via `http.interaction(id).create_response(...)` with `MessageFlags::EPHEMERAL`.

6. **Compilation Baseline**:
   - `cargo check` in `bot-rust` exits 0 in 0.12s.
   - `cargo test --bin bot-rust` exits 0 (5 passed).
   - Integration tests `db_schema_test`, `db_schema_stress_test`, and `json_migration_test` exit 0.

---

## 2. Logic Chain

1. **R1 Leetspeak Unmasking**:
   - Because `BAD_WORDS.iter().any(...)` in `src/events/automod.rs:21` tests raw lowercase substring containment, trivial bypasses (`c0nnard`, `f.d.p`, `s4lope`, `сonnard` with Cyrillic U+0441) evade detection.
   - Therefore, a multi-pass pipeline (Cyrillic/Greek homoglyph normalization -> diacritic stripping -> zero-width removal -> leetspeak substitution table -> repeated character collapse -> toxic abbreviation expansion) is required before classification.
   - Because `regex = "1.11"` is already a dependency in `Cargo.toml`, pre-compiled regexes can be used for multi-character leetspeak patterns without introducing new external crates.

2. **R1 Contextual Toxicity vs Frustration & Banter**:
   - In a gaming SMP, users routinely use profanity when dying or lagging ("fait chier ce squelette", "merde la lave").
   - By extracting the sentence target (`TargetKind::GameObject`, `TargetKind::SecondPersonPronoun`, `TargetKind::ExplicitUserMention`, or `TargetKind::ReplyTarget`) and humor/banter tokens (`mdr`, `lol`, `gg`, `xd`, `😂`), the engine can accurately categorize messages into `Clean`, `GamingFrustration`, `FriendlyBanter`, `Harassment`, and `SevereToxicity`.
   - Gaming frustration and friendly banter can thus be allowed while directed attacks and slurs are intercepted.

3. **R1 `/test_message` Slash Command**:
   - By creating a slash command registered under `automod` or `moderation` with `default_member_permissions(Permissions::MODERATE_MEMBERS)`, moderators can submit arbitrary text and receive an ephemeral embed with the verdict, target, confidence score, and unmasked text.
   - The handler invokes the pure classification function without calling `http.delete_message` or creating database records, satisfying the diagnostic-only, non-sanctioning requirement.

4. **R2 Media / OCR Scam Detection**:
   - `Message.attachments` provides attachment metadata (`filename`, `url`, `content_type`).
   - Image attachments (`image/png`, `image/jpeg`, etc.) can be analyzed using a pluggable `VisionOcrEngine` trait.
   - By defining a `VisionOcrEngine` trait with a concrete implementation (via `reqwest` calling Gemini Vision Flash API) and a deterministic `MockVisionOcrEngine` for unit tests, scam regex patterns (crypto giveaways, casino codes, fake withdrawals, fake Nitro) can be verified in unit tests without network access while providing high production accuracy.

5. **R2 Link & Phishing Interception**:
   - URLs can be extracted using standard URL regular expressions.
   - Canonicalized domains are matched against a whitelist (`paranoia-mc.fr`, `youtube.com`, `twitch.tv`, `github.com`, etc.).
   - Typosquatting heuristics (e.g. `dlscord-nitro`, `steamcomminuty`) detect phishing domains.
   - Discord invite URLs are parsed for their invite code; foreign invites outside the server's allowed invite list are intercepted and deleted.

6. **R2 Anti-Unauthorized Mentions**:
   - Twilight `Message` exposes `mention_everyone`, `mention_roles`, and `mentions`.
   - Checking the author's roles against `config.role_staff_id` and `Permissions::MENTION_EVERYONE` ensures unauthorized `@everyone`, `@here`, protected staff roles, or mass pings (>4 mentions) are immediately purged and the author timed out.

7. **R2 Sliding-Window Anti-Flood**:
   - Storing a per-user `VecDeque<MessageRecord>` protected by a `Mutex` enables pruning timestamps older than the sliding window (e.g. 5 seconds).
   - If `history.len() >= max_messages` (e.g. 5 messages in 5s) or identical content repeats 3 times, `http.delete_messages(channel_id, &message_ids)` purges the burst and `update_guild_member` applies a 5-minute timeout.
   - Parameterizing `now: Instant` enables deterministic unit testing of burst rate limits with zero sleep delays.

---

## 3. Caveats

1. **External OCR Service Dependency**:
   While `reqwest` is present and capable of calling vision APIs (such as Gemini 2.0/1.5 Flash), an external API requires network access and an API key. A pluggable trait (`VisionOcrEngine`) ensures local heuristics and mock engines run seamlessly in `cargo test` and offline environments.
2. **Discord Gateway Rate Limits on Bulk Purge**:
   Discord's `delete_messages` endpoint only supports deleting messages younger than 14 days and requires `Permissions::MANAGE_MESSAGES`. For messages older than 14 days, individual `delete_message` calls are needed, though sliding-window flood messages are always mere seconds old.
3. **Database Sanction Logging**:
   The existing `sanctions` table records bans, kicks, and mutes from slash commands. Automated timeouts from AutoMod can optionally be written to `sanctions` or tracked solely via Discord audit logs. Writing to `sanctions` has the advantage of supporting the existing appeal flow (`appeals` table).

---

## 4. Conclusion

The technical design for R1 and R2 is fully mapped and ready for milestone decomposition and worker implementation:
1. **Module Structure**: Place the modular engine in `src/modules/automod/` with dedicated files: `leetspeak.rs`, `toxicity.rs`, `command.rs`, `flood.rs`, `links.rs`, `mentions.rs`, and `media.rs`.
2. **Interface Contracts**: Defined clear Rust enums and structs (`TargetKind`, `ToxicityCategory`, `ToxicityVerdict`, `FloodAction`, `AntiFloodConfig`, `VisionOcrEngine`, `ScamVerdict`).
3. **Zero-Slop Hygiene**: Use idiomatic Rust, compile-time pre-compiled regexes, typed errors with `anyhow`, and no placeholder comments.
4. **Testability**: All core algorithms (leetspeak normalization, contextual classifier, link filter, and sliding-window flood tracker) can be tested deterministically with in-memory unit tests in milliseconds.

---

## 5. Verification Method

To independently verify this survey and future implementations:

1. **Verify Existing Code & Baseline**:
   ```bash
   cd /home/leo/Code/Paranoia_New/bot-rust
   cargo check
   cargo test --bin bot-rust
   ```
2. **Inspect Analysis and Architectural Specifications**:
   Read `/home/leo/Code/Paranoia_New/.agents/teamwork/explorer_survey_moderation/analysis.md`.
3. **Future Acceptance Testing Verification Commands**:
   - `cargo test test_leetspeak`: Verifies unmasking across substitution patterns, homoglyphs, and punctuation stripping.
   - `cargo test test_contextual_toxicity`: Verifies distinction between gaming frustration, friendly banter, and targeted harassment.
   - `cargo test test_anti_flood`: Verifies sliding-window purge threshold and timeout triggering.
   - `cargo test test_link_filter`: Verifies whitelist vs phishing and unauthorized invite blocking.
