use std::sync::LazyLock;
use regex::Regex;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum LinkVerdict {
    Allowed,
    Phishing { domain: String },
    UnauthorizedInvite { code: String },
}

pub const DEFAULT_ALLOWED_DOMAINS: &[&str] = &[
    "paranoia-mc.fr",
    "paranoia.studio",
    "paranoiasmp.fr",
    "discord.gg",
    "discord.com",
    "discordapp.com",
    "github.com",
    "gitlab.com",
    "youtube.com",
    "youtu.be",
    "twitch.tv",
    "tiktok.com",
    "twitter.com",
    "x.com",
    "reddit.com",
    "minecraft.net",
    "curseforge.com",
    "modrinth.com",
    "tenor.com",
    "giphy.com",
    "imgur.com",
];

const KNOWN_PHISHING: &[&str] = &[
    "dlscord-nitro",
    "steamcomminuty",
    "discrodapp",
    "free-nitro",
    "nitro-drop",
    "gift-discord",
    "discorcl",
    "d1scord",
    "steancommunity",
    "steamcommunitv",
    "discord-gift",
    "paranoia-free-coins",
    "paranoia-coins",
    "paranoia-nitro",
    "dlscord",
    "discoord",
    "discrod",
    "disbord-",
];

static URL_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)https?://(?:[^@\s/:?#]+@)?([^\s/:?#]+)(?::[0-9]+)?(/[^\s]*)?")
        .expect("Valid regex for URLs")
});

static INVITE_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)(?:https?://)?(?:www\.)?(?:discord\.(?:gg|io|me|li)\.?|discord(?:app)?\.com\.?/invite)/+([a-zA-Z0-9_\-]+)")
        .expect("Valid regex for Discord invites")
});

fn normalize_content(content: &str) -> String {
    let mut normalized = String::with_capacity(content.len());
    for c in content.chars() {
        if let Some(ch) = super::leetspeak::normalize_unicode_char(c) {
            normalized.push(ch);
        }
    }
    normalized
}

#[allow(dead_code)]
pub fn extract_urls(content: &str) -> Vec<String> {
    URL_RE
        .find_iter(content)
        .map(|m| m.as_str().to_string())
        .collect()
}

pub fn evaluate_link(
    content: &str,
    allowed_domains: &[&str],
    allowed_invites: &[&str],
) -> LinkVerdict {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return LinkVerdict::Allowed;
    }

    let normalized = normalize_content(trimmed);

    // 1. Check Discord invites (iterate all invites to prevent multi-invite smuggling)
    for caps in INVITE_RE.captures_iter(&normalized) {
        if let Some(code_match) = caps.get(1) {
            let code = code_match.as_str();
            let is_allowed = allowed_invites
                .iter()
                .any(|&inv| inv.eq_ignore_ascii_case(code));

            if !is_allowed {
                return LinkVerdict::UnauthorizedInvite {
                    code: code.to_string(),
                };
            }
        }
    }

    // 2. Check known phishing keywords / typosquat substrings
    for &phish in KNOWN_PHISHING {
        if normalized.contains(phish) {
            return LinkVerdict::Phishing {
                domain: phish.to_string(),
            };
        }
    }

    // 3. Extract and validate each domain
    for caps in URL_RE.captures_iter(&normalized) {
        if let Some(domain_match) = caps.get(1) {
            let domain = domain_match.as_str().trim_end_matches('.');

            let is_allowed = allowed_domains.iter().any(|&allowed| {
                domain == allowed || domain.ends_with(&format!(".{}", allowed))
            });

            if !is_allowed {
                // Discord invite domains are handled by the invite check above
                if domain == "discord.gg"
                    || domain == "discord.com"
                    || domain == "discordapp.com"
                    || domain == "discord.me"
                    || domain == "discord.io"
                    || domain == "discord.li"
                {
                    continue;
                }

                // If domain looks like Discord, Steam, Nitro, or Paranoia typosquatting, flag as phishing
                if domain.contains("discord")
                    || domain.contains("steam")
                    || domain.contains("nitro")
                    || domain.contains("paranoia")
                {
                    return LinkVerdict::Phishing {
                        domain: domain.to_string(),
                    };
                }
            }
        }
    }

    LinkVerdict::Allowed
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_content_allowed() {
        assert_eq!(
            evaluate_link("", &["paranoia-mc.fr"], &["paranoia"]),
            LinkVerdict::Allowed
        );
        assert_eq!(
            evaluate_link("   ", &["paranoia-mc.fr"], &["paranoia"]),
            LinkVerdict::Allowed
        );
    }

    #[test]
    fn test_whitelisted_domains_allowed() {
        let content = "Visit https://youtube.com/watch?v=123 and https://paranoia-mc.fr/rules";
        assert_eq!(
            evaluate_link(content, &["youtube.com", "paranoia-mc.fr"], &["paranoia"]),
            LinkVerdict::Allowed
        );
    }

    #[test]
    fn test_whitelisted_invite_allowed() {
        let content = "Join us at https://discord.gg/paranoia";
        assert_eq!(
            evaluate_link(content, &["paranoia-mc.fr"], &["paranoia"]),
            LinkVerdict::Allowed
        );
    }

    #[test]
    fn test_unauthorized_invite_intercepted() {
        let content = "Raid here: https://discord.gg/raid-server";
        assert_eq!(
            evaluate_link(content, &["paranoia-mc.fr"], &["paranoia"]),
            LinkVerdict::UnauthorizedInvite {
                code: "raid-server".to_string()
            }
        );
    }

    #[test]
    fn test_phishing_typosquat_intercepted() {
        let content = "Free nitro: https://dlscord-nitro.com/claim";
        match evaluate_link(content, &["paranoia-mc.fr"], &["paranoia"]) {
            LinkVerdict::Phishing { domain } => {
                assert!(domain.contains("dlscord-nitro"));
            }
            other => panic!("Expected phishing, got {:?}", other),
        }
    }

    #[test]
    fn test_extract_urls() {
        let text = "Check https://paranoia-mc.fr and http://github.com/foo/bar today!";
        let urls = extract_urls(text);
        assert_eq!(urls.len(), 2);
    }
}
