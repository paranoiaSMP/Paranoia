# Original User Request

## 2026-10-14T18:42:56Z

Implement a production-grade moderation and security suite for the Paranoia SMP Discord bot in Rust (`bot-rust/`), covering contextual anti-toxicity, optical character recognition (OCR) scam screenshot detection, anti-phishing, burst anti-flood, automated anti-raid lockdown, interactive captcha verification, and temporary decay roles (excluding staff betrayal restrictions). Antislop and clean code practices must be maintained throughout the codebase and bot messages.

Working directory: /home/leo/Code/Paranoia_New/bot-rust
Integrity mode: demo

## Requirements

### R1. Contextual Anti-Toxicity & Anti-Bypass Engine
- Normalize leetspeak substitutions (e.g., `4` -> `a`, `0` -> `o`, `3` -> `e`, `7` -> `t`) and common toxic abbreviations before classification.
- Classify messages contextually to distinguish targeted attacks/harassment directed at players from generic gaming frustration or friendly banter.
- Provide a moderator `/test_message` slash command returning ephemeral diagnostics (verdict, target detected, unmasked text, score) without applying sanctions.

### R2. Message & Media Guard (OCR & Anti-Scam)
- Scan image attachments using OCR/vision analysis to detect text matching crypto/casino scams (e.g., fake giveaway winnings, promo codes, unauthorized withdrawals).
- Intercept and delete phishing links and unauthorized Discord invites.
- Enforce anti-unauthorized mentions (`@everyone`, `@here`, protected roles).
- Rate-limit message bursts (sliding window) with automatic message purge and timeout sanctions.

### R3. Join-Velocity Anti-Raid Engine
- Monitor member join velocity in real time.
- Upon detecting a join spike exceeding defined thresholds (e.g., >10 joins in 5 seconds), trigger an automatic guild lockdown, restrict `@everyone` channel permissions, and automatically kick suspect raid wave accounts.

### R4. Gatekeeper Verification & Temporary Decay Roles
- Provide an interactive button captcha gatekeeper for new arrivals before granting member access.
- Implement automatic temporary role decay (e.g., temporary `@Nouveau` role removed automatically after expiration via a persistent background worker).

## Acceptance Criteria

### Compilation & Code Quality
- [ ] `cargo check` and `cargo test` pass with zero errors in `/home/leo/Code/Paranoia_New/bot-rust`.
- [ ] Code follows antislop hygiene: no generic placeholder comments, clean idiomatic Rust, and purposeful error handling.
- [ ] No regressions in existing Twilight commands or event listeners.

### Anti-Toxicity & Bypass Verification
- [ ] Unit tests pass for leetspeak unmasking across substitution patterns and punctuation stripping.
- [ ] `/test_message` slash command compiles and responds ephemerally with accurate diagnostics.

### Protection & Security Verification
- [ ] Sliding-window anti-flood unit tests confirm timeout trigger and purge threshold enforcement.
- [ ] Link filter correctly blocks unauthorized invites and phishing domains while allowing whitelisted links.
- [ ] Join-velocity monitor triggers lockdown state and kick sequence on simulated burst arrivals.

### Gatekeeper & Temp Roles Verification
- [ ] Captcha component interaction completes successfully on valid challenge response.
- [ ] Role expiration worker correctly identifies expired temp roles and issues removal requests.
