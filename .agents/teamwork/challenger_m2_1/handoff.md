# Handoff Report: Milestone 2 Adversarial Stress-Testing & Verification

**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

Direct observations from source inspection and empirical test execution in `/home/leo/Code/Paranoia_New/bot-rust`:

### A. Trailing Dot FQDN Invite Filter Bypass (`links.rs`)
- **Code Location**: `bot-rust/src/modules/automod/links.rs:61-64, 112-124`
  ```rust
  static INVITE_RE: LazyLock<Regex> = LazyLock::new(|| {
      Regex::new(r"(?i)(?:https?://)?(?:www\.)?(?:discord\.(?:gg|io|me|li)|discord(?:app)?\.com/invite)/([a-zA-Z0-9_\-]+)")
          .expect("Valid regex for Discord invites")
  });
  ...
  for caps in URL_RE.captures_iter(&lower) {
      if let Some(domain_match) = caps.get(1) {
          let domain = domain_match.as_str().trim_end_matches('.');
          let is_allowed = allowed_domains.iter().any(|&allowed| {
              domain == allowed || domain.ends_with(&format!(".{}", allowed))
          });
          if !is_allowed {
              if domain == "discord.gg" || domain == "discord.com" || domain == "discordapp.com" {
                  continue;
              }
              ...
  ```
- **Observed Behavior**:
  - In `https://discord.gg./evil-raid`, `INVITE_RE` fails to match because the trailing dot `.` precedes `/` (`discord.gg./` vs `discord.gg/`).
  - Next, Step 3 extracts domain `"discord.gg."`, calls `trim_end_matches('.')` yielding `"discord.gg"`.
  - `"discord.gg"` matches `DEFAULT_ALLOWED_DOMAINS`, so `is_allowed` evaluates to `true`.
  - Result: `evaluate_link("https://discord.gg./evil-raid", DEFAULT_ALLOWED_DOMAINS, &["paranoia"])` returns `LinkVerdict::Allowed`.
  - Same bypass confirmed on `https://discord.com./invite/evil-raid` -> returns `LinkVerdict::Allowed`.

### B. Whitelisted Discord Shortcuts (`discord.me`, `discord.io`, `discord.li`) Falsely Flagged as Phishing (`links.rs`)
- **Code Location**: `bot-rust/src/modules/automod/links.rs:11-33, 116-136`
  ```rust
  pub const DEFAULT_ALLOWED_DOMAINS: &[&str] = &[
      "paranoia-mc.fr",
      "paranoia.studio",
      "paranoiasmp.fr",
      "discord.gg",
      "discord.com",
      "discordapp.com",
      ...
  ];
  ...
  if !is_allowed {
      if domain == "discord.gg" || domain == "discord.com" || domain == "discordapp.com" {
          continue;
      }
      if domain.contains("discord") || domain.contains("steam") || domain.contains("nitro") || domain.contains("paranoia") {
          return LinkVerdict::Phishing { domain: domain.to_string() };
      }
  }
  ```
- **Observed Behavior**:
  - When an authorized shortcut invite is checked, e.g. `evaluate_link("https://discord.me/paranoia", DEFAULT_ALLOWED_DOMAINS, &["paranoia"])`:
  - Step 1 (`INVITE_RE`) correctly captures `"paranoia"`, finds it in `allowed_invites`, and does NOT flag it as unauthorized.
  - Execution continues to Step 3 (`URL_RE`), which extracts `domain = "discord.me"`.
  - `"discord.me"` is NOT in `DEFAULT_ALLOWED_DOMAINS`, so `is_allowed` is `false`.
  - Line 122 only skips `"discord.gg"`, `"discord.com"`, and `"discordapp.com"`. It does NOT skip `"discord.me"`, `"discord.io"`, or `"discord.li"`.
  - Line 127 detects that `"discord.me"` contains `"discord"`, and line 133 returns `LinkVerdict::Phishing { domain: "discord.me" }`.
  - Confirmed: Legitimate server invites `https://discord.me/paranoia` and `https://discord.io/paranoia` are falsely classified as `LinkVerdict::Phishing`.

### C. Double Slash Invite Bypass (`links.rs`)
- **Code Location**: `bot-rust/src/modules/automod/links.rs:61-64`
- **Observed Behavior**:
  - `https://discord.gg//evil-raid` is normalized by browsers/servers to `/evil-raid`.
  - However, `INVITE_RE` expects a single slash `discord.gg/([a-zA-Z0-9_\-]+)`.
  - `INVITE_RE` fails to match the double slash; Step 3 treats `discord.gg` as allowed and returns `LinkVerdict::Allowed`.

### D. Unicode Homoglyphs and IDN Phishing Evasion (`links.rs`)
- **Code Location**: `bot-rust/src/modules/automod/links.rs:56-59, 61-64`
  ```rust
  static URL_RE: LazyLock<Regex> = LazyLock::new(|| {
      Regex::new(r"(?i)https?://([a-zA-Z0-9\.\-_]+)(?::[0-9]+)?(/[^\s]*)?")
          .expect("Valid regex for URLs")
  });
  ```
- **Observed Behavior**:
  - `URL_RE` uses `[a-zA-Z0-9\.\-_]+`, which truncates at the first non-ASCII character.
  - Phishing domain `https://dіscord-nitro.com/gift` (using Cyrillic small letter `і` U+0456) has its domain truncated to `"d"`.
  - `"d"` does not contain `"discord"` or `"nitro"` in ASCII; `evaluate_link` returns `LinkVerdict::Allowed`.
  - Likewise, `https://dіscord.gg/evil-raid` and `https://discord.gg/аttack` (Cyrillic `а` U+0430 in code) evade `INVITE_RE` and return `LinkVerdict::Allowed`.

### E. Crypto Scam Withdrawal Prompts and British Spelling Evasions (`media.rs`)
- **Code Location**: `bot-rust/src/modules/automod/media.rs:96-99, 140, 157-167`
  ```rust
  static CRYPTO_SCAM_RE: LazyLock<Regex> = LazyLock::new(|| {
      Regex::new(r"(?i)(unauthorized\s+withdrawal|airdrop|claim\s+[0-9.]+\s*(?:btc|eth|sol|usdt|bitcoin|ethereum)|(?:btc|eth|sol|usdt|bitcoin|ethereum|crypto)\s+giveaway|(?:official\s+)?giveaway.*(?:btc|eth|sol|usdt|bitcoin|ethereum)|send\s+[0-9.]+\s*(?:btc|eth).*get)")
          .expect("Valid regex for crypto scam")
  });
  ...
  let has_unauthorized_withdrawal = lower.contains("unauthorized withdrawal");
  ```
- **Observed Behavior**:
  - `scan_ocr_text("Unauthorised withdrawal of 2.50 BTC detected. Cancel transaction here.")` -> returns `ScamVerdict::Clean` (British 's' instead of 'z').
  - `scan_ocr_text("Withdrawal confirmation required: 2.5 BTC pending transfer. Click link to confirm or cancel.")` -> returns `ScamVerdict::Clean` (pending confirmation prompt without "unauthorized").
  - `scan_ocr_text("Unauthorized withdraw of 1.50 ETH initiated from your account.")` -> returns `ScamVerdict::Clean` (verb form "withdraw" instead of "withdrawal").
  - `scan_ocr_text("Withdrawal request of 5000 USDT completed. If you did not initiate this, report now.")` -> returns `ScamVerdict::Clean`.

### F. Delimited Promo Code Evasion (`media.rs`)
- **Code Location**: `bot-rust/src/modules/automod/media.rs:101-104, 170-186`
- **Observed Behavior**:
  - `scan_ocr_text("Use promo-code: LUCKY777 on our casino!")` -> returns `ScamVerdict::Clean`.
  - `has_promo_code` checks `"promo code"` with a space. `CASINO_SCAM_RE` uses `(?:promo|bonus|voucher)\s*code` which allows whitespace but rejects `-` or `_`.

### G. Empirical Test Suite Execution
- Running the newly authored adversarial stress test suite in `tests/adversarial_media_and_links_stress_test.rs`:
  ```
  running 48 tests
  test test_ocr_fragmented_keywords ... ok
  test test_link_filter_url_casing ... ok
  test test_link_filter_unicode_domain_lookalikes_vulnerabilities ... ok
  test test_link_filter_trailing_dots_evasion_vulnerabilities ... ok
  test test_link_filter_double_slash_evasion_vulnerability ... ok
  test test_link_filter_discord_shortcuts_false_positive_vulnerability ... ok
  test test_ocr_mixed_case_resilience ... ok
  test test_ocr_hyphenated_and_delimited_promo_codes_vulnerability ... ok
  test test_ocr_withdrawal_prompt_variations_vulnerabilities ... ok
  test test_ocr_subtle_text_variations_and_separators ... ok
  test test_ocr_clean_gaming_false_positive_immunity ... ok
  ...
  test result: ok. 48 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.02s
  ```

---

## 2. Logic Chain

1. **R2 Requirements & Specifications**:
   - `ORIGINAL_REQUEST.md §R2` mandates:
     - "Scan image attachments using OCR/vision analysis to detect text matching crypto/casino scams (e.g., fake giveaway winnings, promo codes, unauthorized withdrawals)."
     - "Intercept and delete phishing links and unauthorized Discord invites."
   - `PROJECT.md §Milestones M2` mandates:
     - "Link filter correctly blocks unauthorized invites and phishing domains while allowing whitelisted links."
2. **Trailing Dot Bypass**:
   - In DNS and standard URL resolution, `https://discord.gg./code` resolves identically to `https://discord.gg/code`.
   - Because `INVITE_RE` enforces an immediate slash after the TLD (`discord\.(?:gg|io|me|li)/`), any URL with `discord.gg.` fails invite extraction.
   - When Step 3 validates the host, it strips the trailing dot (`trim_end_matches('.')`), matching `DEFAULT_ALLOWED_DOMAINS` (`"discord.gg"`), and returns `LinkVerdict::Allowed`.
   - Any malicious guild invite can bypass the filter by appending a single dot before the path.
3. **Authorized Shortcut False Positive**:
   - `INVITE_RE` explicitly supports shortcut domains (`discord.me`, `discord.io`, `discord.li`).
   - If an invite matches `allowed_invites` (e.g. `paranoia`), Step 1 passes.
   - However, Step 3 does not include `discord.me`, `discord.io`, or `discord.li` in `DEFAULT_ALLOWED_DOMAINS` or in the invite-domain bypass check (`if domain == "discord.gg" || domain == "discord.com" || domain == "discordapp.com"`).
   - Because `"discord.me"` and `"discord.io"` contain `"discord"`, line 127-133 unconditionally classifies the server's own legitimate invite as `LinkVerdict::Phishing`.
4. **OCR Withdrawal Scam Evasions**:
   - Threat actors frequently phrase withdrawal lure screenshots as `"Withdrawal confirmation required"`, `"Pending withdrawal"`, `"Withdrawal request"`, or use British English `"Unauthorised withdrawal"`.
   - Because `scan_ocr_text` only matches exact `"unauthorized withdrawal"` with 'z' and noun form, all other withdrawal prompt variants evade detection and are classified as `ScamVerdict::Clean`.
5. **Mitigations Required**:
   - In `links.rs`:
     - Update `INVITE_RE` to allow optional trailing dot and multiple slashes: `(?:discord\.(?:gg|io|me|li)\.?|discord(?:app)?\.com\.?/invite)/+([a-zA-Z0-9_\-]+)`.
     - In Step 3, include `discord.me`, `discord.io`, `discord.li` in the invite-domain exclusion check (`if domain == "discord.gg" || domain == "discord.com" || domain == "discordapp.com" || domain == "discord.me" || domain == "discord.io" || domain == "discord.li"`).
     - Normalize non-ASCII / Unicode homoglyphs (e.g. via `unmask_leetspeak` or NFKD decomposition) or expand `URL_RE` / domain heuristics to detect IDN/punycode lookalikes.
   - In `media.rs`:
     - Expand `CRYPTO_SCAM_RE` and string checks to match `unauthori[zs]ed\s+withdraw(?:al)?`, `withdrawal\s+(?:request|confirmation|pending|alert)`, and delimited promo codes `(?:promo|bonus|voucher)[-_ ]*code`.

---

## 3. Caveats

- In accordance with the Review-Only constraint, no implementation files in `src/` were altered.
- All 48 tests in `tests/adversarial_media_and_links_stress_test.rs` were executed strictly as verification tests.
- Punycode domains that do not contain known keywords in plaintext (e.g. `xn--...`) require Punycode decoding to reliably flag homoglyphs of allowed domains.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

Milestone 2 implementation in `bot-rust` contains:
1. **Critical Vulnerability**: Trailing dot FQDN invite filter bypass (`https://discord.gg./evil-raid` -> `LinkVerdict::Allowed`).
2. **Critical Bug**: Whitelisted `discord.me` and `discord.io` shortcuts falsely flagged as `LinkVerdict::Phishing`.
3. **High Vulnerability**: Double slash invite filter bypass (`https://discord.gg//evil-raid` -> `LinkVerdict::Allowed`).
4. **High Vulnerability**: Unicode homoglyph lookalikes (`dіscord-nitro.com`, `dіscord.gg/evil-raid`) evade URL and invite detection.
5. **High Gap**: Real-world crypto scam withdrawal prompts (British spelling, pending confirmation, withdrawal request) return `ScamVerdict::Clean`.
6. **Medium Gap**: Hyphenated promo codes (`promo-code: LUCKY777 on our casino`) return `ScamVerdict::Clean`.

---

## 5. Verification Method

To independently reproduce all findings and verify the bypasses and false positives:

1. Inspect the adversarial test suite:
   `/home/leo/Code/Paranoia_New/bot-rust/tests/adversarial_media_and_links_stress_test.rs`
2. Run the adversarial stress test target:
   `cd /home/leo/Code/Paranoia_New/bot-rust && cargo test --test adversarial_media_and_links_stress_test -- --nocapture`
   - Observe `test_link_filter_trailing_dots_evasion_vulnerabilities` confirming trailing dot bypasses.
   - Observe `test_link_filter_discord_shortcuts_false_positive_vulnerability` confirming whitelisted `discord.me/paranoia` returns `Phishing`.
   - Observe `test_link_filter_double_slash_evasion_vulnerability` confirming `discord.gg//code` returns `Allowed`.
   - Observe `test_link_filter_unicode_domain_lookalikes_vulnerabilities` confirming homoglyph bypasses.
   - Observe `test_ocr_withdrawal_prompt_variations_vulnerabilities` confirming withdrawal scam misses.
   - Observe `test_ocr_hyphenated_and_delimited_promo_codes_vulnerability` confirming `promo-code` misses.
3. Invalidation condition:
   Applying the suggested regex and domain exclusion improvements causes these bypasses to be intercepted as `UnauthorizedInvite`, `Phishing`, or `CryptoCasinoScam`, and official shortcuts to be allowed as `LinkVerdict::Allowed`.
