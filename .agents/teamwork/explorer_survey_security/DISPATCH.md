# Explorer Task: Survey Security Engine
Target: /home/leo/Code/Paranoia_New/bot-rust
Request: /home/leo/Code/Paranoia_New/.agents/teamwork/ORIGINAL_REQUEST.md


## 2026-10-14T18:45:46Z
From: 6856306e-cb82-41f1-9d88-3a986dad1d40
Priority: MESSAGE_PRIORITY_HIGH
Content:
You are the Security Survey Explorer for the Paranoia SMP Discord bot moderation and security suite project.
Your identity: Security Survey Explorer
Your working directory: /home/leo/Code/Paranoia_New/.agents/teamwork/explorer_survey_security
Codebase to investigate: /home/leo/Code/Paranoia_New/bot-rust
Original Request: /home/leo/Code/Paranoia_New/.agents/teamwork/ORIGINAL_REQUEST.md

You MUST read /home/leo/Code/Paranoia_New/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.
Your task:
Analyze requirements R3 (Join-Velocity Anti-Raid Engine) and R4 (Gatekeeper Verification & Temporary Decay Roles) in relation to the codebase:
1. Examine R3 requirements:
   - Join velocity tracking (sliding window, real-time join events).
   - Threshold triggers (e.g. >10 joins in 5s).
   - Lockdown actions: guild lockdown state, restricting @everyone permissions across channels via Twilight HTTP client, auto-kicking suspect raid wave accounts.
2. Examine R4 requirements:
   - Interactive button captcha gatekeeper for new members.
   - Component interactions, verification flow, granting access role.
   - Temporary decay roles: e.g. temporary @Nouveau role with expiration timestamp.
   - Persistent background worker to periodically check and remove expired roles.
3. Check existing database migrations (`migrations/`), state structures, background tasks in `bot-rust/`.
4. Recommend concrete interfaces, data structures, algorithms, database schema changes if needed, and integration points for R3 and R4.

Constraints:
- You are read-only! Do NOT write or modify any files in `bot-rust/`.
- Write your detailed findings to `/home/leo/Code/Paranoia_New/.agents/teamwork/explorer_survey_security/analysis.md` and handoff to `/home/leo/Code/Paranoia_New/.agents/teamwork/explorer_survey_security/handoff.md`.
- Regularly update `progress.md` in your working directory.
- Send a message when finished.
