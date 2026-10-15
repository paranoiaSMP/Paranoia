# E2E Test Writer Dispatch
Working directory: /home/leo/Code/Paranoia_New/.agents/teamwork/e2e_test_writer_1
Request: /home/leo/Code/Paranoia_New/.agents/teamwork/ORIGINAL_REQUEST.md
Project: /home/leo/Code/Paranoia_New/.agents/teamwork/PROJECT.md
## 2026-10-14T18:54:27Z
sender: 6856306e-cb82-41f1-9d88-3a986dad1d40
priority: MESSAGE_PRIORITY_HIGH

You are the E2E Test Writer for the Paranoia SMP Discord bot moderation and security suite project.
Your identity: E2E Test Writer
Your working directory: /home/leo/Code/Paranoia_New/.agents/teamwork/e2e_test_writer_1
Target codebase: /home/leo/Code/Paranoia_New/bot-rust
Original Request: /home/leo/Code/Paranoia_New/.agents/teamwork/ORIGINAL_REQUEST.md
Project Spec: /home/leo/Code/Paranoia_New/.agents/teamwork/PROJECT.md

You MUST read /home/leo/Code/Paranoia_New/.agents/teamwork/ORIGINAL_REQUEST.md and /home/leo/Code/Paranoia_New/.agents/teamwork/PROJECT.md before starting work.
Your task:
Establish the E2E Testing Track derived from user requirements and specifications (opaque-box, requirement-driven, independent of internal module coupling):
1. Create `/home/leo/Code/Paranoia_New/TEST_INFRA.md` following the template in instructions:
   - Test architecture, feature inventory cross-check, test methodology (Tiers 1-4).
2. Create comprehensive test suites in `/home/leo/Code/Paranoia_New/bot-rust/tests/`:
   - Tier 1: Feature Coverage (>=5 test cases per feature covering leetspeak unmasking, contextual classification, `/test_message`, OCR scam patterns, link filtering, mention limits, anti-flood sliding window, join-velocity anti-raid, captcha verification, temp role decay).
   - Tier 2: Boundary & Corner Cases (empty strings, huge messages, unicode abuse, zero interval, max burst, edge timestamps).
   - Tier 3: Cross-Feature Combinations (e.g. toxic leetspeak inside a flood burst; phishing link disguised in an OCR image).
   - Tier 4: Real-world application scenarios (simulated raid wave, simulated scam bot wave, false positive protection for legitimate gaming chat).
3. Ensure tests follow antislop hygiene (idiomatic Rust, descriptive test names, no dummy assertions, compile cleanly).
4. Note on test isolation: If you run tests, be aware that `DISCORD_BOT_TOKEN=""` or isolating environment variables is needed if `Config::load()` is invoked.
5. When complete, publish `/home/leo/Code/Paranoia_New/TEST_READY.md` summarizing the test suites, counts per tier, runner command, and feature checklist.
6. Write your handoff to `/home/leo/Code/Paranoia_New/.agents/teamwork/e2e_test_writer_1/handoff.md` and notify parent.
