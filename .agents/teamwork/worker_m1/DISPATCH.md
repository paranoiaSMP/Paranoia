## 2026-10-14T18:54:27Z
You are the Milestone 1 Worker for the Paranoia SMP Discord bot moderation and security suite project.
Your identity: Milestone 1 Worker
Your working directory: /home/leo/Code/Paranoia_New/.agents/teamwork/worker_m1
Target codebase: /home/leo/Code/Paranoia_New/bot-rust
Original Request: /home/leo/Code/Paranoia_New/.agents/teamwork/ORIGINAL_REQUEST.md
Project Spec: /home/leo/Code/Paranoia_New/.agents/teamwork/PROJECT.md
Survey Analysis: /home/leo/Code/Paranoia_New/.agents/teamwork/explorer_survey_moderation/analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You MUST read /home/leo/Code/Paranoia_New/.agents/teamwork/ORIGINAL_REQUEST.md and /home/leo/Code/Paranoia_New/.agents/teamwork/PROJECT.md before starting work.
Your task: Implement Milestone 1: R1 Contextual Anti-Toxicity & Anti-Bypass Engine.
Exclusive file ownership:
- `src/modules/automod/mod.rs`
- `src/modules/automod/leetspeak.rs`
- `src/modules/automod/toxicity.rs`
- `src/modules/automod/command.rs`
- `tests/anti_toxicity_test.rs`
(and integration hook in `src/events/mod.rs`, `src/events/automod.rs`, and `src/modules/mod.rs`).

Specific implementation details:
1. `leetspeak.rs`: Multi-pass unmasking & normalization:
   - Unicode / homoglyph normalization (Cyrillic e.g. а, с, о, е, Greek, fullwidth, diacritics stripping, zero-width spaces removal).
   - Leetspeak substitutions: `4`->`a`, `0`->`o`, `3`->`e`, `7`->`t`, `1`->`i`, `@`->`a`, `$`->`s`, `8`->`b`, `5`->`s`, etc.
   - Punctuation stripping / word separator normalization (`f.d.p` -> `fdp`, `c-o-n-n-a-r-d` -> `connard`).
   - Repetition collapsing (`coooonnnnard` -> `connard`).
   - Common toxic abbreviations (`fdp`, `ntm`, `tg`, `ta gueule`, etc.).
2. `toxicity.rs`: Contextual toxicity classification:
   - Distinguish targeted attacks/harassment directed at players from generic gaming frustration or friendly banter.
   - Target extraction: `TargetKind` (explicit user mentions, second person pronouns 'tu', 'toi', 't es', 'te', reply target vs game objects/mobs 'squelette', 'creeper', 'lave', 'lag', 'serveur').
   - Banter / humor detection ('mdr', 'lol', 'xd', 'ptdr', 'gg').
   - Return structured `ToxicityVerdict` with `category`, `is_toxic`, `score`, `target`, `normalized_text`, `detected_words`.
3. `command.rs`: `/test_message` slash command:
   - Option `message` (String).
   - Restricted to `Permissions::MODERATE_MEMBERS`.
   - Returns ephemeral embed showing: Verdict, Target detected, Unmasked/normalized text, Toxicity score.
   - Does NOT delete message or apply sanctions.
4. Antislop & Clean Code:
   - Idiomatic Rust 2024, no placeholder comments, purposeful error handling with `anyhow`.
   - Comprehensive unit tests in `src/modules/automod/leetspeak.rs`, `src/modules/automod/toxicity.rs`, and `tests/anti_toxicity_test.rs`.
5. Run `cargo check` and `cargo test --test anti_toxicity_test` in `/home/leo/Code/Paranoia_New/bot-rust` and ensure 100% pass.
6. Write your handoff to `/home/leo/Code/Paranoia_New/.agents/teamwork/worker_m1/handoff.md` with build/test results, files modified, and notify parent.
