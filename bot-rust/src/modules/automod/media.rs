use std::collections::HashMap;
use std::sync::LazyLock;
use regex::Regex;

#[allow(async_fn_in_trait)]
pub trait VisionOcrEngine: Send + Sync {
    async fn scan_image(&self, url: &str) -> anyhow::Result<String>;
}

pub struct HttpVisionOcrEngine {
    client: reqwest::Client,
    endpoint_url: String,
    api_key: Option<String>,
}

impl HttpVisionOcrEngine {
    pub fn new(endpoint_url: impl Into<String>, api_key: Option<String>) -> Self {
        Self {
            client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(10))
                .build()
                .unwrap_or_else(|_| reqwest::Client::new()),
            endpoint_url: endpoint_url.into(),
            api_key,
        }
    }
}

impl Default for HttpVisionOcrEngine {
    fn default() -> Self {
        let endpoint = std::env::var("VISION_OCR_ENDPOINT")
            .unwrap_or_else(|_| "https://api.paranoia-mc.fr/vision/ocr".to_string());
        let api_key = std::env::var("VISION_OCR_API_KEY").ok();
        Self::new(endpoint, api_key)
    }
}

impl VisionOcrEngine for HttpVisionOcrEngine {
    async fn scan_image(&self, url: &str) -> anyhow::Result<String> {
        let mut request = self
            .client
            .post(&self.endpoint_url)
            .json(&serde_json::json!({ "image_url": url }));

        if let Some(ref key) = self.api_key {
            request = request.header("Authorization", format!("Bearer {}", key));
        }

        let response = request.send().await?;
        if !response.status().is_success() {
            anyhow::bail!("OCR endpoint returned HTTP {}", response.status());
        }

        let body: serde_json::Value = response.json().await?;
        if let Some(text) = body.get("text").and_then(|t| t.as_str()) {
            Ok(text.to_string())
        } else if let Some(text) = body.get("extracted_text").and_then(|t| t.as_str()) {
            Ok(text.to_string())
        } else {
            Ok(body.to_string())
        }
    }
}

#[allow(dead_code)]
#[derive(Clone, Debug, Default, PartialEq)]
pub struct MockVisionOcrEngine {
    responses: HashMap<String, String>,
}

#[allow(dead_code)]
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

static CRYPTO_TOKEN_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(?:btc|eth|sol|usdt|bitcoin|ethereum|crypto)\b")
        .expect("Valid regex for crypto token")
});

static WITHDRAWAL_SCAM_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)(unauthori[zs]ed\s+withdraw(?:al)?|withdraw(?:al)?\s+(?:confirmation|request|pending|alert)|(?:pending|confirm)\s+withdraw(?:al)?)")
        .expect("Valid regex for withdrawal scam")
});

static CRYPTO_SCAM_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)(unauthori[zs]ed\s+withdraw(?:al)?|withdraw(?:al)?\s+(?:confirmation|request|pending|alert)|airdrop|claim\s+[0-9.]+\s*\b(?:btc|eth|sol|usdt|bitcoin|ethereum)\b|\b(?:btc|eth|sol|usdt|bitcoin|ethereum|crypto)\b\s+giveaway|(?:official\s+)?giveaway.*\b(?:btc|eth|sol|usdt|bitcoin|ethereum)\b|send\s+[0-9.]+\s*\b(?:btc|eth)\b.*get)")
        .expect("Valid regex for crypto scam")
});

static CASINO_SCAM_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)((?:promo|bonus|voucher)[-_ ]*code|free\s*spins|deposit\s*(?:match|bonus)|roll\s*casino|stake100|rollbit|roobet)")
        .expect("Valid regex for casino scam")
});

static PROMO_CODE_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)(?:promo|bonus|voucher)[-_ ]*code")
        .expect("Valid regex for promo code")
});

static NITRO_SCAM_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)(discord\s*nitro|nitro\s*(?:gift|generator|giveaway|drop)|free\s*(?:discord\s*)?nitro)")
        .expect("Valid regex for nitro scam")
});

pub fn scan_ocr_text(text: &str) -> ScamVerdict {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return ScamVerdict::Clean;
    }

    let lower = trimmed.to_lowercase();

    // 1. Check Fake Discord Nitro gift scams first (to avoid generic giveaway overlap)
    let has_nitro = lower.contains("discord nitro")
        || lower.contains("nitro gift")
        || lower.contains("free nitro")
        || lower.contains("nitro giveaway")
        || lower.contains("nitro generator");
    let has_nitro_action = lower.contains("free")
        || lower.contains("claim")
        || lower.contains("months")
        || lower.contains("gift")
        || lower.contains("giveaway")
        || lower.contains("generator");

    if (has_nitro && has_nitro_action) || NITRO_SCAM_RE.is_match(&lower) {
        return ScamVerdict::CryptoCasinoScam {
            reason: "Detected fake Discord Nitro giveaway scam in image".to_string(),
            confidence: 0.96,
        };
    }

    // 2. Check Crypto giveaway & unauthorized withdrawal scam patterns
    let has_unauthorized_withdrawal = WITHDRAWAL_SCAM_RE.is_match(&lower);
    let has_crypto_token = CRYPTO_TOKEN_RE.is_match(&lower);

    let has_crypto_giveaway = lower.contains("giveaway") && has_crypto_token;
    let has_crypto_airdrop = lower.contains("airdrop") && (has_crypto_token || lower.contains("token"));
    let has_claim_crypto = (lower.contains("claim")
        || lower.contains("free")
        || lower.contains("bonus")
        || lower.contains("send"))
        && has_crypto_token;

    if has_unauthorized_withdrawal
        || has_crypto_giveaway
        || has_crypto_airdrop
        || has_claim_crypto
        || CRYPTO_SCAM_RE.is_match(&lower)
    {
        return ScamVerdict::CryptoCasinoScam {
            reason: "Detected cryptocurrency giveaway/unauthorized withdrawal pattern".to_string(),
            confidence: 0.95,
        };
    }

    // 3. Check Casino & gambling scam patterns
    let has_promo_code = PROMO_CODE_RE.is_match(&lower)
        || lower.contains("promocode")
        || lower.contains("bonuscode")
        || lower.contains("vouchercode")
        || lower.contains("bonus promo code");
    let has_casino_context = lower.contains("casino")
        || lower.contains("stake")
        || lower.contains("spins")
        || lower.contains("deposit")
        || lower.contains("rollbit")
        || lower.contains("roobet");

    if (has_promo_code && has_casino_context) || CASINO_SCAM_RE.is_match(&lower) {
        return ScamVerdict::CryptoCasinoScam {
            reason: "Detected online casino promo code / gambling incentive pattern".to_string(),
            confidence: 0.92,
        };
    }

    ScamVerdict::Clean
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_mock_vision_ocr_engine() {
        let mut engine = MockVisionOcrEngine::new();
        engine.set_response("https://example.com/img1.png", "Hello World");

        let res = engine.scan_image("https://example.com/img1.png").await.unwrap();
        assert_eq!(res, "Hello World");

        let missing = engine.scan_image("https://example.com/img2.png").await.unwrap();
        assert_eq!(missing, "");
    }

    #[test]
    fn test_scan_ocr_text_clean() {
        assert_eq!(scan_ocr_text(""), ScamVerdict::Clean);
        assert_eq!(scan_ocr_text("   \n\t  "), ScamVerdict::Clean);
        assert_eq!(
            scan_ocr_text("Paranoia SMP Season 3 - Player Stats: 120 Kills, 4 Deaths"),
            ScamVerdict::Clean
        );
    }

    #[test]
    fn test_scan_ocr_text_crypto_giveaway() {
        let verdict = scan_ocr_text("OFFICIAL GIVEAWAY! Elon Musk 100 BTC Giveaway, claim 0.5 BTC now!");
        match verdict {
            ScamVerdict::CryptoCasinoScam { confidence, reason } => {
                assert!(confidence >= 0.90);
                assert!(reason.contains("cryptocurrency"));
            }
            ScamVerdict::Clean => panic!("Expected crypto scam"),
        }
    }

    #[test]
    fn test_scan_ocr_text_casino_promo() {
        let verdict = scan_ocr_text("Use promo code STAKE100 for 100 free spins and deposit match on roll casino!");
        match verdict {
            ScamVerdict::CryptoCasinoScam { confidence, reason } => {
                assert!(confidence >= 0.90);
                assert!(reason.contains("casino"));
            }
            ScamVerdict::Clean => panic!("Expected casino scam"),
        }
    }

    #[test]
    fn test_scan_ocr_text_unauthorized_withdrawal() {
        let verdict = scan_ocr_text("Security Alert: Unauthorized withdrawal of 2.45 BTC detected. Confirm cancellation.");
        match verdict {
            ScamVerdict::CryptoCasinoScam { reason, .. } => {
                assert!(reason.contains("cryptocurrency"));
            }
            ScamVerdict::Clean => panic!("Expected unauthorized withdrawal scam"),
        }
    }

    #[test]
    fn test_scan_ocr_text_fake_nitro() {
        let verdict = scan_ocr_text("Discord Nitro Gift! Claim 3 months free discord nitro now!");
        match verdict {
            ScamVerdict::CryptoCasinoScam { confidence, reason } => {
                assert!(confidence >= 0.90);
                assert!(reason.contains("Nitro"));
            }
            ScamVerdict::Clean => panic!("Expected nitro scam"),
        }
    }
}
