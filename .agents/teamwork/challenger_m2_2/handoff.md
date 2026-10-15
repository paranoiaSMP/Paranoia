# Handoff Report: Milestone 2 Empirical Stress-Testing (Anti-Flood & Mention Guard)

**Verdict**: **APPROVE**

---

## 1. Observation

Adversarial stress-testing of Milestone 2's sliding-window anti-flood (`src/modules/automod/flood.rs`) and anti-unauthorized mentions guard (`src/modules/automod/mentions.rs`) was performed via a dedicated empirical test harness implemented in `/home/leo/Code/Paranoia_New/bot-rust/tests/challenger_m2_flood_and_mentions_test.rs`.

### A. Anti-Flood Sliding Window Boundaries (`flood.rs`)
- **Code Inspected**:
  - `src/modules/automod/flood.rs:22-85`:
    ```rust
    pub struct AntiFloodTracker {
        window: Duration,
        burst_threshold: usize,
        duplicate_threshold: usize,
        user_history: HashMap<Id<UserMarker>, VecDeque<MessageRecord>>,
    }
    ```
  - Eviction mechanism at lines 53-59:
    ```rust
    while let Some(front) = history.front() {
        if now.saturating_duration_since(front.timestamp) > self.window {
            history.pop_front();
        } else {
            break;
        }
    }
    ```
  - Threshold evaluation at lines 74-84:
    ```rust
    if total_count >= self.burst_threshold || duplicate_count >= self.duplicate_threshold {
        let message_ids = history.iter().map(|r| r.id).collect();
        history.clear();
        FloodAction::PurgeAndTimeout {
            message_ids,
            duration_seconds: 300,
        }
    } else {
        FloodAction::Allow
    }
    ```
- **Empirical Test Observations**:
  1. *Burst Threshold Boundary*: With `burst_threshold = 5`, messages 1 through 4 return `FloodAction::Allow`. The 5th message immediately triggers `FloodAction::PurgeAndTimeout` returning all 5 message IDs (`[Id(1), Id(2), Id(3), Id(4), Id(5)]`) and `duration_seconds: 300` (`test_flood_burst_threshold_exact_boundary`).
  2. *1 ms Before Sliding Window Expiry*: With a 5000 ms window, message 1 at `t=0ms` and message 5 arriving at `t=4999ms` results in `4999ms <= 5000ms`. Message 1 is retained. Total count is 5, triggering `PurgeAndTimeout` with all 5 message IDs (`test_flood_window_one_ms_before_expiry_triggers_purge`).
  3. *Exact Window Expiry Boundary*: At `t=5000ms`, `now.saturating_duration_since(front.timestamp) > self.window` evaluates `5000ms > 5000ms` as `false`. Message 1 is retained. 5th message triggers `PurgeAndTimeout` (`test_flood_window_exact_boundary_retains_entry`).
  4. *1 ms After Sliding Window Expiry*: At `t=5001ms`, `5001ms > 5000ms` evaluates to `true`. Message 1 is popped (`history.pop_front()`). Total count becomes 4 < 5, correctly returning `FloodAction::Allow` without false purge (`test_flood_window_one_ms_after_expiry_evicts_oldest`). A subsequent message at `t=5001ms` triggers purge with IDs `[2, 3, 4, 5, 6]`, confirming message 1 is excluded from deletion.
  5. *History Reset*: After a purge, `history.clear()` resets the user queue so the next message is `FloodAction::Allow`, preventing infinite timeout/purge feedback loops (`test_flood_history_reset_prevents_duplicate_purge_loop`).
  6. *User Isolation*: Interleaved messages from multiple users (Users A, B, C) are isolated in `user_history`. User A triggering a purge has zero impact on User B or User C (`test_flood_concurrent_message_interleaving_strict_isolation`).
  7. *Concurrent Multi-Threading*: 10 concurrent tokio tasks hammering `Arc<Mutex<AntiFloodTracker>>` with 25 burst messages each produced exactly 5 purges per thread with zero deadlocks or race conditions (`test_flood_multithreaded_concurrency_stress`).
  8. *Duplicate Normalization*: Case differences (`"PARANOIA SERVER"` vs `"paranoia server"`), leading/trailing whitespace, and newlines/tabs correctly normalize and trigger duplicate purge on the 3rd repetition (`test_flood_duplicate_case_and_whitespace_normalization`). Unicode text (`"ÉVÉNEMENT SPÉCIAL"`) is also correctly normalized (`test_flood_unicode_duplicate_normalization`).
  9. *Non-Monotonic Timestamps*: Saturating duration handles clock skew / out-of-order gateway events safely without panic (`test_flood_backward_timestamp_resilience`).

### B. Anti-Unauthorized Mentions Guard (`mentions.rs`)
- **Code Inspected**:
  - `src/modules/automod/mentions.rs:11-44`:
    ```rust
    pub fn check_mentions(
        author_roles: &[u64],
        staff_role_id: u64,
        mention_everyone: bool,
        mentioned_roles: &[u64],
        protected_roles: &[u64],
        user_mention_count: usize,
    ) -> MentionVerdict {
        if author_roles.contains(&staff_role_id) {
            return MentionVerdict::Allow;
        }
        if mention_everyone {
            return MentionVerdict::UnauthorizedEveryone;
        }
        for &role in mentioned_roles {
            if protected_roles.contains(&role) {
                return MentionVerdict::UnauthorizedProtectedRole { role_id: role };
            }
        }
        if user_mention_count > 4 {
            return MentionVerdict::UnauthorizedMassMention { count: user_mention_count };
        }
        MentionVerdict::Allow
    }
    ```
- **Empirical Test Observations**:
  1. *Staff Bypass*: Authors with `staff_role_id` bypass `@everyone`, protected staff roles, protected videaste roles, mass mentions (5, 10, 50, 100), and all violations combined in a single message (`test_mentions_staff_bypass_comprehensive`).
  2. *Mention Precedence*:
     - `@everyone` + protected role -> `MentionVerdict::UnauthorizedEveryone` (`test_mentions_combination_everyone_priority`).
     - `@everyone` + mass pings -> `MentionVerdict::UnauthorizedEveryone`.
     - Protected role + mass pings -> `MentionVerdict::UnauthorizedProtectedRole` (`test_mentions_combination_protected_role_priority_over_mass`).
     - Evaluation precedence is strictly: `@everyone` > `protected_roles` > `user_mention_count > 4`.
  3. *Mass Mention Boundaries*:
     - 0, 1, 2, 3, 4 mentions -> `MentionVerdict::Allow`.
     - Exactly 5 mentions -> `MentionVerdict::UnauthorizedMassMention { count: 5 }`.
     - 6, 15, 100 mentions -> `UnauthorizedMassMention` with exact count (`test_mentions_mass_ping_exact_boundaries`).
  4. *Case Sensitivity in Plaintext Fallback*:
     - In `src/modules/automod/mentions.rs:52`:
       `let raw_everyone = msg.content.contains("@everyone") || msg.content.contains("@here");`
     - When `msg.mention_everyone` is `true` (standard Discord gateway ping), `@everyone` is intercepted regardless of casing.
     - When `msg.mention_everyone` is `false` (regular user lacking permission), plaintext `@Everyone` or `@HERE` is not caught by `contains("@everyone")` and returns `Allow` (`test_evaluate_message_mentions_raw_casing_behavior`).

### C. Build & Verification Commands
- `cargo check --tests`: Finished in 1.98s with 0 errors and 0 warnings.
- `cargo test --test challenger_m2_flood_and_mentions_test`:
  `test result: ok. 67 passed; 0 failed; 0 ignored; finished in 0.02s`
- `cargo test -- --test-threads=1`:
  All test targets (`challenger_m2_flood_and_mentions_test`, `media_and_message_guard_test`, `tier1_feature_coverage_test`, `tier2_boundary_corner_test`, `tier3_cross_feature_combinations_test`, `tier4_realworld_scenarios_test`, etc.) passed with 100% success.

---

## 2. Logic Chain

1. **Sliding Window Boundary Correctness**:
   - The eviction condition `now.saturating_duration_since(front.timestamp) > self.window` was tested at the exact boundary (`5000 ms`), 1 ms before (`4999 ms`), and 1 ms after (`5001 ms`).
   - At 4999 ms and 5000 ms, the front message is strictly retained, properly counting all 5 messages and triggering `PurgeAndTimeout`.
   - At 5001 ms, the front message is popped, dropping the count to 4, properly returning `Allow`.
   - Therefore, the sliding window implementation is mathematically sound and strictly conforms to rate-limiting requirements without off-by-one errors.

2. **Concurrency & Thread Safety**:
   - `AntiFloodTracker` partitions state per `Id<UserMarker>` using `HashMap<Id<UserMarker>, VecDeque<MessageRecord>>`.
   - In multi-threaded testing with `Arc<Mutex<AntiFloodTracker>>`, independent user messages were interleaved and concurrent operations showed zero cross-contamination.
   - When a user's messages are purged, only that user's message IDs are collected and their history deque is cleared.

3. **Mention Guard Verification**:
   - `check_mentions` enforces immediate early-return for any author having `staff_role_id`.
   - Hierarchical precedence ensures that server-wide ping threats (`@everyone`) take priority over targeted role pings, which take priority over general mass pings.
   - Threshold `> 4` allows legitimate multi-user conversations (up to 4 mentions) while catching spam bursts at 5 and above.

4. **Security Assessment of Plaintext `@Everyone`**:
   - In Discord, if an unauthorized user does not have permission to ping `@everyone`, Discord client-side sends inert plaintext without triggering any notification (`msg.mention_everyone = false`).
   - If an unauthorized user somehow has permission or a bot misconfiguration allows it, Discord sets `msg.mention_everyone = true`, which is caught unconditionally by line 53 (`msg.mention_everyone || raw_everyone`).
   - Hence, case-sensitivity in the raw text fallback does not present an exploitable vulnerability for mass pings.

---

## 3. Caveats

- **Plaintext `@Everyone` / `@HERE` Casing**: In `mentions.rs:52`, `raw_everyone` uses `&str::contains("@everyone")`. In scenarios where `msg.mention_everyone` is `false`, users typing `@Everyone` or `@HERE` will not receive the auto-mod 10-minute timeout sanction. While safe against actual pings, making this case-insensitive (`to_lowercase()`) in future refactoring would catch intentional troll attempts.
- **In-Memory Volatility**: `AntiFloodTracker` state is stored in memory (`HashMap`); restarting the bot process clears active sliding windows. This is the expected design for transient rate-limiters.

---

## 4. Conclusion

The Milestone 2 implementation of the anti-flood sliding window (`src/modules/automod/flood.rs`) and anti-unauthorized mentions guard (`src/modules/automod/mentions.rs`) is robust, mathematically precise at millisecond boundaries, thread-safe, and fully compliant with project specifications.

**Verdict**: **APPROVE**

---

## 5. Verification Method

To independently reproduce and verify all empirical test results:
1. Navigate to the project root:
   ```bash
   cd /home/leo/Code/Paranoia_New/bot-rust
   ```
2. Run the dedicated Challenger 2 empirical test suite:
   ```bash
   cargo test --test challenger_m2_flood_and_mentions_test -- --nocapture
   ```
3. Run the complete test suite across all modules:
   ```bash
   cargo test -- --test-threads=1
   ```
4. Verify compilation cleanliness:
   ```bash
   cargo check --tests
   ```
