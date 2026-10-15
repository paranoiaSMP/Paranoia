# BRIEFING — 2026-10-14T20:14:00Z

## Mission
Empirically stress-test M2 OCR media scam detection (media.rs) and link/phishing interceptor (links.rs) with adversarial payloads, evasions, and boundary cases.

## 🔒 My Identity
- Archetype: challenger
- Roles: critic, specialist
- Working directory: /home/leo/Code/Paranoia_New/.agents/teamwork/challenger_m2_1
- Original parent: 6856306e-cb82-41f1-9d88-3a986dad1d40
- Milestone: M2
- Instance: 1 of 2

## 🔒 Key Constraints
- Review-only — do NOT modify implementation code
- Run verification code empirically via `cargo test` in `bot-rust`
- Provide clear verdict (APPROVE or REQUEST_CHANGES) in handoff.md

## Current Parent
- Conversation ID: 6856306e-cb82-41f1-9d88-3a986dad1d40
- Updated: not yet

## Review Scope
- **Files to review**: `src/modules/automod/media.rs`, `src/modules/automod/links.rs`, `src/events/automod.rs`, `tests/media_and_message_guard_test.rs`
- **Interface contracts**: `PROJECT.md` M2 contracts (`VisionOcrEngine`, `ScamVerdict`, `LinkVerdict`, `DEFAULT_ALLOWED_DOMAINS`)
- **Review criteria**: Robustness against evasions (casing, trailing dots, unicode/punycode, subtle variations, fragmented keywords, vanity codes, discord shortcuts).

## Attack Surface
- **Hypotheses tested**: 
  1. Subtle text variations and fragmented keywords in OCR scam detection
  2. Fake promo codes and withdrawal prompts
  3. URL casing and trailing dots in link/phishing filtering
  4. Unicode domain lookalikes / punycode homoglyphs
  5. Vanity invite codes and shortcut domains (`discord.me`, `discord.io`, `discord.li`)
- **Vulnerabilities found**:
  1. [CRITICAL] Trailing dot FQDN bypass (`discord.gg.`, `discord.com.`) in `links.rs` allows unauthorized invites.
  2. [CRITICAL] Whitelisted `discord.me`/`discord.io` shortcuts falsely classified as `LinkVerdict::Phishing` in `links.rs`.
  3. [HIGH] Double slash `discord.gg//code` bypasses `INVITE_RE` in `links.rs`.
  4. [HIGH] Unicode homoglyphs (`dіscord-nitro.com`) evade ASCII-only `URL_RE` in `links.rs`.
  5. [HIGH] OCR scam misses British spelling (`Unauthorised`), pending confirmation prompts, verb forms (`withdraw`), and withdrawal requests in `media.rs`.
  6. [MEDIUM] Hyphenated `promo-code` with generic casino context evades `CASINO_SCAM_RE` in `media.rs`.
- **Untested angles**: Cross-module integration with mention guard & anti-flood (verified in existing tier tests).

## Loaded Skills
None.

## Key Decisions Made
- Verdict: REQUEST_CHANGES based on confirmed critical bypasses and false positives.
- Wrote reproducible empirical test suite in `tests/adversarial_media_and_links_stress_test.rs`.

## Artifact Index
- `BRIEFING.md` — Agent working memory
- `DISPATCH.md` — Incoming dispatch log
- `progress.md` — Liveness and step tracking
- `handoff.md` — Final handoff report
- `tests/adversarial_media_and_links_stress_test.rs` — Empirical adversarial test suite (48 tests passing)
