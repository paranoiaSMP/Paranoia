# Review & Adversarial Challenge Report: Milestone 1 (R1 Contextual Anti-Toxicity & Anti-Bypass)

## Review Summary

**Verdict**: **REQUEST_CHANGES**

Milestone 1 implements the required module architecture, slash command `/test_message`, event hooks, and basic leetspeak unmasking. The implementation contains no integrity violations (no dummy facades, no hardcoded cheating, no fake verification). However, rigorous adversarial stress-testing identified critical algorithmic bypasses and false positive classifications that violate Requirement R1 of `PROJECT.md` and `ORIGINAL_REQUEST.md`:
1. **Critical Bypass**: Consonant repetition collapsing unconditionally forces repeated consonants into double characters (e.g., `puttttte` -> `putte`, `sale baaatttard` -> `sale battard`), completely evading French toxicity filters.
2. **Major Functional Defect**: Frustration swears combined with second-person pronouns fail to check banter markers, causing legitimate player compliments and banter (e.g., `putain t'es trop fort mdr`, `merde t'es rapide gg`) to be classified as Harassment (`is_toxic: true`) and deleted.
3. **Major Syntax Defect**: Discord role mentions (`<@&ID>`) are not matched by `DISCORD_MENTION_RE`, resulting in `@` and numeric IDs being corrupted by leetspeak substitutions (`<a&...`).
4. **Minor Bypass**: Punctuation separated by spaces (e.g., `f . d . p`, `t - g`) and characters like commas or colons bypass interstitial stripping.

---

## Findings

### [Critical] Finding 1: Consonant Repetition Collapse Creates Filter Bypass
- **What**: In `collapse_repetitions`, repeating consonants in `['c', 'd', 'f', 'l', 'm', 'n', 'p', 'r', 's', 't']` 3 or more times unconditionally collapses them to **2 characters** instead of 1 character.
- **Where**: `bot-rust/src/modules/automod/leetspeak.rs:151-154`
- **Why**: In French, toxic words typically use single consonants (`pute`, `batard`, `salope`, `tg`, `fdp`, and single `r` in `connard`). When an evasive user types `t'es une puttttte`, it collapses to `t'es une putte`. Since the regex in `toxicity.rs:55` is `\b(putes?)\b`, `putte` fails to match and the toxic message is classified as `Clean` (`is_toxic: false`). Similarly, `sale baaatttard` -> `sale battard`, `grosse salllllope` -> `grosse sallope`, `t'es un connarrrrd` -> `t'es un connarrd`, and `fffffddddpppp` -> `ffddpp`, all bypassing toxicity detection.
- **Suggestion**: Collapse all repeated characters (both vowels and consonants) with `count >= 3` to a single character. Note that `connards?|conards?` is already present in `SEVERE_INSULTS_RE`, so collapsing `coooonnnnard` to `conard` still matches `conards?`. Alternatively, make toxic regexes resilient to double consonants (e.g. `p+u+t+t?e+s?`).

### [Major] Finding 2: False Positive on Gamer Praise / Banter with Frustration Swears
- **What**: When evaluating `FRUSTRATION_SWEARS_RE`, `classify_toxicity_with_context` does NOT inspect `has_banter_marker`.
- **Where**: `bot-rust/src/modules/automod/toxicity.rs:193-233`
- **Why**: Common gamer expressions such as `putain t'es trop fort mdr` ("damn you're so good lol") or `merde t'es rapide gg` ("shit you're fast gg") contain both a frustration swear (`putain`, `merde`) and a second-person pronoun (`t'es`). Because `has_banter_marker` is ignored in this branch, the engine classifies these positive messages as `ToxicityCategory::Harassment` with `is_toxic: true` and score `0.70`, triggering message deletion and automated warnings in `src/events/automod.rs:29`.
- **Suggestion**: Before classifying frustration swears directed at second-person pronouns as Harassment, check `if has_banter_marker`. If banter markers (`mdr`, `lol`, `gg`, laughing emojis) are present, classify as `ToxicityCategory::FriendlyBanter` (`is_toxic: false`, score 0.20).

### [Major] Finding 3: Second-Person Pronoun Precedence Overrides Mob / Game Object Frustration
- **What**: In `classify_toxicity_with_context`, `SECOND_PERSON_RE` is evaluated before `GAME_OBJECT_RE`.
- **Where**: `bot-rust/src/modules/automod/toxicity.rs:87-93`
- **Why**: Messages expressing frustration about mobs or game mechanics that also contain conversational second-person pronouns (e.g. `fais chier ce squelette tu trouves pas ?`) match `SECOND_PERSON_RE` first, assigning `TargetKind::SecondPersonPronoun`. When paired with `fais chier`, this results in `Harassment` (`is_toxic: true`) instead of `GamingFrustration` (`is_toxic: false`).
- **Suggestion**: When both `GAME_OBJECT_RE` and `SECOND_PERSON_RE` match and the detected word is in `FRUSTRATION_SWEARS_RE`, prefer `TargetKind::GameObject` (or verify that the insult is not targeting the player).

### [Major] Finding 4: Discord Role Mentions Mangled by Leetspeak Replacement
- **What**: `DISCORD_MENTION_RE` only matches user mentions `r"<@!?[0-9]+>"`, excluding role mentions `<@&ID>`.
- **Where**: `bot-rust/src/modules/automod/leetspeak.rs:19-21`
- **Why**: When a message contains a role mention like `<@&123456789012345678>`, it is not shielded by placeholders. Pass 3 replaces `@` with `a` and numbers with leetspeak equivalents, corrupting the mention into `<a&...`.
- **Suggestion**: Update regex to `r"<@[!&]?[0-9]+>"` in both `leetspeak.rs` and `toxicity.rs`.

### [Minor] Finding 5: Spaced Separators and Extended Punctuation Bypasses
- **What**: `WORD_SEPARATORS_RE` (`r"([a-z0-9])[\.\-_*\/\\|\+~]+([a-z0-9])"`) requires contiguous non-space punctuation, and does not include commas, colons, or parentheses.
- **Where**: `bot-rust/src/modules/automod/leetspeak.rs:15-17`
- **Why**: Messages such as `f . d . p`, `t - g`, or `c,o,n,n,a,r,d` fail to merge, allowing easy filter evasions.
- **Suggestion**: Pre-clean spaces around single punctuation marks between isolated letters or include commas, colons, and brackets in punctuation unmasking.

---

## Verified Claims

| Claim | Source | Verification Method | Status |
|---|---|---|---|
| `cargo check` compiles with 0 errors | worker handoff | `cargo check` in `bot-rust` | PASS |
| `cargo test --test anti_toxicity_test` passes 27/27 | worker handoff | `cargo test --test anti_toxicity_test` | PASS |
| `cargo test --bin bot-rust` passes 19/19 | worker handoff | `cargo test --bin bot-rust` | PASS |
| `/test_message` command defined with `Permissions::MODERATE_MEMBERS` | worker handoff | Inspected `command.rs:25` & `anti_toxicity_test.rs:194` | PASS |
| `/test_message` returns ephemeral diagnostics without sanctions | worker handoff | Inspected `command.rs:92` & Twilight interaction handler | PASS |
| Leetspeak unmasking handles single substitutions (`4`, `0`, `3`, `7`, `1`, `@`, `$`) | worker handoff | Inspected `leetspeak.rs:116-128` & verified via unit tests | PASS |
| Homoglyph normalization handles Cyrillic, Greek, fullwidth, diacritics | worker handoff | Inspected `leetspeak.rs:31-114` & verified via unit tests | PASS |
| Antislop hygiene conforms to project conventions | worker handoff | Inspected codebase; no `TODO`, no stubs, clean error handling | PASS |
| Repeated character collapsing handles all bypass patterns | worker handoff | Adversarial stress testing (`adversarial_toxicity_stress_test.rs`) | **FAIL** (Consonant doubling bypasses filters) |
| Banter distinction prevents false positives on friendly chat | worker handoff | Adversarial stress testing (`adversarial_toxicity_stress_test.rs`) | **FAIL** (`putain t'es trop fort mdr` flagged as Harassment) |

---

## Adversarial Challenge Report

### Summary
- **Overall Risk Assessment**: **HIGH**
- While basic substitutions and test-suite inputs pass, the pipeline has significant blind spots:
  1. Attackers can trivially bypass the filter by repeating consonants (`puttttte`, `baaatttard`, `salllllope`).
  2. Legitimate players will experience false deletions when complimenting teammates (`putain t'es trop fort mdr`).
  3. Role mentions will be mangled by leet substitution.

### Stress Test Results

| Scenario | Input | Expected | Actual | Result |
|---|---|---|---|---|
| Consonant repetition bypass | `t'es une puttttte` | `Harassment` (is_toxic=true) | `Clean` (is_toxic=false) | **FAIL** (Bypass) |
| Consonant repetition bypass | `sale baaatttard` | `Harassment` (is_toxic=true) | `Clean` (is_toxic=false) | **FAIL** (Bypass) |
| Consonant repetition bypass | `grosse salllllope` | `Harassment` (is_toxic=true) | `Clean` (is_toxic=false) | **FAIL** (Bypass) |
| Repetition acronym bypass | `t'es un fffffddddpppp` | `Harassment` (is_toxic=true) | `Clean` (is_toxic=false) | **FAIL** (Bypass) |
| Gamer praise with swear | `putain t'es trop fort mdr` | `FriendlyBanter` (is_toxic=false) | `Harassment` (is_toxic=true) | **FAIL** (False Positive) |
| Gamer praise with swear | `merde t'es rapide gg` | `FriendlyBanter` (is_toxic=false) | `Harassment` (is_toxic=true) | **FAIL** (False Positive) |
| Game object with pronoun | `fais chier ce squelette tu trouves pas ?` | `GamingFrustration` (is_toxic=false) | `Harassment` (is_toxic=true) | **FAIL** (False Positive) |
| Role mention preservation | `<@&123456789012345678>` | `<@&123456789012345678>` | `<a&123456789012345678>` | **FAIL** (Corruption) |
| Spaced punctuation separator | `t'es un f . d . p` | `Harassment` (is_toxic=true) | `Clean` (is_toxic=false) | **FAIL** (Bypass) |
| Performance on 50KB payload | 50,000 characters | < 1000ms | 12ms unmask + 2ms classify | **PASS** |

---

## 5-Component Handoff Section

### 1. Observation
- Target: `/home/leo/Code/Paranoia_New/bot-rust`
- `cargo check`: Finished in 0.11s with 0 errors, 0 warnings.
- `cargo test --test anti_toxicity_test`: 27 passed, 0 failed.
- `cargo test --bin bot-rust`: 19 passed, 0 failed.
- In `src/modules/automod/leetspeak.rs`:
  - Lines 151-154: Consonants `['c', 'd', 'f', 'l', 'm', 'n', 'p', 'r', 's', 't']` with `count >= 3` are pushed twice (`result.push(current); result.push(current);`).
  - Lines 19-21: `DISCORD_MENTION_RE = Regex::new(r"<@!?[0-9]+>")`.
- In `src/modules/automod/toxicity.rs`:
  - Lines 87-93: `SECOND_PERSON_RE.is_match(&normalized)` precedes `GAME_OBJECT_RE.is_match(&normalized)`.
  - Lines 193-233: `FRUSTRATION_SWEARS_RE` evaluation checks `target`, but ignores `has_banter_marker`.
- In `tests/adversarial_toxicity_stress_test.rs`: 22 empirical adversarial tests confirm these bypasses and false positives.

### 2. Logic Chain
1. When input contains 3 or more repeated consonants (e.g. `puttttte`), `collapse_repetitions` produces `putte`.
2. `toxicity.rs:55` defines `SEVERE_INSULTS_RE` with `\b(putes?)\b`. `putte` has two `t`s, failing to match.
3. Therefore, repeating consonants completely bypasses severe insult and harassment detection.
4. When input contains `putain t'es trop fort mdr`, `SECOND_PERSON_RE` matches `t'es` and `BANTER_RE` matches `mdr`.
5. In `toxicity.rs:193-233`, `FRUSTRATION_SWEARS_RE` matches `putain`. Without checking `has_banter_marker`, it returns `ToxicityCategory::Harassment` with `is_toxic: true`.
6. Therefore, legitimate friendly banter and player praise are falsely classified as harassment and deleted by the bot.
7. In `src/modules/automod/leetspeak.rs:19-21`, `DISCORD_MENTION_RE` lacks `&`. Role mentions `<@&ID>` are transformed to `<a&...` by single leetspeak substitution.
8. Therefore, role mentions in messages processed by AutoMod are corrupted.

### 3. Caveats
- The classifier dictionary focuses on French and common English gaming vernacular. Additional languages are out of scope for Milestone 1.
- No integrity violations or cheating were detected. The architecture, command definitions, and modular integration are cleanly structured and maintainable.

### 4. Conclusion
Milestone 1 satisfies architectural requirements, compilation checks, and command interface specifications, but contains critical algorithmic bypasses and false positive classifications. A verdict of **REQUEST_CHANGES** is issued. The worker must resolve Finding 1 (consonant repetition collapse), Finding 2 (banter check on frustration swears), Finding 3 (target precedence), and Finding 4 (role mention regex).

### 5. Verification Method
1. Run adversarial test suite:
   ```bash
   cargo test --test adversarial_toxicity_stress_test
   ```
2. Verify that `puttttte`, `baaatttard`, and `salllllope` are correctly flagged as toxic insults.
3. Verify that `putain t'es trop fort mdr` is classified as `FriendlyBanter` (`is_toxic: false`).
4. Verify that role mentions `<@&123456789012345678>` are preserved without mutation.
