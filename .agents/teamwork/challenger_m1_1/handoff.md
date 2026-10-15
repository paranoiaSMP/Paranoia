# Handoff Report: Milestone 1 Adversarial Challenge & Stress-Testing

**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

Adversarial stress-testing of Milestone 1 (`bot-rust/src/modules/automod/`) was executed via an empirical test suite implemented in `/home/leo/Code/Paranoia_New/bot-rust/tests/adversarial_toxicity_stress_test.rs`.

### A. Repetition Collapsing Flaw in `leetspeak.rs`
- **Location**: `/home/leo/Code/Paranoia_New/bot-rust/src/modules/automod/leetspeak.rs:151-155`
```rust
151: 'c' | 'd' | 'f' | 'l' | 'm' | 'n' | 'p' | 'r' | 's' | 't' => {
152:     result.push(current);
153:     result.push(current);
154: }
```
- **Observed Behavior**:
  When collapsing any consonant in this set with count >= 3, `collapse_repetitions` unconditionally forces the character to repeat **twice**. For insults that contain only a single occurrence of that consonant in standard French or English (`pute`, `batard`, `salope`, `fdp`, `tg`, `connard` [for 'r']), the output becomes misspelled:
  - `unmask_leetspeak("t'es une puttttte")` -> `"t'es une putte"`
  - `unmask_leetspeak("sale baaatttard")` -> `"sale battard"`
  - `unmask_leetspeak("grosse salllllope")` -> `"grosse sallope"`
  - `unmask_leetspeak("t'es un fffffddddpppp")` -> `"t'es un ffddpp"`
  - `unmask_leetspeak("tttggg")` -> `"ttg"`
  - `unmask_leetspeak("t'es un connarrrrd")` -> `"t'es un connarrd"`
- **Toxicity Classification**:
  In `toxicity.rs:55`, `SEVERE_INSULTS_RE` requires `\b(fdp|tg|connards?|salopes?|putes?|batards?)\b`. None of the doubled forms match.
  - `classify_toxicity("t'es une puttttte", &[])` -> `ToxicityVerdict { category: Clean, is_toxic: false, score: 0.0 }`
  - `classify_toxicity("sale baaatttard", &[])` -> `ToxicityVerdict { category: Clean, is_toxic: false, score: 0.0 }`
  - `classify_toxicity("grosse salllllope", &[])` -> `ToxicityVerdict { category: Clean, is_toxic: false, score: 0.0 }`
  - `classify_toxicity("t'es un fffffddddpppp", &[])` -> `ToxicityVerdict { category: Clean, is_toxic: false, score: 0.0 }`
  - `classify_toxicity("tttggg", &[])` -> `ToxicityVerdict { category: Clean, is_toxic: false, score: 0.0 }`
  - `classify_toxicity("t'es un connarrrrd", &[])` -> `ToxicityVerdict { category: Clean, is_toxic: false, score: 0.0 }`

### B. Interstitial Punctuation Gaps in `leetspeak.rs`
- **Location**: `/home/leo/Code/Paranoia_New/bot-rust/src/modules/automod/leetspeak.rs:15-17` and `270-282`
```rust
15: static WORD_SEPARATORS_RE: LazyLock<Regex> = LazyLock::new(|| {
16:     Regex::new(r"([a-z0-9])[\.\-_*\/\\|\+~]+([a-z0-9])").expect("Valid regex for word separator")
17: });
```
- **Observed Behavior**:
  1. `WORD_SEPARATORS_RE` only matches `[\.\-_*\/\\|\+~]`. It completely ignores commas (`,`), colons (`:`), semicolons (`;`), quotes (`'`, `"`), and brackets (`(`, `)`, `[`, `]`, `{`, `}`):
     - `unmask_leetspeak("t'es un c,o,n,n,a,r,d")` -> `"t'es un c,o,n,n,a,r,d"`
     - `classify_toxicity("t'es un c,o,n,n,a,r,d", &[])` -> `Clean` (is_toxic: false, score 0.0)
     - `unmask_leetspeak("t'es un c:o:n:n:a:r:d")` -> `"t'es un c:o:n:n:a:r:d"`
     - `classify_toxicity("t'es un c:o:n:n:a:r:d", &[])` -> `Clean` (is_toxic: false, score 0.0)
  2. `strip_interstitial_punctuation` is called per token on `pass3.split_whitespace()`. If separators have whitespace around them (`f . d . p`, `t . g`, `f - d - p`), each token is a single character or punctuation mark. `WORD_SEPARATORS_RE` never matches, and `merge_isolated_single_letters` only merges alphabetic characters:
     - `unmask_leetspeak("t'es un f . d . p")` -> `"t'es un f . d . p"`
     - `classify_toxicity("t'es un f . d . p", &[])` -> `Clean` (is_toxic: false, score 0.0)

### C. False Positives on Gamer Praise with Frustration Swears in `toxicity.rs`
- **Location**: `/home/leo/Code/Paranoia_New/bot-rust/src/modules/automod/toxicity.rs:193-222`
```rust
193: for mat in FRUSTRATION_SWEARS_RE.find_iter(&normalized) {
194:     detected_words.push(mat.as_str().to_string());
195: }
...
212: TargetKind::SecondPersonPronoun => {
213:     ToxicityVerdict {
214:         category: ToxicityCategory::Harassment,
215:         is_toxic: true,
216:         score: 0.70,
...
```
- **Observed Behavior**:
  Unlike `MILD_INSULTS_RE` (line 148), which checks `if has_banter_marker { return FriendlyBanter }`, `FRUSTRATION_SWEARS_RE` contains **no check** for banter markers (`BANTER_RE` or `BANTER_EMOJIS`).
  - `classify_toxicity("putain t'es trop fort mdr", &[])` -> `ToxicityVerdict { category: Harassment, is_toxic: true, score: 0.70, target: SecondPersonPronoun, detected_words: ["putain"] }`
  - `classify_toxicity("merde t'es rapide gg", &[])` -> `ToxicityVerdict { category: Harassment, is_toxic: true, score: 0.70, target: SecondPersonPronoun, detected_words: ["merde"] }`
  Both are genuine praise in French gaming communities, yet bot-rust marks them as toxic harassment and triggers message deletion and warnings in `src/events/automod.rs`.
  - `classify_toxicity("fais chier ce squelette tu trouves pas ?", &[])` -> `ToxicityVerdict { category: Harassment, is_toxic: true, score: 0.70 }`
  Because line 87 checks `SECOND_PERSON_RE` before line 89 checks `GAME_OBJECT_RE`, the presence of "tu" overrides the mob context "squelette", misclassifying game frustration as harassment.

### D. Unicode Mathematical Alphanumerics, Homoglyphs & BiDi Override Bypasses
- **Location**: `/home/leo/Code/Paranoia_New/bot-rust/src/modules/automod/leetspeak.rs:31-114`
- **Observed Behavior**:
  - Mathematical Bold (`𝐜𝐨𝐧𝐧𝐚𝐫𝐝`, U+1D41C..): unmasked as `"𝐜𝐨𝐧𝐧𝐚𝐫𝐝"` -> `Clean` (score 0.0).
  - Mathematical Monospace (`𝚌𝚘𝚗𝚗𝚊𝚛𝚍`, U+1D68C..): unmasked as `"𝚌𝚘𝚗𝚗𝚊𝚛𝚍"` -> `Clean` (score 0.0).
  - Circled letters (`ⓒⓞⓝⓝⓐⓡⓓ`, U+24D0..): unmasked as `"ⓒⓞⓝⓝⓐⓡⓓ"` -> `Clean` (score 0.0).
  - Cyrillic Small En (`coннard`, U+043D): mapped to `'h'` (line 52: `'н' | 'Н' => Some('h')`), outputting `"cohhard"` -> `Clean` (score 0.0).
  - BiDi RLO Override (`c\u{202E}onnard`, U+202E): character preserved -> `Clean` (score 0.0).

### E. Discord Role Mention Snowflake ID Corruption
- **Location**: `/home/leo/Code/Paranoia_New/bot-rust/src/modules/automod/leetspeak.rs:19-21`
```rust
static DISCORD_MENTION_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"<@!?[0-9]+>").expect("Valid regex for mentions")
});
```
- **Observed Behavior**:
  Role mentions (`<@&123456789012345678>`) do not match `DISCORD_MENTION_RE` (missing `&`).
  - `unmask_leetspeak("<@&123456789012345678>")` -> `'<a&izeas6tbgoizeas6tb>'`.
  The Snowflake ID digits and `@` sign are corrupted by the leetspeak substitution tables.

---

## 2. Logic Chain

1. **Repetition Doubling Logic**:
   - `collapse_repetitions` attempts to preserve French double consonants (e.g. `nn` in `connard`) by forcing any repetition of `count >= 3` for letters `c,d,f,l,m,n,p,r,s,t` to collapse to exactly 2 letters.
   - However, the vast majority of toxic words in the dictionary contain single consonants: `pute` (1 't'), `batard` (1 't'), `salope` (1 'l'), `fdp` (1 'f', 1 'd', 1 'p'), `tg` (1 't', 1 'g').
   - When an attacker stretches any of these consonants (e.g. `puttttte`), `unmask_leetspeak` outputs `putte`, which does not match regex `\bputes?\b`. The attack completely succeeds, evading detection.

2. **Incomplete Punctuation Stripping**:
   - `WORD_SEPARATORS_RE` uses a restricted character class `[\.\-_*\/\\|\+~]`. Characters frequently used by toxic users to bypass word filters (`,`, `:`, `;`, `'`, `"` `(`, `)`, `[`, `]`) are untouched.
   - Running punctuation stripping only *inside* whitespace-delimited tokens means that any spaced separator (`f . d . p`) leaves individual tokens isolated, preventing unmasking.

3. **Inversion of Intent in Contextual Toxicity**:
   - R1 explicitly requires distinguishing "targeted attacks/harassment directed at players from generic gaming frustration or friendly banter".
   - `toxicity.rs` implements banter mitigation for `MILD_INSULTS_RE`, but completely omitted it in `FRUSTRATION_SWEARS_RE`. Swears like `putain` or `merde` combined with `t'es` and `mdr`/`gg` are ubiquitous expressions of praise in French gaming ("putain t'es trop fort mdr"). Flagging them as toxic harassment directly causes unacceptable false positives on active players.
   - Ordering `SECOND_PERSON_RE` before `GAME_OBJECT_RE` causes questions about mobs ("fais chier ce squelette tu trouves pas ?") to be treated as targeted attacks on the interlocutor.

4. **Unicode & Mention Handling**:
   - Unicode mathematical alphanumeric blocks and circled letters are widely known evasion techniques on Discord and must be normalized to standard ASCII.
   - Cyrillic `н` (En) is visually identical to Latin `H` in uppercase and resembles `n`/`h` in lowercase, but mapping it to `'h'` breaks unmasking of words like `connard` (`coннard` -> `cohhard`).
   - Role mentions (`<@&ID>`) must be protected by the regex alongside user mentions (`<@ID>`, `<@!ID>`).

---

## 3. Caveats

- The base functionality implemented by worker_m1 (pass-through of clean messages, detection of unmasked standard insults like "c0nn4rd" and "s4l0p3", and slash command `/test_message`) functions properly and with high performance (<0.05s).
- The 50KB payload stress test confirmed that the engine is resistant to catastrophic backtracking (ReDoS) and completes in under 5ms.
- The 3 exact test strings requested in the dispatch (`"ce squelette m'a saoulé"`, `"lol t'es un fou mdr"`, `"gg t'es un monstre"`) pass as `Clean` or `FriendlyBanter`. The false positive defect occurs specifically when frustration swears (`putain`, `merde`, `bordel`) co-occur with second-person pronouns and banter markers (`mdr`, `gg`).

---

## 4. Conclusion

**Verdict**: **REQUEST_CHANGES**

Milestone 1 fails critical security and usability acceptance criteria:
1. **Critical Filter Bypasses**: Trivial evasion via consonant elongation (`puttttte`, `baaatttard`, `salllllope`, `fffffddddpppp`, `tttggg`, `connarrrrd`), common punctuation separators (`,`, `:`, `;`, `( )`), and spaced punctuation (`f . d . p`).
2. **False Positives**: Gamer praise (`"putain t'es trop fort mdr"`, `"merde t'es rapide gg"`) and mob frustration with pronouns (`"fais chier ce squelette tu trouves pas ?"`) are falsely flagged as harassment.
3. **Unicode Gaps**: Mathematical bold/monospace, circled letters, and BiDi override characters bypass unmasking.
4. **Snowflake ID Mangling**: Discord role mentions `<@&ID>` are corrupted into `<a&...>`.

### Required Fixes for Worker:
1. **Repetition Collapsing**:
   - For consonants, collapsing should either reduce to 1 character by default, or the regex dictionary in `toxicity.rs` must permit optional double consonants (e.g. `pu(?:t|tt)es?`, `ba(?:t|tt)ards?`, `sa(?:l|ll)opes?`), or `unmask_leetspeak` should check dictionary matching with both 1 and 2 consonants.
2. **Interstitial Punctuation**:
   - Expand `WORD_SEPARATORS_RE` to include all non-alphanumeric punctuation: `[\.\-_*\/\\|\+~,:;'"\(\)\[\]\{\}#%^&!=?]`.
   - Strip punctuation tokens before merging isolated single letters so that spaced punctuation (`f . d . p`, `t . g`) unmasks to `fdp` and `tg`.
3. **Contextual Classifier Banter Handling**:
   - In `toxicity.rs`, apply `has_banter_marker` demotion to `FRUSTRATION_SWEARS_RE` so that `"putain t'es trop fort mdr"` and `"merde t'es rapide gg"` are classified as `FriendlyBanter` (`is_toxic: false`).
   - If `GAME_OBJECT_RE` matches, prioritize `TargetKind::GameObject` over `TargetKind::SecondPersonPronoun` unless explicit harassment words are present.
4. **Unicode Mapping**:
   - Add mathematical alphanumeric ranges (`\u{1D400}..=\u{1D7FF}`) and circled characters (`\u{24D0}..=\u{24E9}`) to `normalize_unicode_char`.
   - Strip BiDi controls (`\u{202A}..=\u{202E}`).
   - Treat Cyrillic `н` as either `n` or `h` depending on position or normalize to `n`.
5. **Discord Mention Preservation**:
   - Update `DISCORD_MENTION_RE` to `r"<@&?[0-9]+>"` or `r"<@(?:!|&)?([0-9]+)>"`.

---

## 5. Verification Method

To independently verify and reproduce all findings:

1. Navigate to `/home/leo/Code/Paranoia_New/bot-rust`.
2. Run the newly added empirical adversarial stress test suite:
   ```bash
   cargo test --test adversarial_toxicity_stress_test -- --nocapture
   ```
3. Observe all 22 passing tests in `adversarial_toxicity_stress_test.rs`, confirming the exact reproducible failure modes documented:
   - `test_vuln_repetition_collapsing_consonant_doubling_bypasses`
   - `test_vuln_interstitial_punctuation_bypasses`
   - `test_vuln_gamer_praise_with_frustration_swears_falsely_flagged`
   - `test_vuln_unicode_homoglyphs_and_bidi_bypasses`
   - `test_vuln_discord_role_mention_corruption`
4. Confirm existing test suites remain operational:
   ```bash
   cargo test --test anti_toxicity_test
   cargo test --bin bot-rust
   cargo check
   ```
