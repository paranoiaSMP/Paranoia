#![allow(dead_code)]

pub mod modules {
    pub fn enabled(_id: &str) -> bool {
        true
    }
    pub fn setting(_id: &str, _key: &str) -> Option<String> {
        None
    }
    pub fn setting_number(_id: &str, _key: &str, fallback: i64) -> i64 {
        fallback
    }
}

pub mod utils {
    pub mod emoji {
        pub const SETTINGS: &str = "⚙️";
    }
}

#[path = "../src/modules/security.rs"]
mod security;

use std::time::{Duration, Instant};
use twilight_model::channel::ChannelType;
use twilight_model::guild::Permissions;
use twilight_model::id::Id;

use security::{
    calculate_lockdown_permissions, calculate_restore_permissions, is_lockdown_target_channel_type,
    lockdown_deny_permissions, ChannelOverwriteBackup, GuildRaidState, JoinDecision,
};

#[test]
fn test_normal_join_velocity_allowed() {
    let mut state = GuildRaidState::new(Duration::from_secs(5), 10, Duration::from_secs(300));
    let start = Instant::now();

    for i in 1..=5 {
        let ts = start + Duration::from_millis(i * 500);
        let decision = state.evaluate_join(Id::new(i), ts);
        assert_eq!(decision, JoinDecision::Allow);
    }

    assert!(!state.is_locked(start + Duration::from_secs(3)));
}

#[test]
fn test_burst_threshold_trigger_extracts_all_suspects() {
    let mut state = GuildRaidState::new(Duration::from_secs(5), 10, Duration::from_secs(300));
    let start = Instant::now();

    for i in 1..=9 {
        let ts = start + Duration::from_millis(i * 100);
        let decision = state.evaluate_join(Id::new(i), ts);
        assert_eq!(decision, JoinDecision::Allow);
    }

    let decision_10 = state.evaluate_join(Id::new(10), start + Duration::from_millis(1000));
    match decision_10 {
        JoinDecision::TriggerLockdown {
            suspect_user_ids,
            reason,
        } => {
            assert_eq!(suspect_user_ids.len(), 10);
            assert_eq!(
                suspect_user_ids,
                (1..=10).map(Id::new).collect::<Vec<_>>()
            );
            assert!(reason.contains("Join-velocity raid detected"));
        }
        _ => panic!("Expected TriggerLockdown on 10th join"),
    }

    assert!(state.is_locked(start + Duration::from_secs(2)));
}

#[test]
fn test_suspect_wave_tracking_identifies_all_burst_accounts() {
    let mut state = GuildRaidState::new(Duration::from_secs(5), 4, Duration::from_secs(60));
    let now = Instant::now();

    let account_ids = [9001, 9002, 9003, 9004];
    for &id in &account_ids[..3] {
        assert_eq!(state.evaluate_join(Id::new(id), now), JoinDecision::Allow);
    }

    let trigger = state.evaluate_join(Id::new(account_ids[3]), now);
    match trigger {
        JoinDecision::TriggerLockdown {
            suspect_user_ids, ..
        } => {
            assert_eq!(
                suspect_user_ids,
                vec![Id::new(9001), Id::new(9002), Id::new(9003), Id::new(9004)]
            );
        }
        _ => panic!("Expected TriggerLockdown with all 4 suspect accounts"),
    }
}

#[test]
fn test_active_lockdown_incoming_member_rejection() {
    let mut state = GuildRaidState::new(Duration::from_secs(5), 3, Duration::from_secs(120));
    let now = Instant::now();

    state.evaluate_join(Id::new(1), now);
    state.evaluate_join(Id::new(2), now);
    let trigger = state.evaluate_join(Id::new(3), now);
    assert!(matches!(trigger, JoinDecision::TriggerLockdown { .. }));

    // Subsequent joins while lockdown is active are immediately kicked
    let join_4 = state.evaluate_join(Id::new(4), now + Duration::from_secs(10));
    assert_eq!(
        join_4,
        JoinDecision::KickRaidMember {
            user_id: Id::new(4)
        }
    );

    let join_5 = state.evaluate_join(Id::new(5), now + Duration::from_secs(60));
    assert_eq!(
        join_5,
        JoinDecision::KickRaidMember {
            user_id: Id::new(5)
        }
    );

    let join_6 = state.evaluate_join(Id::new(6), now + Duration::from_secs(119));
    assert_eq!(
        join_6,
        JoinDecision::KickRaidMember {
            user_id: Id::new(6)
        }
    );
}

#[test]
fn test_window_expiration_spread_joins_do_not_trigger() {
    let mut state = GuildRaidState::new(Duration::from_secs(3), 3, Duration::from_secs(60));
    let start = Instant::now();

    // 2 joins at start
    assert_eq!(state.evaluate_join(Id::new(1), start), JoinDecision::Allow);
    assert_eq!(state.evaluate_join(Id::new(2), start), JoinDecision::Allow);

    // 2 joins at start + 4s (previous 2 joins expired past the 3s window)
    let t2 = start + Duration::from_secs(4);
    assert_eq!(state.evaluate_join(Id::new(3), t2), JoinDecision::Allow);
    assert_eq!(state.evaluate_join(Id::new(4), t2), JoinDecision::Allow);

    // 2 joins at start + 8s (joins 3,4 expired)
    let t3 = start + Duration::from_secs(8);
    assert_eq!(state.evaluate_join(Id::new(5), t3), JoinDecision::Allow);
    assert_eq!(state.evaluate_join(Id::new(6), t3), JoinDecision::Allow);

    assert!(!state.is_locked(t3));
}

#[test]
fn test_channel_permission_overwrite_calculation_and_restore() {
    let deny_bits = lockdown_deny_permissions();
    assert!(deny_bits.contains(Permissions::SEND_MESSAGES));
    assert!(deny_bits.contains(Permissions::SEND_MESSAGES_IN_THREADS));
    assert!(deny_bits.contains(Permissions::CREATE_PUBLIC_THREADS));
    assert!(deny_bits.contains(Permissions::CREATE_PRIVATE_THREADS));
    assert!(deny_bits.contains(Permissions::ADD_REACTIONS));
    assert!(deny_bits.contains(Permissions::SPEAK));

    // Case 1: Channel with no prior overwrite
    let backup_no_overwrite = ChannelOverwriteBackup {
        channel_id: Id::new(101),
        had_overwrite: false,
        original_allow: Permissions::empty(),
        original_deny: Permissions::empty(),
    };
    let (new_allow_1, new_deny_1) = calculate_lockdown_permissions(
        backup_no_overwrite.original_allow,
        backup_no_overwrite.original_deny,
    );
    assert_eq!(new_allow_1, Permissions::empty());
    assert_eq!(new_deny_1, deny_bits);
    assert_eq!(calculate_restore_permissions(&backup_no_overwrite), None);

    // Case 2: Channel with existing overwrite
    let orig_allow = Permissions::VIEW_CHANNEL
        | Permissions::SEND_MESSAGES
        | Permissions::ADD_REACTIONS
        | Permissions::CONNECT;
    let orig_deny = Permissions::ATTACH_FILES;

    let backup_with_overwrite = ChannelOverwriteBackup {
        channel_id: Id::new(102),
        had_overwrite: true,
        original_allow: orig_allow,
        original_deny: orig_deny,
    };

    let (new_allow_2, new_deny_2) = calculate_lockdown_permissions(
        backup_with_overwrite.original_allow,
        backup_with_overwrite.original_deny,
    );

    // Verify stripped allow permissions
    assert!(!new_allow_2.contains(Permissions::SEND_MESSAGES));
    assert!(!new_allow_2.contains(Permissions::ADD_REACTIONS));
    assert!(new_allow_2.contains(Permissions::VIEW_CHANNEL));
    assert!(new_allow_2.contains(Permissions::CONNECT));

    // Verify added deny permissions
    assert!(new_deny_2.contains(Permissions::ATTACH_FILES));
    assert!(new_deny_2.contains(Permissions::SEND_MESSAGES));
    assert!(new_deny_2.contains(Permissions::SPEAK));

    // Verify restoration returns exact original permissions
    let restored = calculate_restore_permissions(&backup_with_overwrite);
    assert_eq!(restored, Some((orig_allow, orig_deny)));
}

#[test]
fn test_channel_target_filtering() {
    assert!(is_lockdown_target_channel_type(ChannelType::GuildText));
    assert!(is_lockdown_target_channel_type(ChannelType::GuildVoice));
    assert!(is_lockdown_target_channel_type(
        ChannelType::GuildAnnouncement
    ));
    assert!(is_lockdown_target_channel_type(
        ChannelType::GuildStageVoice
    ));
    assert!(is_lockdown_target_channel_type(ChannelType::GuildForum));
    assert!(is_lockdown_target_channel_type(ChannelType::GuildMedia));

    assert!(!is_lockdown_target_channel_type(
        ChannelType::GuildCategory
    ));
    assert!(!is_lockdown_target_channel_type(ChannelType::Private));
    assert!(!is_lockdown_target_channel_type(ChannelType::Group));
}

#[test]
fn test_non_monotonic_timestamp_resilience_clock_skew() {
    let mut state = GuildRaidState::new(Duration::from_secs(5), 3, Duration::from_secs(60));
    let base = Instant::now();

    // Clock skew backward: join 1 arrives at base + 2s, join 2 at base + 1s (backward skew)
    assert_eq!(
        state.evaluate_join(Id::new(1), base + Duration::from_secs(2)),
        JoinDecision::Allow
    );
    assert_eq!(
        state.evaluate_join(Id::new(2), base + Duration::from_secs(1)),
        JoinDecision::Allow
    );

    // Join 3 at base + 2s triggers lockdown without panic
    let decision = state.evaluate_join(Id::new(3), base + Duration::from_secs(2));
    assert!(matches!(decision, JoinDecision::TriggerLockdown { .. }));

    // Reset and test extreme future clock jump
    let mut state2 = GuildRaidState::new(Duration::from_secs(5), 3, Duration::from_secs(60));
    let future_jump = base + Duration::from_secs(3600);
    state2.evaluate_join(Id::new(10), future_jump);

    // When time returns to normal, the distant future entry is pruned
    let normal_now = base + Duration::from_secs(10);
    assert_eq!(
        state2.evaluate_join(Id::new(11), normal_now),
        JoinDecision::Allow
    );
    assert_eq!(
        state2.evaluate_join(Id::new(12), normal_now),
        JoinDecision::Allow
    );
    // Still allowed because distant future join was pruned
    assert!(!state2.is_locked(normal_now));
}

#[test]
fn test_lockdown_expiration_restores_entry() {
    let mut state = GuildRaidState::new(Duration::from_secs(5), 2, Duration::from_secs(10));
    let now = Instant::now();

    state.evaluate_join(Id::new(1), now);
    let trigger = state.evaluate_join(Id::new(2), now);
    assert!(matches!(trigger, JoinDecision::TriggerLockdown { .. }));

    // Before expiration
    assert!(state.is_locked(now + Duration::from_secs(5)));
    assert!(!state.is_lockdown_expired(now + Duration::from_secs(5)));

    // After expiration
    let future = now + Duration::from_secs(12);
    assert!(!state.is_locked(future));
    assert!(state.is_lockdown_expired(future));

    // Next incoming join is allowed
    let decision = state.evaluate_join(Id::new(3), future);
    assert_eq!(decision, JoinDecision::Allow);
}

#[test]
fn test_manual_unlock_resets_state() {
    let mut state = GuildRaidState::new(Duration::from_secs(5), 2, Duration::from_secs(300));
    let now = Instant::now();

    state.evaluate_join(Id::new(1), now);
    state.evaluate_join(Id::new(2), now);
    assert!(state.is_locked(now));

    let _ = state.unlock();
    assert!(!state.is_locked(now));

    let next_decision = state.evaluate_join(Id::new(3), now);
    assert_eq!(next_decision, JoinDecision::Allow);
}

#[test]
fn test_simultaneous_exact_timestamp_joins() {
    let mut state = GuildRaidState::new(Duration::from_secs(5), 10, Duration::from_secs(60));
    let exact_now = Instant::now();

    for i in 1..=9 {
        assert_eq!(
            state.evaluate_join(Id::new(i), exact_now),
            JoinDecision::Allow
        );
    }

    let decision_10 = state.evaluate_join(Id::new(10), exact_now);
    match decision_10 {
        JoinDecision::TriggerLockdown {
            suspect_user_ids, ..
        } => {
            assert_eq!(suspect_user_ids.len(), 10);
        }
        _ => panic!("Expected simultaneous arrival burst to trigger lockdown"),
    }
}
