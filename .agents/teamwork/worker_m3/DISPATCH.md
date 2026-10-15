## 2026-10-14T20:31:45Z
You are Milestone 3 Worker for the Paranoia SMP Discord bot moderation and security suite project.
Your identity: Milestone 3 Worker
Your working directory: /home/leo/Code/Paranoia_New/.agents/teamwork/worker_m3
Target codebase: /home/leo/Code/Paranoia_New/bot-rust
Original Request: /home/leo/Code/Paranoia_New/.agents/teamwork/ORIGINAL_REQUEST.md
Project Spec: /home/leo/Code/Paranoia_New/.agents/teamwork/PROJECT.md
Survey Analysis: /home/leo/Code/Paranoia_New/.agents/teamwork/explorer_survey_security/analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You MUST read /home/leo/Code/Paranoia_New/.agents/teamwork/ORIGINAL_REQUEST.md and /home/leo/Code/Paranoia_New/.agents/teamwork/PROJECT.md before starting work.
Your task: Implement Milestone 3: R3 Anti-Raid Join-Velocity Engine in `/home/leo/Code/Paranoia_New/bot-rust`.

Exclusive file ownership:
- `src/modules/security.rs`
- `tests/anti_raid_test.rs`
(and any required setting updates in `src/modules/mod.rs`).

Specific implementation requirements for R3:
1. Pure, Deterministic Sliding-Window Join Engine (`GuildRaidState`):
   - Track `JoinRecord { user_id: Id<UserMarker>, joined_at: Instant }`.
   - Implement `evaluate_join(&mut self, user_id: Id<UserMarker>, now: Instant, window: Duration, limit: usize, lockdown_duration: Duration) -> JoinDecision` (or matching `PROJECT.md § Interface Contracts`).
   - Pure algorithm parameterized by `now: Instant`:
     - Prunes join records older than `window` using `now.duration_since(record.joined_at) > window` (or `saturating_duration_since`).
     - Appends new `JoinRecord`.
     - If active lockdown is in effect (`now < expires_at`), returns `JoinDecision::KickRaidMember { user_id }` (or `RejectLocked`).
     - If count >= `limit` (e.g. >10 joins in 5s), drains all suspect records in the burst window into `suspect_user_ids` and returns `JoinDecision::TriggerLockdown { suspect_user_ids, reason }`.
     - Otherwise returns `JoinDecision::Allow`.
2. Automatic Suspect Wave Kick Sequence:
   - When `TriggerLockdown` is returned, iterate over all `suspect_user_ids` and kick each member using `http.remove_guild_member(guild_id, suspect_id).reason("Anti-raid: suspect raid wave account").await`.
3. Channel Permission Overwrite Lockdown & Restoration:
   - When lockdown triggers:
     - Query guild channels via `http.guild_channels(guild_id)`.
     - For each text/announcement/forum/voice channel:
       - Record existing `@everyone` role overwrite (`had_overwrite`, `original_allow`, `original_deny`) in `ChannelOverwriteBackup`.
       - Restrict `@everyone` role (`Id::new(guild_id.get())`) permissions by adding deny bits: `SEND_MESSAGES`, `SEND_MESSAGES_IN_THREADS`, `CREATE_PUBLIC_THREADS`, `CREATE_PRIVATE_THREADS`, `ADD_REACTIONS`, `SPEAK`.
       - Update permission overwrite using `http.update_channel_permission(channel_id, &overwrite)`.
     - Also set guild verification level to `VerificationLevel::VeryHigh`.
   - When lockdown ends (via timeout expiry or `/verrouillage off`):
     - Restore each channel's original `@everyone` overwrite: if `had_overwrite`, restore with `http.update_channel_permission`; if none previously existed, delete with `http.delete_channel_permission(channel_id).role(role_id)`.
     - Revert guild verification level to `previous_verification_level`.
4. Command `/verrouillage`:
   - Subcommands `on`, `off`, `statut` remain supported and properly trigger/lift channel permission lockdown and state.
5. Unit & Integration Test Suite (`tests/anti_raid_test.rs`):
   - Normal join velocity (joins below threshold are Allowed).
   - Burst threshold trigger (e.g. 10 joins in 5s triggers lockdown and extracts all 10 suspect user IDs).
   - Suspect wave tracking (verify all accounts during burst are identified for kicking).
   - Active lockdown incoming member rejection (subsequent joins rejected during lockdown).
   - Window expiration (joins spread across time do not trigger lockdown).
   - Channel permission overwrite calculation and restore logic.
   - Non-monotonic timestamp resilience (clock skew).
6. Antislop & Clean Code:
   - Idiomatic Rust 2024, zero placeholder comments, purposeful error handling with `anyhow`.
   - Ensure `cargo check` and `cargo test --test anti_raid_test` pass cleanly with 0 warnings and 0 errors.

Write your handoff to `/home/leo/Code/Paranoia_New/.agents/teamwork/worker_m3/handoff.md` and notify parent.
