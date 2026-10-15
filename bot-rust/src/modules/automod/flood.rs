use std::collections::{HashMap, VecDeque};
use std::time::{Duration, Instant};
use twilight_model::id::marker::{MessageMarker, UserMarker};
use twilight_model::id::Id;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum FloodAction {
    Allow,
    PurgeAndTimeout {
        message_ids: Vec<Id<MessageMarker>>,
        duration_seconds: u64,
    },
}

#[derive(Clone, Debug)]
pub struct MessageRecord {
    pub id: Id<MessageMarker>,
    pub content: String,
    pub timestamp: Instant,
}

pub struct AntiFloodTracker {
    window: Duration,
    burst_threshold: usize,
    duplicate_threshold: usize,
    user_history: HashMap<Id<UserMarker>, VecDeque<MessageRecord>>,
}

impl AntiFloodTracker {
    pub fn new(window: Duration, burst_threshold: usize, duplicate_threshold: usize) -> Self {
        Self {
            window,
            burst_threshold,
            duplicate_threshold,
            user_history: HashMap::new(),
        }
    }

    pub fn default_production() -> Self {
        Self::new(Duration::from_secs(5), 5, 3)
    }

    pub fn record_and_evaluate(
        &mut self,
        user_id: Id<UserMarker>,
        message_id: Id<MessageMarker>,
        content: &str,
        now: Instant,
    ) -> FloodAction {
        let history = self.user_history.entry(user_id).or_default();

        // Evict expired entries older than the sliding window
        while let Some(front) = history.front() {
            if now.saturating_duration_since(front.timestamp) > self.window {
                history.pop_front();
            } else {
                break;
            }
        }

        history.push_back(MessageRecord {
            id: message_id,
            content: content.to_string(),
            timestamp: now,
        });

        let total_count = history.len();
        let normalized = content.trim().to_lowercase();
        let duplicate_count = history
            .iter()
            .filter(|r| r.content.trim().to_lowercase() == normalized)
            .count();

        if total_count >= self.burst_threshold || duplicate_count >= self.duplicate_threshold {
            let message_ids = history.iter().map(|r| r.id).collect();
            // Clear history so immediately following messages do not trigger duplicate purges
            history.clear();
            FloodAction::PurgeAndTimeout {
                message_ids,
                duration_seconds: 300,
            }
        } else {
            FloodAction::Allow
        }
    }

    #[allow(dead_code)]
    pub fn clear_user(&mut self, user_id: Id<UserMarker>) {
        self.user_history.remove(&user_id);
    }

    #[allow(dead_code)]
    pub fn clear_all(&mut self) {
        self.user_history.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normal_chat_allowed() {
        let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 5, 3);
        let user = Id::new(1);
        let now = Instant::now();

        assert_eq!(
            tracker.record_and_evaluate(user, Id::new(10), "hello", now),
            FloodAction::Allow
        );
        assert_eq!(
            tracker.record_and_evaluate(user, Id::new(11), "world", now + Duration::from_secs(1)),
            FloodAction::Allow
        );
    }

    #[test]
    fn test_burst_purge_and_timeout() {
        let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 4, 3);
        let user = Id::new(2);
        let now = Instant::now();

        for i in 1..4 {
            assert_eq!(
                tracker.record_and_evaluate(user, Id::new(i), &format!("burst {}", i), now),
                FloodAction::Allow
            );
        }

        let action = tracker.record_and_evaluate(user, Id::new(4), "burst 4", now);
        match action {
            FloodAction::PurgeAndTimeout {
                message_ids,
                duration_seconds,
            } => {
                assert_eq!(message_ids.len(), 4);
                assert_eq!(duration_seconds, 300);
            }
            FloodAction::Allow => panic!("Expected purge and timeout"),
        }
    }

    #[test]
    fn test_duplicate_repetition_purge() {
        let mut tracker = AntiFloodTracker::new(Duration::from_secs(5), 10, 3);
        let user = Id::new(3);
        let now = Instant::now();

        assert_eq!(
            tracker.record_and_evaluate(user, Id::new(1), "spam", now),
            FloodAction::Allow
        );
        assert_eq!(
            tracker.record_and_evaluate(user, Id::new(2), "spam", now + Duration::from_millis(100)),
            FloodAction::Allow
        );

        let action = tracker.record_and_evaluate(user, Id::new(3), "spam", now + Duration::from_millis(200));
        match action {
            FloodAction::PurgeAndTimeout { message_ids, .. } => {
                assert_eq!(message_ids.len(), 3);
            }
            FloodAction::Allow => panic!("Expected repetition purge"),
        }
    }

    #[test]
    fn test_window_expiration() {
        let mut tracker = AntiFloodTracker::new(Duration::from_secs(2), 3, 3);
        let user = Id::new(4);
        let now = Instant::now();

        tracker.record_and_evaluate(user, Id::new(1), "msg 1", now);
        tracker.record_and_evaluate(user, Id::new(2), "msg 2", now + Duration::from_millis(500));

        let future = now + Duration::from_secs(3);
        let action = tracker.record_and_evaluate(user, Id::new(3), "msg 3", future);
        assert_eq!(action, FloodAction::Allow);
    }
}
