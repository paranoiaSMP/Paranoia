# Handoff Report: Milestone 1 Adversarial Code Review

## 1. Observation

- **Review Target**: Milestone 1 (R1 Anti-Toxicity & Anti-Bypass Engine) in `/home/leo/Code/Paranoia_New/bot-rust`.
- **Files Inspected**:
  - `src/modules/automod/mod.rs` (Lines 1–12)
  - `src/modules/automod/leetspeak.rs` (Lines 1–359)
  - `src/modules/automod/toxicity.rs` (Lines 1–309)
  - `src/modules/automod/command.rs` (Lines 1–103)
  - `src/events/automod.rs` (Lines 1–64)
  - `src/events/mod.rs` (Lines 37–41, 126)
  - `src/modules/mod.rs` (Lines 18, 119–129)
  - `tests/anti_toxicity_test.rs` (Lines 1–204)
- **Tool Invocations & Verification Commands**:
  - `cargo check`:
    ```
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.45s
    ```
    Status: 0 errors, 0 warnings.
  - `cargo test --test anti_toxicity_test`:
    ```
    running 27 tests
    test automod::leetspeak::tests::test_unmask_zero_width_spaces ... ok
    ...
    test result: ok. 27 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.02s
    ```
  - `cargo test --bin bot-rust`:
    ```
    running 19 tests
    ...
    test result: ok. 19 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.02s
    ```
- **Integrity Assessment**:
  No integrity violations detected. Source code contains no hardcoded test outputs or facade mocks; leetspeak normalization and toxicity scoring contain genuine computational logic matching all stated unit tests.
- **Interface Conformance (`PROJECT.md § Interface Contracts`)**:
  - `TargetKind` (`None`, `GameObject`, `SecondPersonPronoun`, `ExplicitUserMention`, `ReplyTarget`): Conforms.
  - `ToxicityCategory` (`Clean`, `GamingFrustration`, `FriendlyBanter`, `Harassment`, `SevereToxicity`): Conforms.
  - `ToxicityVerdict` (`category`, `is_toxic`, `score`, `target`, `normalized_text`, `detected_words`): Conforms.
  - Functions `unmask_leetspeak(&str) -> String` and `classify_toxicity(&str, &[Id<UserMarker>]) -> ToxicityVerdict`: Conforms.

---

## 2. Logic Chain

Despite tests passing on happy paths, adversarial edge-case stress testing revealed three critical and major defects in the normalization pipeline:

### Finding 1 [Critical]: Mention Placeholder Destruction and Leaked Internal Identifiers on Adjacent Punctuation
- **Observation**:
  In `src/modules/automod/leetspeak.rs`:
  - Lines 244–248 replace mentions with keys like `"__discordmentiona__"`.
  - Lines 274–277:
    ```rust
    if token.starts_with("__") && token.ends_with("__") {
        pass4_tokens.push(token.to_string());
        continue;
    }
    ```
  - Lines 279–282:
    ```rust
    let stripped_token = strip_interstitial_punctuation(token);
    let trimmed_token = stripped_token
        .trim_matches(|c: char| c.is_ascii_punctuation() && c != '<' && c != '>')
        .to_string();
    ```
  - Lines 297–299:
    ```rust
    for (placeholder, original) in placeholders {
        final_text = final_text.replace(&placeholder.to_ascii_lowercase(), &original);
    }
    ```
- **Reasoning**:
  1. When a user message contains standard punctuation immediately adjacent to a mention (e.g. `<@123456789>,`, `<@123456789>:`, `<@123456789>!`, or `(<@123456789>)`), tokenization produces `"__discordmentiona__,"`.
  2. Because `"__discordmentiona__,"` ends with `,`, `token.ends_with("__")` evaluates to `false`.
  3. The token falls through to `trim_matches(|c: char| c.is_ascii_punctuation() && c != '<' && c != '>')`.
  4. In Rust, `'_'.is_ascii_punctuation()` evaluates to `true` (ASCII 0x5F is punctuation).
  5. `trim_matches` strips not only the comma `,`, but also the leading `__` and trailing `__` guard characters, converting `"__discordmentiona__,"` into `"discordmentiona"`.
  6. In the restoration loop, `placeholder` is `"__discordmentiona__"`. Since `"__discordmentiona__"` is nowhere in `final_text`, the replacement fails silently.
  7. The user mention `<@123456789>` is destroyed, and the internal variable `"discordmentiona"` leaks into the output text and `/test_message` embed.
  8. In addition, when `classify_toxicity` is invoked without a pre-parsed `mentions` slice (such as in `/test_message`), `DISCORD_MENTION_RE.is_match(&normalized)` fails to detect the mention because `<@...>` was replaced by `"discordmentiona"`.
- **Reproduction**:
  Input: `"<@123456789>, va te faire foutre"`
  Expected output: `"<@123456789>, va te faire foutre"`
  Actual output: `"discordmentiona va te faire foutre"`

### Finding 2 [Major]: URL Prefix Overlap Bug and Secondary URL Corruption
- **Observation**:
  In `src/modules/automod/leetspeak.rs`:
  - Lines 238–242:
    ```rust
    for (idx, mat) in URL_RE.find_iter(input).enumerate() {
        let key = format!("__discordurl{}__", idx_to_alpha(idx));
        placeholders.push((key.clone(), mat.as_str().to_string()));
        preprocessed = preprocessed.replace(mat.as_str(), &key);
    }
    ```
- **Reasoning**:
  1. Calling `preprocessed.replace(mat.as_str(), &key)` in a loop over `URL_RE.find_iter(input)` executes a global string replacement for every match.
  2. If the message contains two URLs where the first is a prefix of the second (e.g. `"https://example.com https://example.com/test"`), match 0 replaces all occurrences of `"https://example.com"`.
  3. The second URL in `preprocessed` is mutated into `"__discordurla__/test"`.
  4. In match 1, `mat.as_str()` is `"https://example.com/test"`. Because it no longer exists verbatim in `preprocessed`, the second replacement does nothing.
  5. During token processing, `"__discordurla__/test"` ends with `"test"` (not `"__"`).
  6. `strip_interstitial_punctuation` applies `WORD_SEPARATORS_RE` (`([a-z0-9])[\.\-_*\/\\|\+~]+([a-z0-9])`). The substring `a__ /t` (between `discordurla` and `test`) matches the separator pattern and collapses to `at`.
  7. The token becomes `"__discordurlatest"`. The trailing `__` is gone, the second placeholder is never restored, and the second URL is destroyed and replaced by `"__discordurlatest"`.
- **Reproduction**:
  Input: `"https://example.com https://example.com/test"`
  Expected output: `"https://example.com https://example.com/test"`
  Actual output: `"https://example.com __discordurlatest"`

### Finding 3 [Major]: Filter Bypass via `+` and `|` Separators (Phase-Ordering Inversion)
- **Observation**:
  In `src/modules/automod/leetspeak.rs`:
  - Lines 122–123 (`apply_single_leet_char`):
    ```rust
    '1' | '!' | '|' => 'i',
    '7' | '+' => 't',
    ```
  - Line 268 executes `pass3: apply_single_leet_char`.
  - Line 279 executes `pass4: strip_interstitial_punctuation` with:
    `Regex::new(r"([a-z0-9])[\.\-_*\/\\|\+~]+([a-z0-9])")`
- **Reasoning**:
  1. `apply_single_leet_char` (Pass 3) runs *before* `strip_interstitial_punctuation` (Pass 4).
  2. Pass 3 maps `+` to `'t'` and `|` to `'i'`.
  3. When an attacker sends words separated by `+` or `|` (e.g. `"f+d+p"`, `"f|d|p"`, `"s+a+l+o+p+e"`), Pass 3 turns them into `"ftdtp"`, `"fidip"`, and `"statltotptet"`.
  4. When Pass 4 runs, there are no `+` or `|` characters left to strip; they are now ordinary letters.
  5. `classify_toxicity` matches `"ftdtp"` and `"fidip"` against `SEVERE_INSULTS_RE` and `SEVERE_TOXICITY_RE`. It finds no match and classifies the message as `ToxicityCategory::Clean`.
  6. This creates a zero-friction filter bypass using common leetspeak punctuation separators.
- **Reproduction**:
  Input: `"f+d+p"`
  Normalized: `"ftdtp"`
  Classification: `Clean` (is_toxic: false) -> **Filter Bypassed**.

### Finding 4 [Minor]: Allocation Overhead in Gateway Hot Path
- **Observation**:
  `unmask_leetspeak` executes multiple string allocations per message:
  - 3 iterative `find_iter` loops calling `preprocessed.replace(...)` allocating full strings.
  - 6 `MULTI_LEET` string replacements.
  - Repeated `replace_all(...).to_string()` in `strip_interstitial_punctuation`.
  - Multiple `pass4` / `pass5` allocations.
- **Suggestion**:
  Refactor placeholder replacement into a single pass using regex replace closures or byte-offset slices.

---

## 3. Caveats

- Tests in `tests/anti_toxicity_test.rs` currently pass because the test cases did not include mentions with adjacent punctuation (e.g., tested `"<@123456789> connard"`, not `"<@123456789>, connard"`), did not include multiple URLs sharing prefix paths, and only tested `.`, `-`, `_`, `*`, ` ` as separators (not `+` or `|`).
- The existing Twilight command registration and event loop integration in `src/events/mod.rs` and `src/modules/mod.rs` are structurally sound and compile without issues.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

Milestone 1 satisfies interface contracts and passes basic test suites without integrity violations, but contains 1 Critical defect and 2 Major defects:
1. **Critical**: User mentions with adjacent punctuation have their placeholders corrupted into `"discordmentiona"`, destroying the mention and leaking the internal placeholder.
2. **Major**: URLs sharing prefix strings are corrupted and transformed into leaked placeholders like `"__discordurlatest"`.
3. **Major**: Toxic messages separated by `+` or `|` (e.g. `f+d+p`, `f|d|p`) bypass classification completely due to phase-ordering inversion in the normalization pipeline.

### Recommended Fixes for Worker:
1. In `leetspeak.rs`, update `trim_matches` so it does not strip `_` (e.g., `c != '_'`), or use sentinel tokens that are preserved when trimming punctuation.
2. In `leetspeak.rs`, do not call `preprocessed.replace` in a loop; use single-pass replacement via `URL_RE.replace_all` or sort by length descending / replace by byte indices.
3. In `leetspeak.rs`, strip interstitial separators `+` and `|` before converting them to `t` and `i`, or only convert `+`/`|` when they are not acting as word separators.
4. Add regression tests covering:
   - `unmask_leetspeak("<@123456789>, connard")` -> `"<@123456789>, connard"`
   - `unmask_leetspeak("https://example.com https://example.com/test")` -> `https://example.com https://example.com/test`
   - `unmask_leetspeak("f+d+p")` -> `"fdp"`
   - `classify_toxicity("f+d+p", &[])` -> `Harassment` / `is_toxic: true`

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Existing Tests**:
   ```bash
   cd /home/leo/Code/Paranoia_New/bot-rust
   cargo check
   cargo test --test anti_toxicity_test
   ```
2. **Reproduce Finding 1 (Mention Corruption)**:
   Evaluate `unmask_leetspeak("<@123456789>, test")`.
   Observed result: `"discordmentiona test"`.
   Expected result: `"<@123456789>, test"`.
3. **Reproduce Finding 2 (URL Prefix Corruption)**:
   Evaluate `unmask_leetspeak("https://example.com https://example.com/test")`.
   Observed result: `"https://example.com __discordurlatest"`.
   Expected result: `"https://example.com https://example.com/test"`.
4. **Reproduce Finding 3 (Filter Bypass on `+` and `|`)**:
   Evaluate `classify_toxicity("f+d+p", &[])`.
   Observed result: `ToxicityCategory::Clean` (`is_toxic: false`).
   Expected result: `ToxicityCategory::Harassment` (`is_toxic: true`).
