use twilight_model::channel::Message;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum MentionVerdict {
    Allow,
    UnauthorizedEveryone,
    UnauthorizedProtectedRole { role_id: u64 },
    UnauthorizedMassMention { count: usize },
}

pub fn check_mentions(
    author_roles: &[u64],
    staff_role_id: u64,
    mention_everyone: bool,
    mentioned_roles: &[u64],
    protected_roles: &[u64],
    user_mention_count: usize,
) -> MentionVerdict {
    // Staff members bypass all mention restrictions
    if author_roles.contains(&staff_role_id) {
        return MentionVerdict::Allow;
    }

    // 1. Intercept unauthorized @everyone and @here
    if mention_everyone {
        return MentionVerdict::UnauthorizedEveryone;
    }

    // 2. Intercept unauthorized pings to protected staff/admin roles
    for &role in mentioned_roles {
        if protected_roles.contains(&role) {
            return MentionVerdict::UnauthorizedProtectedRole { role_id: role };
        }
    }

    // 3. Enforce mass ping limits (> 4 user mentions)
    if user_mention_count > 4 {
        return MentionVerdict::UnauthorizedMassMention {
            count: user_mention_count,
        };
    }

    MentionVerdict::Allow
}

pub fn evaluate_message_mentions(
    msg: &Message,
    author_roles: &[u64],
    staff_role_id: u64,
    protected_roles: &[u64],
) -> MentionVerdict {
    let lower_content = msg.content.to_lowercase();
    let raw_everyone = lower_content.contains("@everyone") || lower_content.contains("@here");
    let mention_everyone = msg.mention_everyone || raw_everyone;
    let mentioned_roles: Vec<u64> = msg.mention_roles.iter().map(|r| r.get()).collect();
    let user_mention_count = msg.mentions.len();

    check_mentions(
        author_roles,
        staff_role_id,
        mention_everyone,
        &mentioned_roles,
        protected_roles,
        user_mention_count,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_staff_bypass_allowed() {
        let staff_role = 9999;
        let verdict = check_mentions(&[staff_role], staff_role, true, &[5555], &[5555], 10);
        assert_eq!(verdict, MentionVerdict::Allow);
    }

    #[test]
    fn test_unauthorized_everyone_blocked() {
        let verdict = check_mentions(&[1001], 9999, true, &[], &[], 0);
        assert_eq!(verdict, MentionVerdict::UnauthorizedEveryone);
    }

    #[test]
    fn test_unauthorized_protected_role_blocked() {
        let protected_role = 5555;
        let verdict = check_mentions(&[1001], 9999, false, &[protected_role], &[protected_role], 1);
        assert_eq!(
            verdict,
            MentionVerdict::UnauthorizedProtectedRole {
                role_id: protected_role
            }
        );
    }

    #[test]
    fn test_mass_mention_blocked() {
        let verdict = check_mentions(&[1001], 9999, false, &[], &[], 7);
        assert_eq!(
            verdict,
            MentionVerdict::UnauthorizedMassMention { count: 7 }
        );
    }

    #[test]
    fn test_legitimate_mentions_allowed() {
        let verdict = check_mentions(&[1001], 9999, false, &[], &[5555], 2);
        assert_eq!(verdict, MentionVerdict::Allow);
    }
}
