#![allow(dead_code)]

use std::collections::{HashMap, VecDeque};
use std::time::{Duration, Instant};
use twilight_model::id::marker::{MessageMarker, UserMarker};
use twilight_model::id::Id;

// ---------------------------------------------------------------------------
// R1: Anti-Toxicity & Anti-Bypass Contracts
// ---------------------------------------------------------------------------

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TargetKind {
    None,
    GameObject,
    SecondPersonPronoun,
    ExplicitUserMention,
    ReplyTarget,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ToxicityCategory {
    Clean,
    GamingFrustration,
    FriendlyBanter,
    Harassment,
    SevereToxicity,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ToxicityVerdict {
    pub category: ToxicityCategory,
    pub is_toxic: bool,
    pub score: f32,
    pub target: TargetKind,
    pub normalized_text: String,
    pub detected_words: Vec<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct TestMessageDiagnostic {
    pub verdict: ToxicityVerdict,
    pub ephemeral: bool,
    pub sanctions_applied: bool,
}

pub fn unmask_leetspeak(input: &str) -> String {
    let mut normalized = String::with_capacity(input.len());

    // Step 1: Cyrillic / Greek homoglyph mapping and zero-width stripping
    for ch in input.chars() {
        match ch {
            // Zero-width & invisible characters & combining marks (Zalgo)
            '\u{200B}' | '\u{200C}' | '\u{200D}' | '\u{FEFF}' | '\u{00AD}' | '\u{0300}'..='\u{036F}' => continue,
            // Cyrillic homoglyphs
            'с' | 'С' => normalized.push('c'),
            'а' | 'А' => normalized.push('a'),
            'е' | 'Е' => normalized.push('e'),
            'о' | 'О' => normalized.push('o'),
            'р' | 'Р' => normalized.push('p'),
            'х' | 'Х' => normalized.push('x'),
            'у' | 'У' => normalized.push('y'),
            'і' | 'І' => normalized.push('i'),
            'В' => normalized.push('b'),
            'Н' => normalized.push('h'),
            // Greek homoglyphs
            'α' | 'Α' => normalized.push('a'),
            'ο' | 'Ο' => normalized.push('o'),
            'ε' | 'Ε' => normalized.push('e'),
            'ι' | 'Ι' => normalized.push('i'),
            other => normalized.push(other),
        }
    }

    let lower = normalized.to_lowercase();
    let mut leet_replaced = String::with_capacity(lower.len());

    // Step 2: Leetspeak digit & symbol substitution
    for ch in lower.chars() {
        match ch {
            '4' | '@' => leet_replaced.push('a'),
            '0' => leet_replaced.push('o'),
            '3' => leet_replaced.push('e'),
            '7' => leet_replaced.push('t'),
            '1' => leet_replaced.push('i'),
            '5' | '$' => leet_replaced.push('s'),
            '8' => leet_replaced.push('b'),
            '9' => leet_replaced.push('g'),
            other => leet_replaced.push(other),
        }
    }

    // Replace ! with i only within words (e.g. sh!t -> shit)
    let re_excl = regex::Regex::new(r"([a-z])!([a-z])").unwrap();
    let leet_replaced = re_excl.replace_all(&leet_replaced, "${1}i${2}").to_string();

    // Step 3: Punctuation stripping within words (e.g. "f.d.p" -> "fdp", "c-o-n" -> "con")
    let re_punct = regex::Regex::new(r"([a-z])[\.\-_\*\/\\~\|\+]+([a-z])").unwrap();
    let mut unpunct = leet_replaced;
    for _ in 0..4 {
        let next = re_punct.replace_all(&unpunct, "$1$2").to_string();
        if next == unpunct {
            break;
        }
        unpunct = next;
    }

    // Step 4: Collapse consecutive repeated characters
    let mut collapsed = String::new();
    let mut chars = unpunct.chars().peekable();
    while let Some(current) = chars.next() {
        let mut count = 1;
        while let Some(&next) = chars.peek() {
            if next == current {
                count += 1;
                chars.next();
            } else {
                break;
            }
        }

        if count >= 3 {
            match current {
                'a' | 'e' | 'i' | 'o' | 'u' | 'y' => {
                    collapsed.push(current);
                }
                'n' | 'l' | 'm' | 's' | 't' => {
                    collapsed.push(current);
                    collapsed.push(current);
                }
                _ => {
                    collapsed.push(current);
                }
            }
        } else {
            for _ in 0..count {
                collapsed.push(current);
            }
        }
    }

    collapsed
}

pub fn classify_toxicity(content: &str, mentions: &[Id<UserMarker>]) -> ToxicityVerdict {
    let unmasked = unmask_leetspeak(content);
    let lower_unmasked = unmasked.to_lowercase();

    const SEVERE_SLURS: &[&str] = &["negre", "bougnoule", "chintoc"];
    const TOXIC_WORDS: &[&str] = &[
        "connard", "salope", "fdp", "tg", "ta gueule", "pute", "ntm",
        "encule", "batard", "trash", "idiot", "merde", "va te faire", "nul", "con",
    ];
    const GAME_OBJECTS: &[&str] = &[
        "squelette", "creeper", "zombie", "lave", "lag", "serveur", "jeu",
        "mob", "fall damage", "potion", "pioche", "stuff", "boss", "wither",
    ];
    const PRONOUNS: &[&str] = &[
        "tu", "t'es", "toi", "ta", "ton", "te", "vous", "you", "ur", "t es",
    ];
    const BANTER_TOKENS: &[&str] = &[
        "mdr", "lol", "ptdr", "xd", "gg", "haha", "jtm", "bro", "poto",
        "😂", "🤣", "❤️", "x)",
    ];

    let mut detected_words = Vec::new();
    let mut is_severe = false;

    for &slur in SEVERE_SLURS {
        if lower_unmasked.contains(slur) {
            detected_words.push(slur.to_string());
            is_severe = true;
        }
    }

    for &word in TOXIC_WORDS {
        let is_match = if word.len() <= 3 {
            let re_pattern = format!(r"\b{}\b", regex::escape(word));
            regex::Regex::new(&re_pattern).map(|r| r.is_match(&lower_unmasked)).unwrap_or(false)
        } else {
            lower_unmasked.contains(word)
        };

        if is_match && !detected_words.iter().any(|d| d == word) {
            detected_words.push(word.to_string());
        }
    }

    // Strip URLs before checking banter tokens to avoid false matches on discord.gg or similar
    let url_strip_re = regex::Regex::new(r"https?://\S+|discord\.gg/\S+").unwrap();
    let text_without_urls = url_strip_re.replace_all(&lower_unmasked, " ");

    let has_mentions = !mentions.is_empty();
    let has_pronoun = PRONOUNS.iter().any(|&p| {
        let pattern = format!(r"\b{}\b", regex::escape(p));
        regex::Regex::new(&pattern).map(|r| r.is_match(&text_without_urls)).unwrap_or(false)
            || text_without_urls.contains(p)
    });
    let has_game_obj = GAME_OBJECTS.iter().any(|&obj| text_without_urls.contains(obj));
    let has_banter = BANTER_TOKENS.iter().any(|&b| {
        if b.chars().all(|c| c.is_alphabetic()) {
            let pattern = format!(r"\b{}\b", regex::escape(b));
            regex::Regex::new(&pattern).map(|r| r.is_match(&text_without_urls)).unwrap_or(false)
        } else {
            text_without_urls.contains(b)
        }
    });

    let target = if has_mentions {
        TargetKind::ExplicitUserMention
    } else if has_game_obj {
        TargetKind::GameObject
    } else if has_pronoun {
        TargetKind::SecondPersonPronoun
    } else {
        TargetKind::None
    };

    if detected_words.is_empty() {
        return ToxicityVerdict {
            category: ToxicityCategory::Clean,
            is_toxic: false,
            score: 0.0,
            target,
            normalized_text: unmasked,
            detected_words,
        };
    }

    if is_severe {
        return ToxicityVerdict {
            category: ToxicityCategory::SevereToxicity,
            is_toxic: true,
            score: 0.99,
            target,
            normalized_text: unmasked,
            detected_words,
        };
    }

    if has_game_obj && target == TargetKind::GameObject {
        return ToxicityVerdict {
            category: ToxicityCategory::GamingFrustration,
            is_toxic: false,
            score: 0.35,
            target: TargetKind::GameObject,
            normalized_text: unmasked,
            detected_words,
        };
    }

    if has_banter {
        return ToxicityVerdict {
            category: ToxicityCategory::FriendlyBanter,
            is_toxic: false,
            score: 0.30,
            target,
            normalized_text: unmasked,
            detected_words,
        };
    }

    // Default to harassment for directed or untargeted slurs
    ToxicityVerdict {
        category: ToxicityCategory::Harassment,
        is_toxic: true,
        score: if target == TargetKind::SecondPersonPronoun || target == TargetKind::ExplicitUserMention { 0.90 } else { 0.75 },
        target,
        normalized_text: unmasked,
        detected_words,
    }
}

pub fn test_message_diagnostics(content: &str, mentions: &[Id<UserMarker>]) -> TestMessageDiagnostic {
    let verdict = classify_toxicity(content, mentions);
    TestMessageDiagnostic {
        verdict,
        ephemeral: true,
        sanctions_applied: false,
    }
}

// ---------------------------------------------------------------------------
// R2: Message & Media Guard Contracts (OCR, Links, Mentions, Flood)
// ---------------------------------------------------------------------------

pub trait VisionOcrEngine: Send + Sync {
    async fn scan_image(&self, url: &str) -> anyhow::Result<String>;
}

pub struct MockVisionOcrEngine {
    responses: HashMap<String, String>,
}

impl MockVisionOcrEngine {
    pub fn new() -> Self {
        Self {
            responses: HashMap::new(),
        }
    }

    pub fn set_response(&mut self, url: impl Into<String>, text: impl Into<String>) {
        self.responses.insert(url.into(), text.into());
    }
}

impl VisionOcrEngine for MockVisionOcrEngine {
    async fn scan_image(&self, url: &str) -> anyhow::Result<String> {
        Ok(self.responses.get(url).cloned().unwrap_or_default())
    }
}

#[derive(Clone, Debug, PartialEq)]
pub enum ScamVerdict {
    Clean,
    CryptoCasinoScam { reason: String, confidence: f32 },
}

pub fn scan_ocr_text(text: &str) -> ScamVerdict {
    let lower = text.to_lowercase();

    let crypto_giveaway = lower.contains("giveaway")
        || (lower.contains("btc") && (lower.contains("claim") || lower.contains("free") || lower.contains("send")))
        || (lower.contains("crypto") && lower.contains("airdrop"))
        || lower.contains("unauthorized withdrawal");

    let casino_promo = (lower.contains("promo code") || lower.contains("bonus code"))
        && (lower.contains("casino") || lower.contains("stake") || lower.contains("spins") || lower.contains("deposit"));

    let fake_nitro = (lower.contains("discord nitro") || lower.contains("nitro gift"))
        && (lower.contains("free") || lower.contains("claim") || lower.contains("months"));

    if crypto_giveaway {
        ScamVerdict::CryptoCasinoScam {
            reason: "Detected cryptocurrency giveaway/unauthorized withdrawal pattern".to_string(),
            confidence: 0.95,
        }
    } else if casino_promo {
        ScamVerdict::CryptoCasinoScam {
            reason: "Detected online casino promo code / gambling incentive pattern".to_string(),
            confidence: 0.92,
        }
    } else if fake_nitro {
        ScamVerdict::CryptoCasinoScam {
            reason: "Detected fake Discord Nitro giveaway scam in image".to_string(),
            confidence: 0.96,
        }
    } else {
        ScamVerdict::Clean
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum LinkVerdict {
    Allowed,
    Phishing { domain: String },
    UnauthorizedInvite { code: String },
}

pub fn evaluate_link(
    content: &str,
    allowed_domains: &[&str],
    allowed_invites: &[&str],
) -> LinkVerdict {
    let lower = content.to_lowercase();

    // Check Discord invites
    let invite_re = regex::Regex::new(r"(?:discord\.gg|discord(?:app)?\.com/invite)/([a-zA-Z0-9_\-]+)").unwrap();
    if let Some(caps) = invite_re.captures(&lower) {
        let code = caps.get(1).map(|m| m.as_str()).unwrap_or_default();
        if !allowed_invites.iter().any(|&inv| inv.eq_ignore_ascii_case(code)) {
            return LinkVerdict::UnauthorizedInvite {
                code: code.to_string(),
            };
        }
    }

    // Check Phishing / Typosquats
    const KNOWN_PHISHING: &[&str] = &[
        "dlscord-nitro", "steamcomminuty", "discrodapp", "free-nitro",
        "nitro-drop", "gift-discord", "discorcl", "d1scord", "steancommunity",
    ];

    for &phish in KNOWN_PHISHING {
        if lower.contains(phish) {
            return LinkVerdict::Phishing {
                domain: phish.to_string(),
            };
        }
    }

    // Check URLs against allowed whitelist
    let url_re = regex::Regex::new(r"https?://([a-zA-Z0-9\.\-_]+)").unwrap();
    for caps in url_re.captures_iter(&lower) {
        if let Some(domain_match) = caps.get(1) {
            let domain = domain_match.as_str();
            let is_allowed = allowed_domains.iter().any(|&allowed| {
                domain == allowed || domain.ends_with(&format!(".{}", allowed))
            });
            if !is_allowed {
                // Legitimate discord invite domain handled by invite check
                if domain == "discord.gg" || domain == "discord.com" || domain == "discordapp.com" {
                    continue;
                }
                // If domain looks like discord or steam typosquat, flag phishing
                if domain.contains("discord") || domain.contains("steam") || domain.contains("nitro") {
                    return LinkVerdict::Phishing {
                        domain: domain.to_string(),
                    };
                }
            }
        }
    }

    LinkVerdict::Allowed
}

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
    // Staff bypass
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
        return MentionVerdict::UnauthorizedMassMention {
            count: user_mention_count,
        };
    }

    MentionVerdict::Allow
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum FloodAction {
    Allow,
    PurgeAndTimeout {
        message_ids: Vec<Id<MessageMarker>>,
        duration_seconds: u64,
    },
}

#[derive(Clone, Debug)]
struct MessageRecord {
    id: Id<MessageMarker>,
    content: String,
    timestamp: Instant,
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

    pub fn record_and_evaluate(
        &mut self,
        user_id: Id<UserMarker>,
        message_id: Id<MessageMarker>,
        content: &str,
        now: Instant,
    ) -> FloodAction {
        let history = self.user_history.entry(user_id).or_default();

        // Evict expired entries
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
            history.clear(); // Clear so consecutive messages don't repeatedly trigger
            FloodAction::PurgeAndTimeout {
                message_ids,
                duration_seconds: 300,
            }
        } else {
            FloodAction::Allow
        }
    }
}

// ---------------------------------------------------------------------------
// R3: Join-Velocity Anti-Raid Contracts
// ---------------------------------------------------------------------------

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct JoinRecord {
    pub user_id: Id<UserMarker>,
    pub joined_at: Instant,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum JoinDecision {
    Allow,
    TriggerLockdown {
        suspect_user_ids: Vec<Id<UserMarker>>,
        reason: String,
    },
    KickRaidMember {
        user_id: Id<UserMarker>,
    },
}

pub struct GuildRaidState {
    window: Duration,
    burst_threshold: usize,
    lockdown_duration: Duration,
    recent_joins: VecDeque<JoinRecord>,
    locked_until: Option<Instant>,
}

impl GuildRaidState {
    pub fn new(window: Duration, burst_threshold: usize, lockdown_duration: Duration) -> Self {
        Self {
            window,
            burst_threshold,
            lockdown_duration,
            recent_joins: VecDeque::new(),
            locked_until: None,
        }
    }

    pub fn is_locked(&self, now: Instant) -> bool {
        if let Some(until) = self.locked_until {
            now < until
        } else {
            false
        }
    }

    pub fn evaluate_join(&mut self, user_id: Id<UserMarker>, now: Instant) -> JoinDecision {
        // If already locked down, kick incoming members immediately
        if self.is_locked(now) {
            return JoinDecision::KickRaidMember { user_id };
        } else {
            self.locked_until = None;
        }

        // Evict expired joins
        while let Some(front) = self.recent_joins.front() {
            if now.saturating_duration_since(front.joined_at) > self.window {
                self.recent_joins.pop_front();
            } else {
                break;
            }
        }

        self.recent_joins.push_back(JoinRecord {
            user_id,
            joined_at: now,
        });

        if self.recent_joins.len() >= self.burst_threshold {
            let suspect_user_ids: Vec<Id<UserMarker>> =
                self.recent_joins.iter().map(|j| j.user_id).collect();
            self.locked_until = Some(now + self.lockdown_duration);
            self.recent_joins.clear();

            JoinDecision::TriggerLockdown {
                suspect_user_ids,
                reason: format!(
                    "Join-velocity raid detected (>= {} joins in {:?})",
                    self.burst_threshold, self.window
                ),
            }
        } else {
            JoinDecision::Allow
        }
    }

    pub fn unlock(&mut self) {
        self.locked_until = None;
        self.recent_joins.clear();
    }
}

// ---------------------------------------------------------------------------
// R4: Gatekeeper & Temporary Roles Contracts
// ---------------------------------------------------------------------------

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CaptchaChallenge {
    pub user_id: Id<UserMarker>,
    pub prompt: String,
    pub correct_token: String,
    pub options: Vec<(String, String)>, // (label, token)
}

pub fn generate_captcha(user_id: Id<UserMarker>, seed: u64) -> CaptchaChallenge {
    let pool = [
        ("🟢 Émeraude", "emerald"),
        ("🔴 Rubis", "ruby"),
        ("🔵 Saphir", "sapphire"),
        ("🟡 Topaze", "topaz"),
        ("🟣 Améthyste", "amethyst"),
    ];

    let correct_idx = (seed as usize) % pool.len();
    let (correct_label, correct_token) = pool[correct_idx];
    let prompt = format!("Cliquez sur le bouton {}", correct_label);

    let mut options = Vec::new();
    for (i, &(label, token)) in pool.iter().enumerate() {
        if i == correct_idx || options.len() < 3 {
            options.push((label.to_string(), token.to_string()));
        }
    }

    // Deterministic pseudo-shuffle using seed
    if seed % 2 == 1 {
        options.reverse();
    }

    CaptchaChallenge {
        user_id,
        prompt,
        correct_token: correct_token.to_string(),
        options,
    }
}

pub fn verify_captcha(challenge: &CaptchaChallenge, submitted_token: &str) -> bool {
    challenge.correct_token == submitted_token
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TempRoleDecayRecord {
    pub id: i64,
    pub guild_id: i64,
    pub user_id: i64,
    pub role_id: i64,
    pub expires_at: chrono::DateTime<chrono::Utc>,
}

pub fn filter_expired_roles(
    records: &[TempRoleDecayRecord],
    now: chrono::DateTime<chrono::Utc>,
) -> Vec<TempRoleDecayRecord> {
    records
        .iter()
        .filter(|rec| rec.expires_at <= now)
        .cloned()
        .collect()
}
