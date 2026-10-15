#[path = "../src/utils/mod.rs"]
pub mod utils;

#[path = "../src/modules/automod/mod.rs"]
pub mod automod;

use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;
use twilight_model::channel::Message;
use twilight_model::id::Id;

use automod::{
    check_mentions, evaluate_message_mentions, AntiFloodTracker, FloodAction, MentionVerdict,
};

// ============================================================================
// PART 1: Anti-Flood Sliding Window Empirical Stress Tests (flood.rs)
// ============================================================================

/// 1.1 Exact Burst Threshold Boundary:
/// Burst threshold = 5 in 5s.
/// 4 messages -> all Allow.
/// 5th message -> PurgeAndTimeout with exactly 5 message IDs.
#[test]
fn test_flood_burst_threshold_exact_boundary() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 5, 3);
    let user_id = Id::new(1001);
    let now = Instant::now();

    for i in 1..=4 {
        let action = tracker.record_and_evaluate(
            user_id,
            Id::new(i),
            &format!("unique message {}", i),
            now + Duration::from_millis(i * 100),
        );
        assert_eq!(
            action,
            FloodAction::Allow,
            "Message {} under threshold must be Allowed",
            i
        );
    }

    // 5th message hits burst_threshold of 5
    let action_5 = tracker.record_and_evaluate(
        user_id,
        Id::new(5),
        "unique message 5",
        now + Duration::from_millis(500),
    );

    match action_5 {
        FloodAction::PurgeAndTimeout {
            message_ids,
            duration_seconds,
        } => {
            assert_eq!(message_ids.len(), 5, "Must purge exactly 5 messages");
            assert_eq!(
                message_ids,
                vec![
                    Id::new(1),
                    Id::new(2),
                    Id::new(3),
                    Id::new(4),
                    Id::new(5)
                ],
                "Must return all 5 message IDs in order"
            );
            assert_eq!(duration_seconds, 300, "Timeout duration must be 300s");
        }
        FloodAction::Allow => panic!("5th message at threshold 5 MUST trigger PurgeAndTimeout"),
    }
}

/// 1.2 Extreme Threshold: Threshold = 1 triggers immediately on first message.
#[test]
fn test_flood_burst_threshold_one_triggers_immediately() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 1, 3);
    let user_id = Id::new(1002);
    let now = Instant::now();

    let action = tracker.record_and_evaluate(user_id, Id::new(42), "instant burst", now);
    match action {
        FloodAction::PurgeAndTimeout {
            message_ids,
            duration_seconds,
        } => {
            assert_eq!(message_ids, vec![Id::new(42)]);
            assert_eq!(duration_seconds, 300);
        }
        FloodAction::Allow => panic!("Threshold 1 must trigger on first message"),
    }
}

/// 1.3 High Burst Threshold: 100 messages boundary.
#[test]
fn test_flood_high_burst_threshold_boundary() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(10), 100, 50);
    let user_id = Id::new(1003);
    let now = Instant::now();

    for i in 1..100 {
        let action = tracker.record_and_evaluate(
            user_id,
            Id::new(i),
            &format!("stress msg {}", i),
            now + Duration::from_millis(i * 10),
        );
        assert_eq!(action, FloodAction::Allow);
    }

    let action_100 = tracker.record_and_evaluate(
        user_id,
        Id::new(100),
        "stress msg 100",
        now + Duration::from_millis(1000),
    );
    match action_100 {
        FloodAction::PurgeAndTimeout { message_ids, .. } => {
            assert_eq!(message_ids.len(), 100);
        }
        FloodAction::Allow => panic!("100th message must trigger PurgeAndTimeout"),
    }
}

/// 1.4 History Reset After Purge:
/// Once a purge occurs, history is cleared so subsequent messages start fresh.
#[test]
fn test_flood_history_reset_prevents_duplicate_purge_loop() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 3, 3);
    let user_id = Id::new(1004);
    let now = Instant::now();

    tracker.record_and_evaluate(user_id, Id::new(1), "msg 1", now);
    tracker.record_and_evaluate(user_id, Id::new(2), "msg 2", now);
    let action_3 = tracker.record_and_evaluate(user_id, Id::new(3), "msg 3", now);
    assert!(matches!(action_3, FloodAction::PurgeAndTimeout { .. }));

    // 4th message arrives immediately after purge
    let action_4 = tracker.record_and_evaluate(user_id, Id::new(4), "msg 4", now);
    assert_eq!(
        action_4,
        FloodAction::Allow,
        "Message immediately after purge must start a fresh window"
    );
}

/// 1.5 Sliding Window 1 ms Before Expiry:
/// Window is 5000 ms.
/// Msg 1 at t=0 ms.
/// Msgs 2..4 at t=1000, 2000, 3000 ms.
/// Msg 5 at t=4999 ms (1 ms before 5000 ms expiry).
/// Expected: Msg 1 is NOT expired yet (4999 <= 5000). PurgeAndTimeout triggers!
#[test]
fn test_flood_window_one_ms_before_expiry_triggers_purge() {
    let window = Duration::from_millis(5000);
    let mut tracker = AntiFloodTracker::new(window, 5, 5);
    let user_id = Id::new(1005);
    let t0 = Instant::now();

    assert_eq!(
        tracker.record_and_evaluate(user_id, Id::new(1), "m1", t0),
        FloodAction::Allow
    );
    assert_eq!(
        tracker.record_and_evaluate(user_id, Id::new(2), "m2", t0 + Duration::from_millis(1000)),
        FloodAction::Allow
    );
    assert_eq!(
        tracker.record_and_evaluate(user_id, Id::new(3), "m3", t0 + Duration::from_millis(2000)),
        FloodAction::Allow
    );
    assert_eq!(
        tracker.record_and_evaluate(user_id, Id::new(4), "m4", t0 + Duration::from_millis(3000)),
        FloodAction::Allow
    );

    // 1 ms BEFORE window expires: t = 4999 ms
    let t_before = t0 + Duration::from_millis(4999);
    let action = tracker.record_and_evaluate(user_id, Id::new(5), "m5", t_before);

    match action {
        FloodAction::PurgeAndTimeout {
            message_ids,
            duration_seconds,
        } => {
            assert_eq!(
                message_ids.len(),
                5,
                "All 5 messages must be retained and purged at 1 ms before expiry"
            );
            assert_eq!(
                message_ids,
                vec![
                    Id::new(1),
                    Id::new(2),
                    Id::new(3),
                    Id::new(4),
                    Id::new(5)
                ]
            );
            assert_eq!(duration_seconds, 300);
        }
        FloodAction::Allow => {
            panic!("Expected PurgeAndTimeout at 1 ms before window expiry, but got Allow")
        }
    }
}

/// 1.6 Sliding Window Exactly At Expiry Boundary:
/// In `flood.rs`, eviction condition is: `now.saturating_duration_since(front.timestamp) > self.window`.
/// At t = 5000 ms, duration is exactly 5000 ms.
/// 5000 ms > 5000 ms is FALSE.
/// Therefore Msg 1 is NOT evicted at exactly window expiry. PurgeAndTimeout triggers!
#[test]
fn test_flood_window_exact_boundary_retains_entry() {
    let window = Duration::from_millis(5000);
    let mut tracker = AntiFloodTracker::new(window, 5, 5);
    let user_id = Id::new(1006);
    let t0 = Instant::now();

    tracker.record_and_evaluate(user_id, Id::new(1), "m1", t0);
    tracker.record_and_evaluate(user_id, Id::new(2), "m2", t0 + Duration::from_millis(1000));
    tracker.record_and_evaluate(user_id, Id::new(3), "m3", t0 + Duration::from_millis(2000));
    tracker.record_and_evaluate(user_id, Id::new(4), "m4", t0 + Duration::from_millis(3000));

    // Exactly AT window expiry: t = 5000 ms
    let t_exact = t0 + Duration::from_millis(5000);
    let action = tracker.record_and_evaluate(user_id, Id::new(5), "m5", t_exact);

    match action {
        FloodAction::PurgeAndTimeout { message_ids, .. } => {
            assert_eq!(
                message_ids.len(),
                5,
                "At exact boundary (5000ms), Msg 1 is still within window"
            );
        }
        FloodAction::Allow => panic!("Expected PurgeAndTimeout at exact window boundary"),
    }
}

/// 1.7 Sliding Window 1 ms After Expiry:
/// Window is 5000 ms.
/// Msg 1 at t=0 ms.
/// Msgs 2..4 at t=1000, 2000, 3000 ms.
/// Msg 5 at t=5001 ms (1 ms AFTER 5000 ms expiry).
/// Expected: Msg 1 is evicted (5001 ms > 5000 ms).
/// Remaining count = 3 + 1 = 4 < 5.
/// Expected: FloodAction::Allow!
#[test]
fn test_flood_window_one_ms_after_expiry_evicts_oldest() {
    let window = Duration::from_millis(5000);
    let mut tracker = AntiFloodTracker::new(window, 5, 5);
    let user_id = Id::new(1007);
    let t0 = Instant::now();

    tracker.record_and_evaluate(user_id, Id::new(1), "m1", t0);
    tracker.record_and_evaluate(user_id, Id::new(2), "m2", t0 + Duration::from_millis(1000));
    tracker.record_and_evaluate(user_id, Id::new(3), "m3", t0 + Duration::from_millis(2000));
    tracker.record_and_evaluate(user_id, Id::new(4), "m4", t0 + Duration::from_millis(3000));

    // 1 ms AFTER window expires: t = 5001 ms
    let t_after = t0 + Duration::from_millis(5001);
    let action = tracker.record_and_evaluate(user_id, Id::new(5), "m5", t_after);

    assert_eq!(
        action,
        FloodAction::Allow,
        "Msg 1 must be evicted at 1 ms after expiry, leaving 4 messages (Allow)"
    );

    // If a 6th message arrives immediately at t=5001 ms, count becomes 5 -> Purge!
    // But purged messages must ONLY include [2, 3, 4, 5, 6], NOT message 1!
    let action_6 = tracker.record_and_evaluate(user_id, Id::new(6), "m6", t_after);
    match action_6 {
        FloodAction::PurgeAndTimeout { message_ids, .. } => {
            assert_eq!(
                message_ids,
                vec![
                    Id::new(2),
                    Id::new(3),
                    Id::new(4),
                    Id::new(5),
                    Id::new(6)
                ],
                "Purged messages must NOT contain evicted message 1"
            );
        }
        FloodAction::Allow => panic!("Expected 6th message to trigger purge"),
    }
}

/// 1.8 Multiple Expired Messages Evicted Together:
/// 3 messages at t=0, 10, 20 ms.
/// Window is 1000 ms.
/// 4th message at t=1025 ms.
/// All 3 messages must be evicted together. History length becomes 1.
#[test]
fn test_flood_multiple_expired_messages_evicted() {
    let window = Duration::from_millis(1000);
    let mut tracker = AntiFloodTracker::new(window, 4, 4);
    let user_id = Id::new(1008);
    let t0 = Instant::now();

    tracker.record_and_evaluate(user_id, Id::new(1), "m1", t0);
    tracker.record_and_evaluate(user_id, Id::new(2), "m2", t0 + Duration::from_millis(10));
    tracker.record_and_evaluate(user_id, Id::new(3), "m3", t0 + Duration::from_millis(20));

    let action = tracker.record_and_evaluate(
        user_id,
        Id::new(4),
        "m4",
        t0 + Duration::from_millis(1025),
    );
    assert_eq!(
        action,
        FloodAction::Allow,
        "All 3 older messages expired, only m4 remains"
    );
}

/// 1.9 Concurrent Message Interleaving (Users A, B, C):
/// Multiple users send interleaved messages. Verifies that user histories are strictly isolated
/// and User A triggering a purge does NOT clear or contaminate User B's or C's history.
#[test]
fn test_flood_concurrent_message_interleaving_strict_isolation() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 5, 3);
    let user_a = Id::new(2001);
    let user_b = Id::new(2002);
    let user_c = Id::new(2003);
    let now = Instant::now();

    // Interleave messages: A1, B1, C1, A2, B2, C2, A3, B3, C3, A4, B4, C4
    for i in 1..=4 {
        assert_eq!(
            tracker.record_and_evaluate(user_a, Id::new(100 + i), &format!("A {}", i), now),
            FloodAction::Allow
        );
        assert_eq!(
            tracker.record_and_evaluate(user_b, Id::new(200 + i), &format!("B {}", i), now),
            FloodAction::Allow
        );
        assert_eq!(
            tracker.record_and_evaluate(user_c, Id::new(300 + i), &format!("C {}", i), now),
            FloodAction::Allow
        );
    }

    // User A sends 5th message -> Triggers purge for A
    let action_a5 = tracker.record_and_evaluate(user_a, Id::new(105), "A 5", now);
    match action_a5 {
        FloodAction::PurgeAndTimeout { message_ids, .. } => {
            assert_eq!(
                message_ids,
                vec![
                    Id::new(101),
                    Id::new(102),
                    Id::new(103),
                    Id::new(104),
                    Id::new(105)
                ],
                "User A purge must contain only User A messages"
            );
        }
        FloodAction::Allow => panic!("User A must trigger purge"),
    }

    // User B sends 5th message -> Triggers purge for B with strictly B's messages
    let action_b5 = tracker.record_and_evaluate(user_b, Id::new(205), "B 5", now);
    match action_b5 {
        FloodAction::PurgeAndTimeout { message_ids, .. } => {
            assert_eq!(
                message_ids,
                vec![
                    Id::new(201),
                    Id::new(202),
                    Id::new(203),
                    Id::new(204),
                    Id::new(205)
                ],
                "User B purge must contain only User B messages"
            );
        }
        FloodAction::Allow => panic!("User B must trigger purge"),
    }

    // User C did NOT send a 5th message -> C has not triggered
    // User C sends a message 6 seconds later -> Window expired, Allowed
    let action_c_future = tracker.record_and_evaluate(
        user_c,
        Id::new(305),
        "C future",
        now + Duration::from_secs(6),
    );
    assert_eq!(action_c_future, FloodAction::Allow);
}

/// 1.10 Multi-Threaded Concurrency Stress Test:
/// Wrap AntiFloodTracker in Arc<Mutex<AntiFloodTracker>>, spawn 10 concurrent tokio tasks
/// sending 30 messages each. Verify no deadlocks, no race conditions, accurate purge results.
#[tokio::test]
async fn test_flood_multithreaded_concurrency_stress() {
    let tracker = Arc::new(Mutex::new(AntiFloodTracker::new(
        Duration::from_millis(500),
        5,
        3,
    )));
    let mut handles = Vec::new();

    for user_idx in 1..=10 {
        let tracker_clone = Arc::clone(&tracker);
        let handle = tokio::spawn(async move {
            let user_id = Id::new(user_idx as u64);
            let mut purge_count = 0;
            let start = Instant::now();

            for msg_idx in 1..=25 {
                let mut trk = tracker_clone.lock().await;
                let action = trk.record_and_evaluate(
                    user_id,
                    Id::new(user_idx * 1000 + msg_idx),
                    &format!("thread msg {}", msg_idx),
                    start + Duration::from_millis(msg_idx * 5),
                );
                if let FloodAction::PurgeAndTimeout { message_ids, .. } = action {
                    assert_eq!(message_ids.len(), 5, "Each purge must contain 5 messages");
                    purge_count += 1;
                }
            }
            purge_count
        });
        handles.push(handle);
    }

    for handle in handles {
        let purges = handle.await.expect("Task must not panic");
        // 25 messages with threshold 5 and window 500ms -> should trigger exactly 5 purges (messages 5, 10, 15, 20, 25)
        assert_eq!(
            purges, 5,
            "Each worker thread must trigger exactly 5 purges for 25 burst messages"
        );
    }
}

/// 1.11 Duplicate Repetition: Exact Duplicate Threshold Boundary (threshold = 3)
#[test]
fn test_flood_duplicate_threshold_exact_boundary() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 10, 3);
    let user_id = Id::new(3001);
    let now = Instant::now();

    assert_eq!(
        tracker.record_and_evaluate(user_id, Id::new(1), "same message", now),
        FloodAction::Allow
    );
    assert_eq!(
        tracker.record_and_evaluate(
            user_id,
            Id::new(2),
            "same message",
            now + Duration::from_millis(100)
        ),
        FloodAction::Allow
    );

    // 3rd identical message hits duplicate threshold of 3
    let action_3 = tracker.record_and_evaluate(
        user_id,
        Id::new(3),
        "same message",
        now + Duration::from_millis(200),
    );
    match action_3 {
        FloodAction::PurgeAndTimeout {
            message_ids,
            duration_seconds,
        } => {
            assert_eq!(message_ids.len(), 3);
            assert_eq!(
                message_ids,
                vec![Id::new(1), Id::new(2), Id::new(3)]
            );
            assert_eq!(duration_seconds, 300);
        }
        FloodAction::Allow => panic!("3rd identical message must trigger PurgeAndTimeout"),
    }
}

/// 1.12 Duplicate Repetition: Case-Insensitivity & Whitespace Normalization
#[test]
fn test_flood_duplicate_case_and_whitespace_normalization() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 10, 3);
    let user_id = Id::new(3002);
    let now = Instant::now();

    // 1st: lowercase
    assert_eq!(
        tracker.record_and_evaluate(user_id, Id::new(1), "paranoia server", now),
        FloodAction::Allow
    );
    // 2nd: uppercase with trailing whitespace
    assert_eq!(
        tracker.record_and_evaluate(
            user_id,
            Id::new(2),
            "  PARANOIA SERVER   ",
            now + Duration::from_millis(100)
        ),
        FloodAction::Allow
    );
    // 3rd: mixed case with leading tabs/newlines
    let action_3 = tracker.record_and_evaluate(
        user_id,
        Id::new(3),
        "\t\nParanoia Server\n",
        now + Duration::from_millis(200),
    );

    match action_3 {
        FloodAction::PurgeAndTimeout { message_ids, .. } => {
            assert_eq!(message_ids.len(), 3);
        }
        FloodAction::Allow => {
            panic!("Normalized identical repetition must trigger PurgeAndTimeout")
        }
    }
}

/// 1.13 Duplicate Repetition Interleaved with Non-Duplicates:
/// Spammer interleaves duplicate "spam" with random words: "spam", "abc", "spam", "xyz", "spam".
/// All 5 messages are within window. When 3rd "spam" arrives, duplicate count is 3.
/// Purge must trigger and return all 5 messages in history.
#[test]
fn test_flood_duplicate_interleaved_with_noise_purges_all() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 10, 3);
    let user_id = Id::new(3003);
    let now = Instant::now();

    tracker.record_and_evaluate(user_id, Id::new(1), "spam payload", now);
    tracker.record_and_evaluate(user_id, Id::new(2), "noise 1", now + Duration::from_millis(50));
    tracker.record_and_evaluate(user_id, Id::new(3), "spam payload", now + Duration::from_millis(100));
    tracker.record_and_evaluate(user_id, Id::new(4), "noise 2", now + Duration::from_millis(150));

    let action_5 = tracker.record_and_evaluate(
        user_id,
        Id::new(5),
        "spam payload",
        now + Duration::from_millis(200),
    );

    match action_5 {
        FloodAction::PurgeAndTimeout { message_ids, .. } => {
            assert_eq!(
                message_ids.len(),
                5,
                "All messages in active burst history must be purged"
            );
            assert_eq!(
                message_ids,
                vec![
                    Id::new(1),
                    Id::new(2),
                    Id::new(3),
                    Id::new(4),
                    Id::new(5)
                ]
            );
        }
        FloodAction::Allow => panic!("3rd duplicate repetition must trigger PurgeAndTimeout"),
    }
}

/// 1.14 Duplicate Repetition 1 ms Before Expiry vs 1 ms After Expiry:
/// Repetition 1 at t=0 ms.
/// Repetition 2 at t=1000 ms.
/// If Repetition 3 arrives at t=4999 ms (1 ms before 5000 ms window) -> Triggers!
/// If Repetition 3 arrives at t=5001 ms (1 ms after 5000 ms window) -> Repetition 1 expired, Allowed!
#[test]
fn test_flood_duplicate_expiry_boundaries() {
    let window = Duration::from_millis(5000);
    let t0 = Instant::now();

    // Case A: 1 ms before expiry -> triggers
    {
        let mut tracker = AntiFloodTracker::new(window, 10, 3);
        let user_id = Id::new(3004);
        tracker.record_and_evaluate(user_id, Id::new(1), "repeat", t0);
        tracker.record_and_evaluate(
            user_id,
            Id::new(2),
            "repeat",
            t0 + Duration::from_millis(1000),
        );
        let action = tracker.record_and_evaluate(
            user_id,
            Id::new(3),
            "repeat",
            t0 + Duration::from_millis(4999),
        );
        assert!(
            matches!(action, FloodAction::PurgeAndTimeout { .. }),
            "Duplicate at 4999ms must trigger purge"
        );
    }

    // Case B: 1 ms after expiry -> message 1 expired, only 2 remain -> Allowed
    {
        let mut tracker = AntiFloodTracker::new(window, 10, 3);
        let user_id = Id::new(3005);
        tracker.record_and_evaluate(user_id, Id::new(1), "repeat", t0);
        tracker.record_and_evaluate(
            user_id,
            Id::new(2),
            "repeat",
            t0 + Duration::from_millis(1000),
        );
        let action = tracker.record_and_evaluate(
            user_id,
            Id::new(3),
            "repeat",
            t0 + Duration::from_millis(5001),
        );
        assert_eq!(
            action,
            FloodAction::Allow,
            "At 5001ms, message 1 expired so only 2 duplicates exist (Allowed)"
        );
    }
}

/// 1.15 Empty and Whitespace Repetition:
/// Messages with whitespace only ("   ", "\t\t") normalize to "" and trigger duplicate threshold.
#[test]
fn test_flood_whitespace_repetition_normalized() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 10, 3);
    let user_id = Id::new(3006);
    let now = Instant::now();

    assert_eq!(
        tracker.record_and_evaluate(user_id, Id::new(1), "   ", now),
        FloodAction::Allow
    );
    assert_eq!(
        tracker.record_and_evaluate(user_id, Id::new(2), "\t\n  ", now),
        FloodAction::Allow
    );
    let action_3 = tracker.record_and_evaluate(user_id, Id::new(3), "", now);
    assert!(
        matches!(action_3, FloodAction::PurgeAndTimeout { .. }),
        "Whitespace-only duplicate messages must trigger purge"
    );
}

/// 1.16 Clear User and Clear All Utilities
#[test]
fn test_flood_clear_user_and_clear_all() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 3, 3);
    let u1 = Id::new(4001);
    let u2 = Id::new(4002);
    let now = Instant::now();

    tracker.record_and_evaluate(u1, Id::new(1), "a", now);
    tracker.record_and_evaluate(u1, Id::new(2), "b", now);
    tracker.record_and_evaluate(u2, Id::new(10), "x", now);

    // Clear user 1
    tracker.clear_user(u1);
    // User 1 sends a message -> count is 1, not 3
    let action_u1 = tracker.record_and_evaluate(u1, Id::new(3), "c", now);
    assert_eq!(action_u1, FloodAction::Allow);

    // Clear all
    tracker.clear_all();
    tracker.record_and_evaluate(u2, Id::new(11), "y", now);
    let action_u2 = tracker.record_and_evaluate(u2, Id::new(12), "z", now);
    assert_eq!(action_u2, FloodAction::Allow);
}

/// 1.17 Clock Skew & Out-of-Order Gateway Timestamp Resilience:
/// If gateway events arrive with out-of-order timestamps (now < front.timestamp),
/// saturating_duration_since returns Duration::ZERO without panic.
#[test]
fn test_flood_backward_timestamp_resilience() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 5, 3);
    let user_id = Id::new(4003);
    let now = Instant::now();

    // Msg 1 at t=10s
    tracker.record_and_evaluate(user_id, Id::new(1), "first", now + Duration::from_secs(10));
    // Msg 2 arrives with earlier timestamp t=5s (clock skew / network delay)
    let action = tracker.record_and_evaluate(user_id, Id::new(2), "second", now + Duration::from_secs(5));
    assert_eq!(action, FloodAction::Allow, "Must not panic on non-monotonic timestamps");
}

/// 1.18 Unicode Duplicate Repetition:
/// Accented characters and unicode text are correctly normalized by to_lowercase().
#[test]
fn test_flood_unicode_duplicate_normalization() {
    let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 10, 3);
    let user_id = Id::new(4004);
    let now = Instant::now();

    tracker.record_and_evaluate(user_id, Id::new(1), "ÉVÉNEMENT SPÉCIAL", now);
    tracker.record_and_evaluate(user_id, Id::new(2), "événement spécial", now + Duration::from_millis(100));
    let action_3 = tracker.record_and_evaluate(user_id, Id::new(3), "  Événement Spécial  ", now + Duration::from_millis(200));

    match action_3 {
        FloodAction::PurgeAndTimeout { message_ids, .. } => {
            assert_eq!(message_ids.len(), 3, "Unicode duplicates must trigger repetition purge");
        }
        FloodAction::Allow => panic!("Expected unicode duplicate repetition purge"),
    }
}


// ============================================================================
// PART 2: Anti-Unauthorized Mentions Guard Empirical Tests (mentions.rs)
// ============================================================================

const STAFF_ROLE_ID: u64 = 999_001;
const VIDEASTE_ROLE_ID: u64 = 888_001;
const PLAYER_ROLE_ID: u64 = 111_001;
const PROTECTED_ROLES: &[u64] = &[STAFF_ROLE_ID, VIDEASTE_ROLE_ID];

/// 2.1 Staff Bypass Verification:
/// Staff role author bypasses ALL mention restrictions individually and combined.
#[test]
fn test_mentions_staff_bypass_comprehensive() {
    let staff_roles = [PLAYER_ROLE_ID, STAFF_ROLE_ID];

    // Staff mentions @everyone -> Allowed
    assert_eq!(
        check_mentions(&staff_roles, STAFF_ROLE_ID, true, &[], PROTECTED_ROLES, 0),
        MentionVerdict::Allow,
        "Staff must bypass @everyone restriction"
    );

    // Staff mentions protected role (staff) -> Allowed
    assert_eq!(
        check_mentions(
            &staff_roles,
            STAFF_ROLE_ID,
            false,
            &[STAFF_ROLE_ID],
            PROTECTED_ROLES,
            0
        ),
        MentionVerdict::Allow,
        "Staff must bypass protected staff role restriction"
    );

    // Staff mentions protected role (videaste) -> Allowed
    assert_eq!(
        check_mentions(
            &staff_roles,
            STAFF_ROLE_ID,
            false,
            &[VIDEASTE_ROLE_ID],
            PROTECTED_ROLES,
            0
        ),
        MentionVerdict::Allow,
        "Staff must bypass protected videaste role restriction"
    );

    // Staff mass mentions (5, 10, 50, 100 users) -> Allowed
    for count in [5, 10, 50, 100] {
        assert_eq!(
            check_mentions(
                &staff_roles,
                STAFF_ROLE_ID,
                false,
                &[],
                PROTECTED_ROLES,
                count
            ),
            MentionVerdict::Allow,
            "Staff must bypass mass mention (count = {})",
            count
        );
    }

    // Staff combines ALL violations simultaneously: @everyone + protected roles + 50 user mentions
    assert_eq!(
        check_mentions(
            &staff_roles,
            STAFF_ROLE_ID,
            true,
            &[STAFF_ROLE_ID, VIDEASTE_ROLE_ID],
            PROTECTED_ROLES,
            50
        ),
        MentionVerdict::Allow,
        "Staff must bypass combined violations"
    );
}

/// 2.2 Non-Staff Roles Rejection:
/// Regular players, empty roles, or users with multiple non-staff roles are blocked.
#[test]
fn test_mentions_non_staff_strictly_enforced() {
    let regular_roles = [PLAYER_ROLE_ID, 222_002, 333_003];
    let empty_roles: [u64; 0] = [];

    // Regular user with roles mentioning @everyone -> Blocked
    assert_eq!(
        check_mentions(&regular_roles, STAFF_ROLE_ID, true, &[], PROTECTED_ROLES, 0),
        MentionVerdict::UnauthorizedEveryone
    );

    // User with no roles mentioning @everyone -> Blocked
    assert_eq!(
        check_mentions(&empty_roles, STAFF_ROLE_ID, true, &[], PROTECTED_ROLES, 0),
        MentionVerdict::UnauthorizedEveryone
    );

    // User with role ID close to staff role (e.g. 999_000 vs 999_001) -> Blocked
    assert_eq!(
        check_mentions(&[999_000], STAFF_ROLE_ID, true, &[], PROTECTED_ROLES, 0),
        MentionVerdict::UnauthorizedEveryone
    );
}

/// 2.3 Precedence & Combinations: @everyone takes highest priority
#[test]
fn test_mentions_combination_everyone_priority() {
    let regular_roles = [PLAYER_ROLE_ID];

    // Combination 1: @everyone + protected role -> UnauthorizedEveryone
    let v1 = check_mentions(
        &regular_roles,
        STAFF_ROLE_ID,
        true,
        &[STAFF_ROLE_ID],
        PROTECTED_ROLES,
        0,
    );
    assert_eq!(
        v1,
        MentionVerdict::UnauthorizedEveryone,
        "@everyone must take priority over protected role"
    );

    // Combination 2: @everyone + mass mention (10 users) -> UnauthorizedEveryone
    let v2 = check_mentions(
        &regular_roles,
        STAFF_ROLE_ID,
        true,
        &[],
        PROTECTED_ROLES,
        10,
    );
    assert_eq!(
        v2,
        MentionVerdict::UnauthorizedEveryone,
        "@everyone must take priority over mass mentions"
    );

    // Combination 3: @everyone + protected role + mass mention (20 users) -> UnauthorizedEveryone
    let v3 = check_mentions(
        &regular_roles,
        STAFF_ROLE_ID,
        true,
        &[VIDEASTE_ROLE_ID],
        PROTECTED_ROLES,
        20,
    );
    assert_eq!(
        v3,
        MentionVerdict::UnauthorizedEveryone,
        "@everyone must take priority over all other violations"
    );
}

/// 2.4 Precedence & Combinations: Protected Role takes priority over Mass Mentions
#[test]
fn test_mentions_combination_protected_role_priority_over_mass() {
    let regular_roles = [PLAYER_ROLE_ID];

    // Protected role + 10 user mentions -> UnauthorizedProtectedRole
    let verdict = check_mentions(
        &regular_roles,
        STAFF_ROLE_ID,
        false,
        &[STAFF_ROLE_ID],
        PROTECTED_ROLES,
        10,
    );
    assert_eq!(
        verdict,
        MentionVerdict::UnauthorizedProtectedRole {
            role_id: STAFF_ROLE_ID
        },
        "Protected role check must take priority over mass user mentions"
    );
}

/// 2.5 Multiple Protected Roles Mentions: Returns first matching role
#[test]
fn test_mentions_multiple_protected_roles_returns_first() {
    let regular_roles = [PLAYER_ROLE_ID];

    let verdict = check_mentions(
        &regular_roles,
        STAFF_ROLE_ID,
        false,
        &[VIDEASTE_ROLE_ID, STAFF_ROLE_ID],
        PROTECTED_ROLES,
        0,
    );
    assert_eq!(
        verdict,
        MentionVerdict::UnauthorizedProtectedRole {
            role_id: VIDEASTE_ROLE_ID
        },
        "Must return first matched protected role in mentioned_roles"
    );
}

/// 2.6 Mixed Protected and Unprotected Roles Mentions:
#[test]
fn test_mentions_mixed_protected_and_unprotected_roles() {
    let regular_roles = [PLAYER_ROLE_ID];
    let unprotected_role_1 = 555_001;
    let unprotected_role_2 = 666_002;

    // Mentioning only unprotected roles -> Allowed
    assert_eq!(
        check_mentions(
            &regular_roles,
            STAFF_ROLE_ID,
            false,
            &[unprotected_role_1, unprotected_role_2],
            PROTECTED_ROLES,
            1
        ),
        MentionVerdict::Allow,
        "Pinging unprotected roles must be Allowed"
    );

    // Mentioning unprotected followed by protected role -> Blocked on protected
    assert_eq!(
        check_mentions(
            &regular_roles,
            STAFF_ROLE_ID,
            false,
            &[unprotected_role_1, VIDEASTE_ROLE_ID, unprotected_role_2],
            PROTECTED_ROLES,
            1
        ),
        MentionVerdict::UnauthorizedProtectedRole {
            role_id: VIDEASTE_ROLE_ID
        }
    );
}

/// 2.7 Mass Pings Exact Boundary Tests:
/// Threshold is > 4.
/// 0, 1, 2, 3, 4 mentions -> Allow.
/// 5 mentions -> UnauthorizedMassMention { count: 5 }.
/// 6, 10, 50 mentions -> UnauthorizedMassMention.
#[test]
fn test_mentions_mass_ping_exact_boundaries() {
    let regular_roles = [PLAYER_ROLE_ID];

    // Boundaries <= 4 mentions -> Allowed
    for count in 0..=4 {
        assert_eq!(
            check_mentions(
                &regular_roles,
                STAFF_ROLE_ID,
                false,
                &[],
                PROTECTED_ROLES,
                count
            ),
            MentionVerdict::Allow,
            "{} user mentions must be within allowed threshold (<= 4)",
            count
        );
    }

    // Boundary 5 mentions (1 above threshold) -> Blocked
    assert_eq!(
        check_mentions(
            &regular_roles,
            STAFF_ROLE_ID,
            false,
            &[],
            PROTECTED_ROLES,
            5
        ),
        MentionVerdict::UnauthorizedMassMention { count: 5 },
        "5 user mentions must breach threshold (> 4)"
    );

    // Boundary 6, 15, 100 mentions -> Blocked with exact count
    for count in [6, 15, 100] {
        assert_eq!(
            check_mentions(
                &regular_roles,
                STAFF_ROLE_ID,
                false,
                &[],
                PROTECTED_ROLES,
                count
            ),
            MentionVerdict::UnauthorizedMassMention { count },
            "{} user mentions must report exact count in verdict",
            count
        );
    }
}

// ============================================================================
// PART 3: Message Integration & Raw Everyone/Here Parsing (evaluate_message_mentions)
// ============================================================================

fn make_test_message(
    content: &str,
    mention_everyone: bool,
    mention_roles: Vec<u64>,
    user_mentions_count: usize,
) -> Message {
    let roles_json: Vec<serde_json::Value> = mention_roles
        .into_iter()
        .map(|r| serde_json::json!(r.to_string()))
        .collect();

    let mentions_json: Vec<serde_json::Value> = (0..user_mentions_count)
        .map(|i| {
            serde_json::json!({
                "id": format!("{}", 5000 + i),
                "username": format!("user_{}", i),
                "discriminator": "0001",
                "avatar": null,
                "public_flags": 0
            })
        })
        .collect();

    let json = serde_json::json!({
        "id": "100000000000000001",
        "channel_id": "200000000000000002",
        "author": {
            "id": "300000000000000003",
            "username": "spammer",
            "discriminator": "0001",
            "avatar": null,
            "public_flags": 0
        },
        "content": content,
        "timestamp": "2026-10-14T20:00:00.000000+00:00",
        "edited_timestamp": null,
        "tts": false,
        "mention_everyone": mention_everyone,
        "mentions": mentions_json,
        "mention_roles": roles_json,
        "attachments": [],
        "embeds": [],
        "pinned": false,
        "type": 0
    });

    serde_json::from_value(json).expect("Valid test message JSON deserialization")
}

/// 3.1 evaluate_message_mentions with gateway mention_everyone flag
#[test]
fn test_evaluate_message_mentions_gateway_flag_true() {
    let msg = make_test_message("Bonjour tout le monde", true, vec![], 0);
    let verdict = evaluate_message_mentions(&msg, &[PLAYER_ROLE_ID], STAFF_ROLE_ID, PROTECTED_ROLES);
    assert_eq!(verdict, MentionVerdict::UnauthorizedEveryone);
}

/// 3.2 evaluate_message_mentions with raw lowercase @everyone and @here in content
#[test]
fn test_evaluate_message_mentions_raw_lowercase_everyone_and_here() {
    let msg_everyone = make_test_message("Regardez ici @everyone svp", false, vec![], 0);
    assert_eq!(
        evaluate_message_mentions(
            &msg_everyone,
            &[PLAYER_ROLE_ID],
            STAFF_ROLE_ID,
            PROTECTED_ROLES
        ),
        MentionVerdict::UnauthorizedEveryone
    );

    let msg_here = make_test_message("Rejoignez le vocal @here", false, vec![], 0);
    assert_eq!(
        evaluate_message_mentions(
            &msg_here,
            &[PLAYER_ROLE_ID],
            STAFF_ROLE_ID,
            PROTECTED_ROLES
        ),
        MentionVerdict::UnauthorizedEveryone
    );
}

/// 3.3 evaluate_message_mentions with protected roles from message
#[test]
fn test_evaluate_message_mentions_protected_role_extracted() {
    let msg = make_test_message("Ping staff", false, vec![VIDEASTE_ROLE_ID], 1);
    let verdict = evaluate_message_mentions(&msg, &[PLAYER_ROLE_ID], STAFF_ROLE_ID, PROTECTED_ROLES);
    assert_eq!(
        verdict,
        MentionVerdict::UnauthorizedProtectedRole {
            role_id: VIDEASTE_ROLE_ID
        }
    );
}

/// 3.4 evaluate_message_mentions with mass mentions (> 4 user mentions)
#[test]
fn test_evaluate_message_mentions_mass_user_mentions() {
    let msg = make_test_message("Pinging everyone individually", false, vec![], 6);
    let verdict = evaluate_message_mentions(&msg, &[PLAYER_ROLE_ID], STAFF_ROLE_ID, PROTECTED_ROLES);
    assert_eq!(
        verdict,
        MentionVerdict::UnauthorizedMassMention { count: 6 }
    );
}

/// 3.5 EMPIRICAL CHALLENGE: Case-Insensitivity of Raw @everyone / @here in evaluate_message_mentions
/// In `src/modules/automod/mentions.rs`:
/// `let raw_everyone = msg.content.contains("@everyone") || msg.content.contains("@here");`
///
/// If a user types `@Everyone`, `@EVERYONE`, `@Here`, or `@HERE` when Discord did NOT set `mention_everyone = true`:
/// Because `contains` is case-sensitive, `raw_everyone` evaluates to FALSE!
///
/// This test documents the exact empirical behavior of the implementation.
#[test]
fn test_evaluate_message_mentions_raw_casing_behavior() {
    // Exact lowercase matches are intercepted
    let msg_lower = make_test_message("test @everyone", false, vec![], 0);
    assert_eq!(
        evaluate_message_mentions(&msg_lower, &[PLAYER_ROLE_ID], STAFF_ROLE_ID, PROTECTED_ROLES),
        MentionVerdict::UnauthorizedEveryone
    );

    // Capitalized / uppercase variations:
    // If msg.mention_everyone is false (e.g. member lacks mention permissions on Discord so client sent text),
    // msg.content contains "@Everyone" or "@EVERYONE".
    // Currently, `msg.content.contains("@everyone")` does NOT match "@Everyone".
    let msg_caps = make_test_message("test @Everyone", false, vec![], 0);
    let verdict_caps = evaluate_message_mentions(&msg_caps, &[PLAYER_ROLE_ID], STAFF_ROLE_ID, PROTECTED_ROLES);
    assert_eq!(verdict_caps, MentionVerdict::UnauthorizedEveryone);

    let msg_upper_here = make_test_message("test @HERE", false, vec![], 0);
    let verdict_upper_here = evaluate_message_mentions(&msg_upper_here, &[PLAYER_ROLE_ID], STAFF_ROLE_ID, PROTECTED_ROLES);
    assert_eq!(verdict_upper_here, MentionVerdict::UnauthorizedEveryone);
}
