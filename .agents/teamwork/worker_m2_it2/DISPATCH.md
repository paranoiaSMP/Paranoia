## 2026-10-14T20:15:19Z

You are Milestone 2 Remediation Worker for the Paranoia SMP Discord bot moderation and security suite project.
Your identity: Milestone 2 Remediation Worker
Your working directory: /home/leo/Code/Paranoia_New/.agents/teamwork/worker_m2_it2
Target codebase: /home/leo/Code/Paranoia_New/bot-rust
Original Request: /home/leo/Code/Paranoia_New/.agents/teamwork/ORIGINAL_REQUEST.md
Project Spec: /home/leo/Code/Paranoia_New/.agents/teamwork/PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You MUST read /home/leo/Code/Paranoia_New/.agents/teamwork/ORIGINAL_REQUEST.md and /home/leo/Code/Paranoia_New/.agents/teamwork/PROJECT.md before starting work.
You MUST also read the verification reports from Iteration 1:
- Reviewer 1: /home/leo/Code/Paranoia_New/.agents/teamwork/reviewer_m2_1/handoff.md
- Reviewer 2: /home/leo/Code/Paranoia_New/.agents/teamwork/reviewer_m2_2/handoff.md
- Challenger 1: /home/leo/Code/Paranoia_New/.agents/teamwork/challenger_m2_1/handoff.md
- Challenger 2: /home/leo/Code/Paranoia_New/.agents/teamwork/challenger_m2_2/handoff.md
- Auditor: /home/leo/Code/Paranoia_New/.agents/teamwork/auditor_m2_1/handoff.md

Your task: Remediate the verified findings from Milestone 2 Iteration 1 in `/home/leo/Code/Paranoia_New/bot-rust`:

1. Multi-Invite Smuggling (`src/modules/automod/links.rs`):
   - Switch from `INVITE_RE.captures(&lower)` to `INVITE_RE.captures_iter(&lower)`: check ALL Discord invite codes in the message. If ANY invite code is NOT in `allowed_invites`, return `LinkVerdict::UnauthorizedInvite { code }`.
2. Crypto Substring False Positives on Minecraft Vocabulary (`src/modules/automod/media.rs`):
   - Replace raw `.contains("eth")` and `.contains("sol")` with word boundary regex or whitespace/punctuation delimited token matching: e.g. `\b(?:btc|eth|sol|usdt|bitcoin|ethereum)\b` so words like "Nether", "Netherite", "together", "console", "solution", "solo" are NEVER flagged as crypto tokens!
   - Ensure "Claim free Netherite at spawn", "Send coordinates together", and "Check server console" return `ScamVerdict::Clean`.
3. Trailing Dot FQDN Invite Filter Bypass (`src/modules/automod/links.rs`):
   - Update `INVITE_RE` to match optional trailing dots on domains: `(?:discord\.(?:gg|io|me|li)\.?|discord(?:app)?\.com\.?/invite)/+([a-zA-Z0-9_\-]+)`.
   - Ensure `https://discord.gg./evil-raid` and `https://discord.com./invite/evil-raid` are intercepted as `UnauthorizedInvite`.
4. Whitelisted Discord Shortcuts False Positive (`src/modules/automod/links.rs`):
   - In Step 3 (domain checks), exclude `discord.me`, `discord.io`, `discord.li` from the generic phishing check (`if domain == "discord.gg" || domain == "discord.com" || domain == "discordapp.com" || domain == "discord.me" || domain == "discord.io" || domain == "discord.li"`). If an invite code on these domains was whitelisted, it must return `LinkVerdict::Allowed`, not `LinkVerdict::Phishing`.
5. Double Slash Invite Bypass (`src/modules/automod/links.rs`):
   - Allow multiple slashes after domain in `INVITE_RE` (`/+([a-zA-Z0-9_\-]+)`), ensuring `https://discord.gg//evil-raid` is intercepted.
6. Unicode Lookalike & IDN Domain Evasions (`src/modules/automod/links.rs`):
   - Normalize URLs or expand `URL_RE` / domain heuristics so unicode homoglyphs (e.g. Cyrillic `і` in `dіscord-nitro.com`, `dіscord.gg/evil-raid`) do not truncate and evade phishing / invite detection.
7. Real-World Crypto Withdrawal Prompts (`src/modules/automod/media.rs`):
   - Support British spelling: `unauthori[zs]ed\s+withdraw(?:al)?`.
   - Support pending confirmation / alert prompts: `withdrawal\s+(?:confirmation|request|pending|alert)`.
   - Verb forms: `unauthorized\s+withdraw`.
8. Delimited Casino / Promo Codes (`src/modules/automod/media.rs`):
   - In `CASINO_SCAM_RE` and `has_promo_code`, support hyphen and underscore separators: `(?:promo|bonus|voucher)[-_ ]*code`.
9. Attachment Extension Case-Sensitivity (`src/events/automod.rs`):
   - Normalize filename to lowercase before checking extension: `attachment.filename.to_lowercase().ends_with(".png")`, etc.
10. Case-insensitive Plaintext Fallback for `@everyone`/`@here` (`src/modules/automod/mentions.rs`):
    - Make `raw_everyone` check case-insensitive: `msg.content.to_lowercase().contains("@everyone") || msg.content.to_lowercase().contains("@here")`.

Verification:
- Run `cargo check`
- Run `cargo test --test media_and_message_guard_test`
- Run `cargo test --test adversarial_media_and_links_stress_test`
- Run `cargo test --test challenger_m2_flood_and_mentions_test`
- Run `cargo test -- --test-threads=1` to ensure all workspace test suites pass cleanly.
Write your handoff to `/home/leo/Code/Paranoia_New/.agents/teamwork/worker_m2_it2/handoff.md` and notify parent.
