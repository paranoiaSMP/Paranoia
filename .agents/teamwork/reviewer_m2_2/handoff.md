# Review & Adversarial Challenge Report: Milestone 2 — Message & Media Guard

## Review Summary

**Verdict**: REQUEST_CHANGES
**Target Codebase**: `/home/leo/Code/Paranoia_New/bot-rust`
**Reviewer**: Milestone 2 Reviewer 2 & Adversarial Critic

---

## 1. Observation

1. **Compilation and Baseline Test Execution**:
   - `cargo check`: Finished in 0.82s with 0 errors and 0 warnings.
   - `cargo test --test media_and_message_guard_test`: Finished in 0.02s with 56 passed, 0 failed.
   - `cargo test -- --test-threads=1`: All test targets across existing suites passed cleanly.

2. **Interface Conformance with `PROJECT.md § Interface Contracts`**:
   - `VisionOcrEngine`: Implemented in `src/modules/automod/media.rs:6-8` as `pub trait VisionOcrEngine: Send + Sync { async fn scan_image(&self, url: &str) -> anyhow::Result<String>; }`. Conforms to Rust edition 2024 native async traits and matches `tests/common/contracts.rs`.
   - `ScamVerdict`: Matches `PROJECT.md` (`Clean`, `CryptoCasinoScam { reason: String, confidence: f32 }`).
   - `LinkVerdict`: Matches `PROJECT.md` (`Allowed`, `Phishing { domain: String }`, `UnauthorizedInvite { code: String }`).
   - `FloodAction`: Matches `PROJECT.md` (`Allow`, `PurgeAndTimeout { message_ids: Vec<Id<MessageMarker>>, duration_seconds: u64 }`).
   - `AntiFloodTracker`: Matches `PROJECT.md` with signature `pub fn record_and_evaluate(&mut self, user_id: Id<UserMarker>, message_id: Id<MessageMarker>, content: &str, now: Instant) -> FloodAction`.

3. **Multi-Invite Handling (`src/modules/automod/links.rs:87-100`)**:
   ```rust
   // 1. Check Discord invites
   if let Some(caps) = INVITE_RE.captures(&lower) {
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
   ```
   `INVITE_RE.captures(&lower)` only checks the first capture. In step 3 (line 122), `if domain == "discord.gg" || domain == "discord.com" || domain == "discordapp.com" { continue; }` bypasses URL domain checks for all Discord links.
   When a message contains:
   `"https://discord.gg/paranoia https://discord.gg/malicious-raid"`
   The first invite is allowed (`paranoia`), so step 1 does not return `UnauthorizedInvite`. Step 2 has no match. Step 3 ignores both domains because `domain == "discord.gg"`. `evaluate_link` returns `LinkVerdict::Allowed`.

4. **Cryptocurrency Substring Matching (`src/modules/automod/media.rs:141-167`)**:
   ```rust
   let has_crypto_token = lower.contains("btc")
       || lower.contains("eth")
       || lower.contains("crypto")
       || lower.contains("bitcoin")
       || lower.contains("ethereum")
       || lower.contains("usdt")
       || lower.contains("sol");
   ...
   let has_claim_crypto = (lower.contains("claim")
       || lower.contains("free")
       || lower.contains("bonus")
       || lower.contains("send"))
       && has_crypto_token;
   ```
   `lower.contains("eth")` matches any word containing "eth" (e.g., "Nether", "Netherite", "together", "method").
   `lower.contains("sol")` matches any word containing "sol" (e.g., "console", "solution", "solo").
   In Minecraft SMP chat screenshots:
   - "Claim free Netherite at spawn" -> matches `claim`, `free`, and `netherite` (contains `eth`) -> triggers `CryptoCasinoScam` with 0.95 confidence.
   - "Send coordinates together" -> matches `send` and `together` (contains `eth`) -> triggers `CryptoCasinoScam` with 0.95 confidence.
   In `src/events/automod.rs:247-274`, this triggers automatic message deletion and a 1-hour member timeout.

5. **Attachment Content Type & Extension Evaluation (`src/events/automod.rs:233-242`)**:
   ```rust
   let is_image = attachment
       .content_type
       .as_deref()
       .map(|ct| ct.starts_with("image/"))
       .unwrap_or(false)
       || attachment.filename.ends_with(".png")
       || attachment.filename.ends_with(".jpg")
       || attachment.filename.ends_with(".jpeg")
       || attachment.filename.ends_with(".webp");
   ```
   `ends_with` is case-sensitive in Rust. If `content_type` is `None` or `application/octet-stream` (common when files are uploaded without explicit MIME headers), attachments named with uppercase extensions (`.PNG`, `.JPG`, `.JPEG`) evaluate to `false` for `is_image` and bypass OCR scanning.

6. **URL Userinfo Extraction (`src/modules/automod/links.rs:56-59`)**:
   `URL_RE` uses `r"(?i)https?://([a-zA-Z0-9\.\-_]+)(?::[0-9]+)?(/[^\s]*)?"`.
   For `https://paranoia-mc.fr@malicious.com`, group 1 extracts `paranoia-mc.fr` because `@` terminates `[a-zA-Z0-9\.\-_]`. Since `paranoia-mc.fr` is in `DEFAULT_ALLOWED_DOMAINS`, it returns `LinkVerdict::Allowed`, while web clients navigate to `malicious.com`.

7. **Timestamp Precision & Anti-Flood Mechanics (`src/modules/automod/flood.rs:53-59`)**:
   `now.saturating_duration_since(front.timestamp) > self.window` cleanly supports sub-microsecond and zero-interval bursts without underflow. Monotonic `Instant::now()` ensures sequential order in production.

---

## 2. Logic Chain

1. **Multi-Invite Bypass**:
   - Observation 3 shows `INVITE_RE.captures` is called once without iterating over all matches.
   - In step 3 of `evaluate_link`, all `discord.gg` URLs are explicitly skipped (`continue;`) under the assumption that all invites were validated in step 1.
   - Therefore, appending an unauthorized Discord invite after a whitelisted invite bypasses the invite check entirely.
   - This represents a security vulnerability in the auto-moderation pipeline, allowing raid and rival server invites to evade detection.

2. **Minecraft Vocabulary False Positives**:
   - Observation 4 shows `has_crypto_token` checks for 3-letter substrings (`"eth"`, `"sol"`) without word boundary anchors.
   - The Paranoia SMP bot operates on a Minecraft server Discord where words like "Nether", "Netherite", and "console" are standard daily vocabulary.
   - When combined with common verbs like "claim" (e.g. land claims), "free" (free items/kits), or "send" (sending coordinates), ordinary gameplay screenshots will trigger false positive scam verdicts with 0.95 confidence, deleting messages and timing out innocent players for 1 hour.

3. **Attachment Extension Bypass**:
   - Observation 5 shows `ends_with` on `filename` is case-sensitive.
   - A scammer or bot can name malicious images `scam.PNG` or `fake_nitro.JPG`.
   - When uploaded via clients or bots that send `application/octet-stream`, `is_image` evaluates to `false`, completely skipping OCR and scam detection.

4. **Integrity Evaluation**:
   - All modules were audited for hardcoded test patterns, facades, and shortcuts.
   - Implementations are genuine and functional; no cheating or integrity violations were detected.
   - However, the logical edge cases and security bypasses identified require corrective changes before release.

---

## 3. Findings

### [Critical] Finding 1: Multi-Invite Detection Bypass in `evaluate_link`
- **Where**: `src/modules/automod/links.rs:87-100` and `links.rs:122`
- **Why**: `INVITE_RE.captures(&lower)` only evaluates the first invite found in the message text. If the first invite is whitelisted (e.g. `discord.gg/paranoia`), subsequent unauthorized invites (e.g. `discord.gg/raid-server`) are ignored. Step 3 skips `discord.gg` domains from general link checks. An attacker can distribute unauthorized Discord invites simply by prepending the official server invite.
- **Suggestion**: Use `INVITE_RE.captures_iter(&lower)` in a loop. If ANY invite in the message is not in `allowed_invites`, immediately return `LinkVerdict::UnauthorizedInvite { code: code.to_string() }`.

### [Major] Finding 2: False-Positive Crypto Scam Verdicts on Standard Minecraft Vocabulary
- **Where**: `src/modules/automod/media.rs:141-167`
- **Why**: `lower.contains("eth")` and `lower.contains("sol")` match inside normal words ("Nether", "Netherite", "together", "method", "console", "solution", "solo"). When paired with "claim" (land claims), "free", or "send" (coordinates), normal Minecraft screenshots trigger `ScamVerdict::CryptoCasinoScam` at 0.95 confidence, causing 1-hour timeouts.
- **Suggestion**: Use word-boundary token matching (e.g., regex `\b(?:btc|eth|sol|usdt|bitcoin|ethereum)\b` or tokenizing by non-alphanumeric delimiters) instead of raw `str::contains` for short token symbols.

### [Major] Finding 3: Case-Sensitive File Extension Bypasses OCR Inspection
- **Where**: `src/events/automod.rs:238-241`
- **Why**: `attachment.filename.ends_with(".png")` is case-sensitive. When `content_type` is omitted or generic (`application/octet-stream`), attachments with `.PNG`, `.JPG`, `.JPEG`, or `.WEBP` bypass OCR scanning entirely.
- **Suggestion**: Normalize the filename to lowercase before checking extension: `let filename_lower = attachment.filename.to_lowercase(); filename_lower.ends_with(".png") || ...`.

### [Minor] Finding 4: RFC 3986 Userinfo Domain Spoofing in `URL_RE`
- **Where**: `src/modules/automod/links.rs:56-59`
- **Why**: `URL_RE` does not account for userinfo (`user:pass@host`). In `https://paranoia-mc.fr@evil.com`, `paranoia-mc.fr` is matched as the domain, bypassing phishing and invite checks.
- **Suggestion**: Adjust `URL_RE` to either strip userinfo before domain extraction or reject URLs containing `@` in the authority component.

### [Minor] Finding 5: Unbounded `user_history` Growth in `AntiFloodTracker`
- **Where**: `src/modules/automod/flood.rs:26, 50-59`
- **Why**: `user_history.entry(user_id).or_default()` inserts entries that remain in the `HashMap` indefinitely, even after their `VecDeque` history has been evicted.
- **Suggestion**: Periodically prune empty `VecDeque` entries or remove users whose history has fully expired.

---

## 4. Adversarial Challenge & Stress-Test Results

| Scenario | Attack Input | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| Multi-Invite Bypass | `https://discord.gg/paranoia https://discord.gg/raid-server` | Block with `UnauthorizedInvite { code: "raid-server" }` | Returns `Allowed` | **FAIL (Vulnerability)** |
| Double Slash Invite | `https://discord.gg//raid-server` | Block with `UnauthorizedInvite` | Returns `Allowed` | **FAIL (Bypass)** |
| Minecraft OCR Screenshot | "Claim free Netherite at spawn" | Classified as `Clean` | Classified as `CryptoCasinoScam` (0.95 conf) | **FAIL (False Positive)** |
| Uppercase Image Extension | `scam.PNG` (content_type: None) | Scanned by OCR | Skipped, `is_image == false` | **FAIL (Bypass)** |
| Userinfo Spoofing | `https://paranoia-mc.fr@malicious.com` | Blocked or inspected as `malicious.com` | Allowed as `paranoia-mc.fr` | **FAIL (Edge case)** |
| Invite Code with Query Param | `https://discord.gg/paranoia?utm_source=chat` | Extracted code `paranoia`, Allowed | Extracted code `paranoia`, Allowed | **PASS** |
| Zero-Interval Flood Burst | 4 messages at identical sub-microsecond instant | Purged and 300s timeout | Purged and 300s timeout | **PASS** |
| Sliding-Window Expiration | 3 messages at t=0, 1 message at t=4s (window=3s) | Allowed, expired messages pruned | Allowed, expired messages pruned | **PASS** |

---

## 5. Caveats

- Testing of `HttpVisionOcrEngine` against a live remote OCR service relies on endpoint availability (`VISION_OCR_ENDPOINT`); offline tests rely on `MockVisionOcrEngine`.
- Twilight HTTP client network calls in `src/events/automod.rs` (such as `delete_messages` and `communication_disabled_until`) require bot permissions in a live Discord guild; unit tests mock or isolate logic upstream.

---

## 6. Conclusion

Milestone 2 demonstrates solid architecture, excellent test isolation, and full interface contract conformance with `PROJECT.md`. No integrity violations or facade implementations exist.

However, the implementation contains one **Critical security bypass** (multi-invite bypass allowing foreign Discord invites to bypass auto-moderation), one **Major false positive defect** (innocent Minecraft chat screenshots mentioning "Nether", "together", "console" being penalized as crypto scams), and one **Major evasion defect** (uppercase image extensions evading OCR).

Therefore, the verdict is **REQUEST_CHANGES**.

---

## 7. Verification Method

To independently reproduce and verify:
1. **Compilation Check**:
   ```bash
   cd /home/leo/Code/Paranoia_New/bot-rust && cargo check
   ```
2. **Current Test Suite**:
   ```bash
   cd /home/leo/Code/Paranoia_New/bot-rust && cargo test --test media_and_message_guard_test
   ```
3. **Multi-Invite Bypass Verification**:
   Inspect `src/modules/automod/links.rs:87`. Note the use of `INVITE_RE.captures` (single match) instead of `captures_iter`, and observe that line 122 continues over all `discord.gg` domains.
4. **False Positive Verification**:
   Evaluate `scan_ocr_text("Claim free Netherite at spawn")` in `src/modules/automod/media.rs:141`. "Netherite" matches substring `"eth"`, "claim" matches `"claim"`, resulting in `ScamVerdict::CryptoCasinoScam`.
5. **Extension Case Sensitivity Verification**:
   Inspect `src/events/automod.rs:238`. Note that `ends_with(".png")` does not lower-case `attachment.filename`.
