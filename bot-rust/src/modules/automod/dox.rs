//! Anti-dox : IP publiques, emails, cartes bancaires (Luhn + marque), adresses BTC/ETH.
//! shortcut: pas de détection de téléphone ni d'adresses Solana (trop de faux positifs), à ajouter si besoin.

use regex::Regex;
use std::net::IpAddr;
use std::sync::LazyLock;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DoxKind {
    Ip,
    Email,
    CreditCard,
    Crypto,
}

impl DoxKind {
    pub fn label(self) -> &'static str {
        match self {
            DoxKind::Ip => "Adresse IP",
            DoxKind::Email => "Adresse email",
            DoxKind::CreditCard => "Carte bancaire",
            DoxKind::Crypto => "Adresse crypto",
        }
    }
}

static IPV4: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b").unwrap()
});
static EMAIL: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\b[A-Za-z0-9._%+\-]{1,64}@[A-Za-z0-9.\-]{1,253}\.[A-Za-z]{2,}\b").unwrap());
static CARD: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\b(?:\d[ \-]*?){13,19}\b").unwrap());
static CRYPTO: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\b(?:[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,90}|0x[a-fA-F0-9]{40})\b").unwrap()
});
// Mentions, salons, emojis custom, timestamps et snowflakes : jamais des données personnelles.
static DISCORD_SYNTAX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"<@[!&]?\d+>|<#\d+>|<a?:\w+:\d+>|<t:\d+(?::[a-zA-Z])?>|\b\d{17,20}\b").unwrap());

fn is_public_ipv4(s: &str) -> bool {
    match s.parse::<IpAddr>() {
        Ok(IpAddr::V4(ip)) => !(ip.is_private() || ip.is_loopback() || ip.is_unspecified() || ip.is_broadcast() || ip.is_link_local()),
        _ => false,
    }
}

fn luhn(digits: &str) -> bool {
    let sum: u32 = digits
        .chars()
        .rev()
        .filter_map(|c| c.to_digit(10))
        .enumerate()
        .map(|(i, d)| if i % 2 == 1 { let x = d * 2; if x > 9 { x - 9 } else { x } } else { d })
        .sum();
    sum > 0 && sum % 10 == 0
}

fn is_valid_card(raw: &str) -> bool {
    let d: String = raw.chars().filter(char::is_ascii_digit).collect();
    let n = d.len();
    let brand = if d.starts_with('4') {
        matches!(n, 13 | 16 | 19)
    } else if d.starts_with("34") || d.starts_with("37") {
        n == 15
    } else if d.starts_with("36") || d.starts_with("38") {
        (14..=16).contains(&n)
    } else if (51..=55).any(|p| d.starts_with(&p.to_string())) || d.starts_with("6011") || d.starts_with("65") {
        n == 16
    } else if n >= 4 && d[..4].parse::<u16>().is_ok_and(|p| (2221..=2720).contains(&p) || (3528..=3589).contains(&p)) {
        n == 16
    } else {
        false
    };
    brand && luhn(&d)
}

pub fn detect_dox(content: &str) -> Option<DoxKind> {
    let text = DISCORD_SYNTAX.replace_all(content, " ");
    if IPV4.find_iter(&text).any(|m| is_public_ipv4(m.as_str())) {
        return Some(DoxKind::Ip);
    }
    if EMAIL.is_match(&text) {
        return Some(DoxKind::Email);
    }
    if CARD.find_iter(&text).any(|m| is_valid_card(m.as_str())) {
        return Some(DoxKind::CreditCard);
    }
    if CRYPTO.is_match(&text) {
        return Some(DoxKind::Crypto);
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_each_kind() {
        assert_eq!(detect_dox("mon ip 8.8.8.8 ok"), Some(DoxKind::Ip));
        assert_eq!(detect_dox("écris à jean.dupont@gmail.com"), Some(DoxKind::Email));
        assert_eq!(detect_dox("cb 4111 1111 1111 1111"), Some(DoxKind::CreditCard));
        assert_eq!(detect_dox("0x52908400098527886E0F7030069857D2E4169EE7"), Some(DoxKind::Crypto));
    }

    #[test]
    fn ignores_harmless_content() {
        assert_eq!(detect_dox("serveur 192.168.1.10 et 127.0.0.1"), None);
        assert_eq!(detect_dox("<@123456789012345678> salut"), None);
        assert_eq!(detect_dox("id 1234567890123456789"), None);
        assert_eq!(detect_dox("4111 1111 1111 1112"), None); // Luhn invalide
        assert_eq!(detect_dox("version 1.2.3.4a"), None);
    }
}
