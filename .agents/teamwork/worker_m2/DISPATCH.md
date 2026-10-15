# Worker M2 Dispatch
Working directory: /home/leo/Code/Paranoia_New/.agents/teamwork/worker_m2
Target codebase: /home/leo/Code/Paranoia_New/bot-rust
Request: /home/leo/Code/Paranoia_New/.agents/teamwork/ORIGINAL_REQUEST.md
Project Spec: /home/leo/Code/Paranoia_New/.agents/teamwork/PROJECT.md
Survey Analysis: /home/leo/Code/Paranoia_New/.agents/teamwork/explorer_survey_moderation/analysis.md
E2E Test Suites: /home/leo/Code/Paranoia_New/bot-rust/tests/
## 2026-10-14T19:57:41Z
You are the Milestone 2 Worker for the Paranoia SMP Discord bot moderation and security suite project.
Your identity: Milestone 2 Worker
Your working directory: /home/leo/Code/Paranoia_New/.agents/teamwork/worker_m2
Target codebase: /home/leo/Code/Paranoia_New/bot-rust
Original Request: /home/leo/Code/Paranoia_New/.agents/teamwork/ORIGINAL_REQUEST.md
Project Spec: /home/leo/Code/Paranoia_New/.agents/teamwork/PROJECT.md
Survey Analysis: /home/leo/Code/Paranoia_New/.agents/teamwork/explorer_survey_moderation/analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You MUST read /home/leo/Code/Paranoia_New/.agents/teamwork/ORIGINAL_REQUEST.md and /home/leo/Code/Paranoia_New/.agents/teamwork/PROJECT.md before starting work.
Your task: Implement Milestone 2: R2 Message & Media Guard (OCR & Anti-Scam, Phishing/Links, Mentions, Anti-Flood).

Exclusive file ownership:
- `src/modules/automod/media.rs`
- `src/modules/automod/links.rs`
- `src/modules/automod/mentions.rs`
- `src/modules/automod/flood.rs`
- `tests/media_and_message_guard_test.rs`
(and updates to `src/modules/automod/mod.rs` and `src/events/automod.rs`).

Specific implementation details:
1. `media.rs`: OCR & Media Scam Detection:
   - Define trait `VisionOcrEngine: Send + Sync` with `async fn scan_image(&self, url: &str) -> anyhow::Result<String>`.
   - Provide concrete implementations: `HttpVisionOcrEngine` (capable of calling vision endpoints) and `MockVisionOcrEngine` (deterministic for offline unit testing).
   - Scam pattern recognition: Scan extracted text for crypto/casino scams (fake giveaway winnings, promo codes, unauthorized withdrawals, voucher codes, fake deposit bonuses, Bitcoin/USDT/Ethereum giveaway phishing).
   - Return structured `ScamVerdict::Clean` or `ScamVerdict::CryptoCasinoScam { reason, confidence }`.
2. `links.rs`: Phishing & Unauthorized Invite Interceptor:
   - Extract URLs from message content.
   - Domain whitelist: `paranoia-mc.fr`, `discord.gg`, `discord.com`, `github.com`, `youtube.com`, `twitch.tv`, etc.
   - Phishing heuristics: Detect typosquatting / target-spoofing domains (e.g., `dlscord-nitro.com`, `steamcomminuty.com`, `paranoia-free-coins.xyz`).
   - Discord invite interceptor: Parse invite codes from `discord.gg/...` or `discord.com/invite/...`. Compare against allowed server invites (`config.discord_server_invite` or whitelist); intercept unauthorized server invites.
   - Return `LinkVerdict::Allowed`, `LinkVerdict::Phishing { domain }`, or `LinkVerdict::UnauthorizedInvite { code }`.
3. `mentions.rs`: Anti-Unauthorized Mentions:
   - Intercept `@everyone` and `@here` from non-staff/unauthorized members.
   - Intercept pings to protected staff roles (`config.role_staff_id`, etc.) from regular users.
   - Enforce mass ping limits (>4 mentions in a single message).
4. `flood.rs`: Sliding-Window Burst Anti-Flood:
   - `AntiFloodTracker` with thread-safe per-user sliding window `VecDeque<(Instant, Id<MessageMarker>, String)>`.
   - Purge and rate-limiting rules: e.g., >5 messages in 5 seconds OR 3 identical messages repeated in 10 seconds.
   - Return `FloodAction::Allow` or `FloodAction::PurgeAndTimeout { message_ids, duration_seconds }` (e.g. 5 minutes timeout = 300s).
   - Deterministic testability: Parameterize `now: Instant` so tests can simulate time jumps without `tokio::time::sleep`.
5. Event Hookup (`src/events/automod.rs`):
   - In `check_message`: run link interceptor, mention guard, anti-flood tracker, and image attachment OCR scan.
   - If a violation occurs: execute message purge (`http.delete_messages` or `http.delete_message`), apply timeout (`http.update_guild_member(...).communication_disabled_until(...)`), and log sanction.
6. Antislop & Clean Code:
   - Idiomatic Rust 2024, zero placeholder comments, purposeful error handling with `anyhow`.
   - Comprehensive unit and integration tests in `tests/media_and_message_guard_test.rs`.
   - Ensure `cargo check` and `cargo test` pass with 0 errors.
7. Write handoff report to `/home/leo/Code/Paranoia_New/.agents/teamwork/worker_m2/handoff.md` and notify parent.
