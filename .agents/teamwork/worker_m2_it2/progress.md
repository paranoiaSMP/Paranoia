# Progress Log

Last visited: 2026-10-14T20:25:00Z

## Status
- [x] Initialized DISPATCH.md and BRIEFING.md
- [x] Read ORIGINAL_REQUEST.md and PROJECT.md
- [x] Read verification reports from Iteration 1 (reviewer 1, 2, challenger 1, 2, auditor)
- [x] Inspect existing implementation in target files
- [x] Implement the 10 fixes:
  - [x] 1. Multi-invite smuggling in `links.rs` (`captures_iter`)
  - [x] 2. Crypto substring false positives on Minecraft vocab in `media.rs` (word boundary regex `\b(?:btc|eth|sol|usdt|bitcoin|ethereum|crypto)\b`)
  - [x] 3. Trailing dot FQDN invite filter bypass in `links.rs` (`INVITE_RE`)
  - [x] 4. Whitelisted Discord shortcuts false positive in `links.rs` (exclude `discord.me`, `discord.io`, `discord.li` from generic phishing check)
  - [x] 5. Double slash invite bypass in `links.rs` (`INVITE_RE` multiple slashes)
  - [x] 6. Unicode lookalike & IDN domain evasions in `links.rs` (normalize unicode chars via `normalize_unicode_char`)
  - [x] 7. Real-world crypto withdrawal prompts in `media.rs` (British spelling `unauthori[zs]ed`, `confirmation|request|pending|alert`, verb forms)
  - [x] 8. Delimited casino / promo codes in `media.rs` (`[-_ ]*code`)
  - [x] 9. Attachment extension case-sensitivity in `src/events/automod.rs` (`filename.to_lowercase()`)
  - [x] 10. Case-insensitive plaintext fallback for `@everyone`/`@here` in `src/modules/automod/mentions.rs`
- [x] Update test suites:
  - [x] `tests/adversarial_media_and_links_stress_test.rs` updated to assert remediated detections
  - [x] `tests/challenger_m2_flood_and_mentions_test.rs` updated to assert case-insensitive raw mentions
  - [x] `tests/media_and_message_guard_test.rs` expanded with 7 new regression tests
- [x] Run verification commands:
  - [x] `cargo check` (0 errors, 0 warnings)
  - [x] `cargo test --test media_and_message_guard_test` (63/63 passed)
  - [x] `cargo test --test adversarial_media_and_links_stress_test` (48/48 passed)
  - [x] `cargo test --test challenger_m2_flood_and_mentions_test` (67/67 passed)
  - [x] `cargo test -- --test-threads=1` (100% pass across all test targets)
- [x] Write handoff report and notify parent
