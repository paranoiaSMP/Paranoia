# Handoff Report: Milestone 1 Adversarial Challenge & Target Extraction Stress-Testing

**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

Adversarial stress-testing of Milestone 1 (`bot-rust/src/modules/automod/command.rs` and `bot-rust/src/modules/automod/toxicity.rs`) was performed via an empirical test suite implemented in `/home/leo/Code/Paranoia_New/bot-rust/tests/challenger_test_message_and_targets_test.rs`.

### A. `/test_message` Slash Command Builder & Ephemeral Diagnostics
- **Command Specification**:
  - `bot-rust/src/modules/automod/command.rs:19-28`:
    ```rust
    pub fn register() -> twilight_model::application::command::Command {
        CommandBuilder::new(
            "test_message",
            "Diagnostiquer un message avec le moteur anti-toxicité (sans sanction)",
            twilight_model::application::command::CommandType::ChatInput,
        )
        .default_member_permissions(Permissions::MODERATE_MEMBERS)
        .option(StringBuilder::new("message", "Contenu du message à tester").required(true))
        .build()
    }
    ```
    - Command Name: `"test_message"`, Type: `ChatInput`, Permission: `Permissions::MODERATE_MEMBERS` (bit `1 << 40`, raw value `1099511627776`).
    - Option: single required option `"message"` of type `String`.
  - `command.rs:88-95`:
    ```rust
    let resp = InteractionResponse {
        kind: InteractionResponseType::ChannelMessageWithSource,
        data: Some(InteractionResponseData {
            embeds: Some(vec![embed]),
            flags: Some(MessageFlags::EPHEMERAL),
            ..Default::default()
        }),
    };
    ```
    - Response type: `ChannelMessageWithSource`, Flags: `MessageFlags::EPHEMERAL` (bit `1 << 6`, raw value `64`).
  - `command.rs:71-86`:
    Embed fields format Verdict, Score, Cible Détectée, Texte Démasqué, and Mots & Motifs Détectés with `COLOR_SUCCESS` (0x2ECC71), `COLOR_GOLD` (0xF1C40F), and `COLOR_ERROR` (0xE74C3C).

- **Observed Defect 1 [Major]: Embed Field Character Limit Overflow (1024 character Discord API limit)**:
  - Location: `command.rs:71-75` and `83`:
    ```rust
    let unmasked_display = if verdict.normalized_text.is_empty() {
        "*(vide)*".to_string()
    } else {
        format!("```\n{}\n```", verdict.normalized_text)
    };
    ...
    .field(EmbedFieldBuilder::new("Texte Démasqué", unmasked_display))
    ```
  - Direct Observation: Discord API strictly rejects embed field values longer than 1024 characters with HTTP `400 Bad Request` (`Invalid Form Body: In embeds.0.fields.3.value: Must be 1024 or fewer in length`). When a moderator tests a message of 1400 characters (e.g. pasted multi-line chat logs), `unmasked_display` length is >1400 characters without truncation, causing interaction responses to fail.

### B. Target Extraction: Second-Person Pronouns vs Third-Person vs Mob Names vs Mentions
- **Location**: `bot-rust/src/modules/automod/toxicity.rs:83-93`:
  ```rust
  let target = if !mentions.is_empty() || DISCORD_MENTION_RE.is_match(content) || DISCORD_MENTION_RE.is_match(&normalized) {
      TargetKind::ExplicitUserMention
  } else if is_reply {
      TargetKind::ReplyTarget
  } else if SECOND_PERSON_RE.is_match(&normalized) {
      TargetKind::SecondPersonPronoun
  } else if GAME_OBJECT_RE.is_match(&normalized) {
      TargetKind::GameObject
  } else {
      TargetKind::None
  };
  ```

- **Observed Defect 2 [Major]: Hyphenated Question Inversion Stripping (`es-tu` -> `estu`)**:
  - In `toxicity.rs:40`: `SECOND_PERSON_RE` includes `"es-tu"`.
  - In `leetspeak.rs:16-17` & `169-178`: `strip_interstitial_punctuation` matches `([a-z0-9])[\.\-_*\/\\|\+~]+([a-z0-9])` and strips the hyphen between `s` and `t`, transforming `"es-tu idiot ?"` into `"estu idiot ?"`.
  - Classification Output: `classify_toxicity("es-tu idiot ?", &[])` evaluates `target` to `TargetKind::None` (because `estu` is not in `SECOND_PERSON_RE`), resulting in `ToxicityCategory::GamingFrustration` (`is_toxic: false`).

- **Observed Defect 3 [Major]: Regex Quantifier Bug in `bitches?` Evasion**:
  - Location: `toxicity.rs:55`:
    ```rust
    static SEVERE_INSULTS_RE: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r"(?i)\b(...|bitches?|...)\b").expect(...)
    });
    ```
  - Direct Observation: The regex token `bitches?` has `?` applied strictly to `s`. It matches `bitche` and `bitches`, but fails to match the singular English insult `bitch`!
  - Classification Output:
    - `classify_toxicity("she is with bitches", &[])` -> `Harassment` (`is_toxic: true`, score 0.85).
    - `classify_toxicity("she is a bitch", &[])` -> `Clean` (`is_toxic: false`, score 0.0).

- **Observed Defect 4 [Major]: Target Discarded on Clean Messages**:
  - Location: `toxicity.rs:235-243`:
    ```rust
    ToxicityVerdict {
        category: ToxicityCategory::Clean,
        is_toxic: false,
        score: 0.0,
        target: TargetKind::None, // Discards computed target from lines 83-93
        normalized_text: normalized,
        detected_words: Vec::new(),
    }
    ```
  - Direct Observation: For any non-toxic message, the detected target is discarded and replaced with `TargetKind::None`.
  - When a moderator runs `/test_message message: "<@123456789> salut"` or `tu viens ?`, `/test_message` displays:
    `Cible Détectée: Aucune` instead of `Mention explicite d'utilisateur` or `Deuxième personne`.

- **Observed Defect 5 [Minor]: Vocabulary Gaps (`chiant`/`chiante` and `nique`)**:
  - In French gaming servers, `chiant` / `chiante` is the most common frustration swear. It is missing from `FRUSTRATION_SWEARS_RE` and `MILD_INSULTS_RE` in `toxicity.rs`. `"ce mob est chiant"` returns `Clean` with target `None`.
  - In `toxicity.rs:40`, `jte` and `je te` are registered as second-person pronouns in `SECOND_PERSON_RE`. However, the insult verb `nique` is missing from `SEVERE_INSULTS_RE` (which only matches `nique ta mere`). `"jte nique"` and `"je te nique"` return `Clean`.

### C. Verification Test Results
Running `cargo test --test challenger_test_message_and_targets_test`:
```
running 29 tests
test automod::leetspeak::tests::test_unmask_zero_width_spaces ... ok
test automod::leetspeak::tests::test_unmask_repetition_collapsing ... ok
test automod::leetspeak::tests::test_unmask_leetspeak_substitutions ... ok
test automod::leetspeak::tests::test_unmask_separated_single_letters ... ok
test automod::leetspeak::tests::test_unmask_homoglyphs_cyrillic_and_greek ... ok
test automod::leetspeak::tests::test_unmask_interstitial_punctuation ... ok
test automod::leetspeak::tests::test_unmask_preserves_mentions_and_urls ... ok
test automod::toxicity::tests::test_severe_toxicity_slurs_and_threats ... ok
test automod::toxicity::tests::test_unmasked_bypass_detection ... ok
test automod::toxicity::tests::test_harassment_with_pronoun ... ok
test automod::toxicity::tests::test_harassment_with_explicit_mention ... ok
test test_test_message_command_builder_properties ... ok
test test_second_person_hyphenated_pronoun_evasion_finding ... ok
test automod::toxicity::tests::test_friendly_banter ... ok
test automod::toxicity::tests::test_clean_message ... ok
test test_test_message_empty_and_whitespace_diagnostics ... ok
test test_test_message_embed_field_character_overflow_finding ... ok
test test_adversarial_pronoun_and_mob_leetspeak_unmasking_combinations ... ok
test automod::toxicity::tests::test_gaming_frustration ... ok
test test_third_person_pronouns_vs_second_person_divergence ... ok
test test_second_person_word_boundary_isolation_no_false_positives ... ok
test test_clean_messages_discard_detected_target_finding ... ok
test test_jte_nique_vocabulary_gap_finding ... ok
test test_chiant_missing_from_swears_finding ... ok
test test_singular_bitch_regex_evasion_finding ... ok
test test_second_person_pronouns_matrix ... ok
test test_test_message_ephemeral_flags_and_embed_diagnostics_formatting ... ok
test test_target_extraction_priority_and_hierarchy ... ok
test test_mob_names_and_game_objects_matrix ... ok

test result: ok. 29 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.03s
```

---

## 2. Logic Chain

1. **Premise 1**: The `/test_message` command is intended for moderators to diagnose arbitrary messages in production.
2. **Step 1 -> Defect 1**: Because Discord API limits embed field values to 1024 characters, unconstrained injection of `verdict.normalized_text` into an embed field in `command.rs:83` causes Discord HTTP 400 errors whenever inputs exceed 1020 characters. This breaks the diagnostics tool for long messages.
3. **Premise 2**: Contextual target extraction must accurately disambiguate between second-person harassment, third-person references, mob/game objects, and user mentions.
4. **Step 2 -> Defect 2**: The unmasking pipeline strips punctuation before classification. Stripping the hyphen in `"es-tu"` converts it to `"estu"`, breaking the second-person regex and causing direct questions (`es-tu idiot ?`) to be demoted to `GamingFrustration` (false negative).
5. **Step 3 -> Defect 3**: A regex syntax bug `bitches?` in `SEVERE_INSULTS_RE` fails to match the singular noun `bitch`, allowing blatant severe insults like `"she is a bitch"` to pass as `Clean` with a score of 0.00.
6. **Step 4 -> Defect 4**: In `toxicity.rs:239`, discarding `target` when a message is clean violates the diagnostic contract of `/test_message`, displaying `Cible Détectée: Aucune` even when a user was mentioned or targeted.
7. **Conclusion**: While the core architecture, permissions, and basic happy paths are sound, these functional defects and bypass vulnerabilities require code remediation before Milestone 1 can be certified production-grade.

---

## 3. Caveats

- Tests were run using the local test suite and Twilight model definitions in `/home/leo/Code/Paranoia_New/bot-rust`.
- The environment variable isolation failure in `tests/adversarial_stress_test.rs` is pre-existing and tracked under Milestone 5.
- The 29 stress tests in `challenger_test_message_and_targets_test.rs` specifically test and empirically confirm all 5 documented findings.

---

## 4. Conclusion

Milestone 1 implements the required structure, commands, and interfaces, but contains 4 major/critical defects and 1 minor gap:
1. `command.rs`: Missing truncation on `unmasked_display` exceeding 1024 Discord embed field characters.
2. `toxicity.rs`: Inverted hyphenated question `es-tu` stripped by punctuation pipeline, evading second-person target classification.
3. `toxicity.rs`: Regex quantifier bug in `bitches?` allowing singular `bitch` to evade classification.
4. `toxicity.rs`: Clean messages discard detected `target` and return `TargetKind::None`.
5. `toxicity.rs`: Missing common gamer terms (`chiant`, `chiante`) and standalone verb (`nique`).

Verdict: **REQUEST_CHANGES**.

Recommended Fixes for Worker:
1. In `src/modules/automod/command.rs`: Truncate `unmasked_display` if `len() > 1020` (e.g. `format!("```\n{}...```", &verdict.normalized_text[..1000])`).
2. In `src/modules/automod/toxicity.rs`:
   - Add `estu` to `SECOND_PERSON_RE` (or preserve `es-tu`).
   - Fix `bitches?` in `SEVERE_INSULTS_RE` to `bitch(?:es)?` or `bitch|bitches`.
   - Preserve computed `target` on line 239 (`target,` instead of `target: TargetKind::None,`).
   - Add `chiant|chiante|chiants|chiantes` to `FRUSTRATION_SWEARS_RE`.
   - Add `nique|niquent` to `SEVERE_INSULTS_RE`.

---

## 5. Verification Method

To verify these findings:
1. Navigate to `/home/leo/Code/Paranoia_New/bot-rust`.
2. Run the empirical stress test suite:
   ```bash
   cargo test --test challenger_test_message_and_targets_test
   ```
   *Expected Output*: 29 passed, 0 failed.
3. Inspect `tests/challenger_test_message_and_targets_test.rs` tests:
   - `test_test_message_embed_field_character_overflow_finding`
   - `test_singular_bitch_regex_evasion_finding`
   - `test_second_person_hyphenated_pronoun_evasion_finding`
   - `test_clean_messages_discard_detected_target_finding`
   - `test_jte_nique_vocabulary_gap_finding`
