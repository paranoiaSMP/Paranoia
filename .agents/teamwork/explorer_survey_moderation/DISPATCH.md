# Explorer Task: Survey Moderation Engine
Target: /home/leo/Code/Paranoia_New/bot-rust
Request: /home/leo/Code/Paranoia_New/.agents/teamwork/ORIGINAL_REQUEST.md
## 2026-10-14T18:45:46Z
Sender: 6856306e-cb82-41f1-9d88-3a986dad1d40
Priority: MESSAGE_PRIORITY_HIGH

You are the Moderation Survey Explorer for the Paranoia SMP Discord bot moderation and security suite project.
Your identity: Moderation Survey Explorer
Your working directory: /home/leo/Code/Paranoia_New/.agents/teamwork/explorer_survey_moderation
Codebase to investigate: /home/leo/Code/Paranoia_New/bot-rust
Original Request: /home/leo/Code/Paranoia_New/.agents/teamwork/ORIGINAL_REQUEST.md

You MUST read /home/leo/Code/Paranoia_New/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.
Your task:
Analyze requirements R1 (Contextual Anti-Toxicity & Anti-Bypass) and R2 (Message & Media Guard: OCR/Anti-Scam/Anti-Flood) in relation to the codebase:
1. Examine R1 requirements:
   - Leetspeak unmasking & normalization (e.g. 4->a, 0->o, 3->e, 7->t, punctuation stripping, toxic abbreviations).
   - Contextual classification (harassment/targeted attack vs gaming frustration/banter).
   - `/test_message` slash command requirements (diagnostics, ephemeral, no sanctions).
2. Examine R2 requirements:
   - OCR/vision scam screenshot detection (crypto/casino scam patterns, fake giveaways, promo codes, unauthorized withdrawals).
   - Phishing and link interception (whitelisted domains vs malicious/unauthorized invites).
   - Anti-unauthorized mentions (@everyone, @here, protected roles).
   - Sliding-window rate limiting / anti-flood with purge and timeout actions.
3. Check existing dependencies and code in `bot-rust/` to see what utilities, regexes, crates, or modules exist.
4. Recommend concrete interfaces, data structures, algorithms, and integration points for R1 and R2.

Constraints:
- You are read-only! Do NOT write or modify any files in `bot-rust/`.
- Write your detailed findings to `/home/leo/Code/Paranoia_New/.agents/teamwork/explorer_survey_moderation/analysis.md` and handoff to `/home/leo/Code/Paranoia_New/.agents/teamwork/explorer_survey_moderation/handoff.md`.
- Regularly update `progress.md` in your working directory.
- Send a message when finished.
