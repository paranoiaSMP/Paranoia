# Paranoia SMP - End-to-End Test Infrastructure (TEST_INFRA)

## 1. Overview & Test Architecture

The Paranoia SMP Discord bot moderation and security suite is built on Rust (edition 2024), utilizing Tokio 1.53, Twilight 0.17 (`twilight-gateway`, `twilight-http`, `twilight-model`, `twilight-util`, `twilight-cache-inmemory`), and SQLx 0.9.0 with PostgreSQL.

The E2E testing track establishes an **opaque-box, requirement-driven, contract-based** testing architecture. It is strictly derived from user requirements in `ORIGINAL_REQUEST.md` and interface specifications in `PROJECT.md`, remaining decoupled from transient internal module implementation states.

### Architecture Principles

1. **Opaque-Box Verification**: Tests evaluate observable outputs (verdicts, sanctions, diagnostic structures, permission mutations, and kick lists) against behavioral contracts rather than internal private functions.
2. **Progressive Testability**: Tests execute cleanly without requiring external live Discord gateway connections or live PostgreSQL instances for pure business logic evaluation.
3. **Environment & Concurrency Isolation**: All tests interacting with process environment variables use `common::ENV_MUTEX` and explicitly isolate both `DISCORD_TOKEN` and `DISCORD_BOT_TOKEN` to prevent `.env` leakage.
4. **Antislop & Quality Hygiene**: Zero dummy assertions (`assert!(true)` is strictly prohibited). Every test exercises real input-output state transformations with descriptive names and domain-specific failure messages.

```
                      +-----------------------------------+
                      |   ORIGINAL_REQUEST.md / SPEC      |
                      +-----------------+-----------------+
                                        |
                   Interface Contracts & Specifications
                                        |
        +-------------------------------+-------------------------------+
        |                               |                               |
+-------v-------+               +-------v-------+               +-------v-------+
|    Tier 1     |               |    Tier 2     |               |    Tier 3     |
| Feature Core  |               |  Boundaries   |               | Combinations  |
|  (>=50 tests) |               |  (>=10 tests) |               |  (>=8 tests)  |
+-------+-------+               +-------+-------+               +-------+-------+
        |                               |                               |
        +-------------------------------+-------------------------------+
                                        |
                                +-------v-------+
                                |    Tier 4     |
                                |  Real-World   |
                                |  (>=6 tests)  |
                                +-------+-------+
                                        |
                                        v
                       `cargo test` Test Execution Engine
```

---

## 2. Feature Inventory Cross-Check

The table below maps all 12 project features to their requirements, milestones, interface contracts, and dedicated test suites.

| Feature # | Feature Name | Requirement | Milestone | Interface Contract | Primary Test Suite |
|---|---|---|---|---|---|
| F1 | Leetspeak & Homoglyph Normalization | R1 | M1 | `unmask_leetspeak(input: &str) -> String` | `tests/tier1_feature_coverage_test.rs` |
| F2 | Contextual Toxicity Classification | R1 | M1 | `classify_toxicity(content: &str, mentions: &[Id<UserMarker>]) -> ToxicityVerdict` | `tests/tier1_feature_coverage_test.rs` |
| F3 | `/test_message` Ephemeral Diagnostics | R1 | M1 | `test_message_diagnostics(content: &str, ...) -> TestMessageDiagnostic` | `tests/tier1_feature_coverage_test.rs` |
| F4 | Media & OCR Vision Scam Detection | R2 | M2 | `scan_ocr_text(text: &str) -> ScamVerdict` | `tests/tier1_feature_coverage_test.rs` |
| F5 | Link & Phishing Interception | R2 | M2 | `evaluate_link(content: &str, allowed: &[&str], invites: &[&str]) -> LinkVerdict` | `tests/tier1_feature_coverage_test.rs` |
| F6 | Anti-Unauthorized Mentions | R2 | M2 | `check_mentions(author_roles, staff_id, everyone, ...) -> MentionVerdict` | `tests/tier1_feature_coverage_test.rs` |
| F7 | Sliding-Window Burst Anti-Flood | R2 | M2 | `AntiFloodTracker::record_and_evaluate(user_id, msg_id, content, now) -> FloodAction` | `tests/tier1_feature_coverage_test.rs` |
| F8 | Join-Velocity Anti-Raid Engine | R3 | M3 | `GuildRaidState::evaluate_join(user_id, now) -> JoinDecision` | `tests/tier1_feature_coverage_test.rs` |
| F9 | Channel Permission Restriction & Wave Kick | R3 | M3 | `GuildRaidState::suspect_user_ids` + channel overwrite denials | `tests/tier1_feature_coverage_test.rs` |
| F10 | Interactive Gatekeeper Captcha | R4 | M4 | `generate_captcha(user_id, seed)` & `verify_captcha(challenge, token)` | `tests/tier1_feature_coverage_test.rs` |
| F11 | Temporary Role Decay Worker | R4 | M4 | `filter_expired_roles(records, now) -> Vec<TempRoleDecayRecord>` | `tests/tier1_feature_coverage_test.rs` |
| F12 | System Integrity & Hardening | Acceptance | M5 | `cargo test`, `Config::load` isolation, SQLx schema stress checks | `tests/config_test.rs`, `tests/adversarial_stress_test.rs` |

---

## 3. Test Methodology & Four-Tier Hierarchy

The test suites are organized into four progressive tiers:

### Tier 1: Core Feature Coverage (`tests/tier1_feature_coverage_test.rs`)
Validates every functional specification across each of the 10 core capability areas, with a minimum of 5 distinct test cases per area (50+ total tests):
1. **Leetspeak Unmasking**: Digit substitutions (4->a, 0->o, 3->e, 7->t), Cyrillic homoglyphs, repeated character collapse, punctuation and symbol splitting, toxic abbreviation expansion.
2. **Contextual Toxicity Classification**: Targeted harassment vs player, friendly banter with laughter tokens, Minecraft gaming frustration against mobs/death, severe hate speech slurs, clean chat.
3. **`/test_message` Slash Command**: Ephemeral diagnostics, target extraction, unmasking output, confidence score, zero-sanction guarantee.
4. **OCR Scam Detection**: Crypto giveaways (free BTC/ETH), casino & gambling promo codes, unauthorized withdrawal alerts, fake Discord Nitro gifts, clean screenshot text.
5. **Link Filtering**: Typo-squatted phishing domains, unauthorized foreign Discord invites, whitelisted server invites, whitelisted gaming domains, clean non-URL text.
6. **Mention Limits**: `@everyone` by non-staff, `@here` by non-staff, protected staff role pings, mass user pings (>4 mentions), staff bypass.
7. **Sliding-Window Anti-Flood**: Normal chat pacing under threshold, rapid message burst triggering purge, duplicate message repetition, window expiration resetting counts, multi-user isolation.
8. **Join-Velocity Anti-Raid**: Normal arrivals below threshold, burst arrival triggering lockdown, collection of suspect account IDs for wave kick, rejection/kick of post-lockdown arrivals, window expiration.
9. **Gatekeeper Button Captcha**: Correct token verification, incorrect distractor token rejection, randomized option generation, seed determinism, expired challenge invalidation.
10. **Temporary Role Decay**: Expired role filtering, active unexpired role retention, multiple expired roles batching, exact timestamp boundary matching, empty input handling.

### Tier 2: Boundary & Corner Cases (`tests/tier2_boundary_corner_test.rs`)
Validates extreme operational boundaries and adversarial formatting:
- **Empty & Minimal Inputs**: Zero-length messages, whitespace-only messages, empty OCR buffers, empty mention lists.
- **Huge & Maximal Payloads**: 2000-character messages, 100-word spam blocks, massive multi-line inputs.
- **Unicode Adversarial Stress**: Zalgo combining characters, zero-width joiners/spaces, mixed-script bypass attempts, right-to-left override tokens.
- **Temporal Extremes**: Zero-interval arrivals (exact sub-millisecond timestamps), millisecond pacing, past timestamps, distant future timestamps.
- **Burst Extremes**: Flood attempts exceeding window thresholds by 10x (e.g. 50 messages in 100ms).

### Tier 3: Cross-Feature Combinations (`tests/tier3_cross_feature_combinations_test.rs`)
Validates multi-vector threats where distinct protection subsystems interact concurrently:
- **Toxic Leetspeak Flood**: Message burst combining rapid rate of arrival with obfuscated toxic slurs.
- **OCR Image with Phishing URL**: Image attachment containing OCR text embedded with a phishing link.
- **Raid Wave with Mass Mention Attack**: Burst arrivals joining and immediately issuing unauthorized mass mentions.
- **Gatekeeper Verification under Lockdown**: Arrival attempting captcha interaction while the guild is under active raid lockdown.
- **Multi-Vector Message Spam**: Single message combining obfuscated harassment, an unauthorized invite link, and a protected role mention.
- **Role Decay during Guild Lockdown**: Background worker processing role expirations concurrently with active security lockdown state.

### Tier 4: Real-World Scenarios (`tests/tier4_realworld_scenarios_test.rs`)
Validates realistic end-to-end production scenarios:
- **Simulated Raid Wave**: 50 automated bot accounts join within 2 seconds. The first wave breaches the threshold, triggering lockdown and flagging suspect wave accounts for eviction. Subsequent accounts are immediately kicked upon entry.
- **Simulated Scam Bot Wave**: Influx of compromised accounts posting disguised crypto casino images and fake Discord Nitro phishing URLs. Verifies interception of all scam vectors.
- **Legitimate Gaming Chat False-Positive Protection**: Realistic player conversations containing gaming rants ("fait chier ce squelette"), PvP banter ("gg t'es trop nul mdr"), and whitelisted YouTube/Wiki links without false positives.
- **Legitimate Onboarding under Concurrent High Load**: New arrival completes captcha verification smoothly while heavy chat and background decay workers execute.

---

## 4. Test Environment Isolation Protocol

When executing tests in `bot-rust`:

1. **Environment Mutex Protection**:
   All tests modifying `std::env` must acquire `common::ENV_MUTEX`:
   ```rust
   let _guard = common::ENV_MUTEX.lock().unwrap_or_else(|e| e.into_inner());
   ```
2. **Dotenv Leak Isolation**:
   Because `Config::load()` falls back from `DISCORD_TOKEN` to `DISCORD_BOT_TOKEN` (which is populated by `../.env`), tests validating missing token failures must isolate both:
   ```rust
   let prev_token = env::var("DISCORD_TOKEN").ok();
   let prev_bot_token = env::var("DISCORD_BOT_TOKEN").ok();
   unsafe {
       env::set_var("DISCORD_TOKEN", "");
       env::set_var("DISCORD_BOT_TOKEN", "");
   }
   // Execute test...
   // Restore environment variables afterwards
   ```
3. **Database Migration Invariant**:
   `migrations/0001_initial_schema.sql` must strictly retain exactly 7 SQL statements to satisfy `tests/db_schema_stress_test.rs`. New tables (such as `temp_roles`) reside in `migrations/0002_temp_roles.sql`.

---

## 5. Verification Commands

To run the complete test suite:
```bash
cd /home/leo/Code/Paranoia_New/bot-rust
cargo test
```

To run individual tiers:
```bash
cargo test --test tier1_feature_coverage_test
cargo test --test tier2_boundary_corner_test
cargo test --test tier3_cross_feature_combinations_test
cargo test --test tier4_realworld_scenarios_test
```
