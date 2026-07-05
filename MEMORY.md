# MEMORY — ULSESA Election Platform

> **Purpose:** This file is the durable, long-term memory for every conversation
> about this project. Read it FIRST at the start of any new session before doing
> anything else. Update it whenever a fact changes. Never delete it.
>
> If this file and the model's training data disagree, **this file wins.**

---

## 0. Working Rules With The User (NON-NEGOTIABLE)

- **Deploy target is Render. NOT Vercel.** Never say "Vercel will build it" or
  "Vercel deploy" again. Render watches the GitHub repo and auto-deploys on push
  to `main`.
- **Do NOT start significant work without the user's explicit confirmation.**
  Asking first is mandatory. Reading files to understand state is fine; writing
  code, installing packages, pushing commits, or running migrations is NOT.
- **Do NOT run `bun run build`.** Dev server only, port 3000, background.
- **User's timezone:** `Africa/Lagos`. Interpret relative dates/times here.
- **When the user says "fix the flags you saw" or similar**, they mean fix the
  specific bugs previously identified — not a general cleanup pass.
- **Never forget conversation history.** If unsure whether something was already
  decided, check this file AND `/home/z/my-project/worklog.md` before assuming.

---

## 1. What This Project Is

ULSESA — University of Lagos Science Students Association election platform.
A Next.js 16 app where students vote in faculty elections. Built for real use
with real voter data, so security and data integrity matter.

- **Repo:** `github.com/Heisdawrdawrld/ULSESA-` (branch `main`)
- **Live host:** Render (auto-deploys from `main` on push)
- **Stack:** Next.js 16 (App Router) · TypeScript 5 · Tailwind 4 · shadcn/ui ·
  Prisma (SQLite locally, MySQL on Render) · NextAuth available · Zustand ·
  TanStack Query

---

## 2. Authentication Scheme (CRITICAL — do not regress)

Students log in with **matric number + a pre-set deterministic password**.
There is NO email OTP, NO claim-and-set-password flow at login time.

### The password rule
```
password = matricNumber + last4(lowercase(surname))
```
- `matricNumber` is exactly 9 digits (Nigerian matrics).
- The surname is the **FIRST token** of the student's full name, because
  Nigerian official lists write names as `SURNAME FirstName [MiddleName]`,
  often in UPPERCASE.
  - Example: `BELLO Aisha Mohammed` → surname = "Bello" → suffix = "ello"
  - Example: `EZE Grace Ngozi` → surname = "Eze" (short) → suffix = "eze"
  - Example: `OSAKWE-OGO Daniel` → surname normalized to "osakweogo" → suffix = "wego"
- Titles (Dr, Mr, Mrs, Miss, Engr, Prof, Hon, Chief) at the start are stripped
  before extracting the surname.
- Reference impl: `src/lib/password-generator.ts` — `generatePlainPassword()`.
  This file is client-safe (no server-only imports) so the login screen can show
  the rule as a hint.

### Where the password hash lives
- `MatricAllowlist.passwordHash` — pre-computed at seed/upload time using the
  rule above. **This is what login checks against.** `Student.password` is dead
  code leftover from the old email-OTP migration and is NOT consulted at login.
- The `reset-password` endpoint clears `Student.password` — that is dead code
  after the password migration. Do not rely on it.

### Password rotation (security escape hatch)
- Admin can override the rule-based hash via
  `POST /api/admin/allowlist/[matric]/rotate-password`.
- It generates a random one-time password, stores its hash in
  `MatricAllowlist.passwordHash`, stamps `passwordRotatedAt`, and returns the
  plaintext ONCE to the admin (shown in a dialog with a Copy button).
- Use case: an imposter claimed a student's matric and voted. Admin revokes the
  fraudulent Student (via Disputes panel), then rotates the password so the
  imposter can't log back in with the rule-based password. The new password is
  handed to the legitimate student via WhatsApp.

---

## 3. Deploy Host: RENDER (not Vercel)

- Push to `origin/main` → Render auto-builds → live site updates.
- The user manages env vars on the Render dashboard and will paste them into
  chat when needed. **Save any env vars the user sends into this file's
  section 7 below** (or a separate `.env.render` if they prefer — ask).
- Local dev uses SQLite via Prisma; Render uses MySQL. Schema must stay
  compatible with both. `prisma/schema.prisma` cannot use list-typed primitives.

---

## 4. Current Project State (as of last session)

### Done & pushed to `main` (commits up to `e0f433d`)
- **voteCount recomputation fix** — `src/lib/vote-counts.ts` +
  wired into `src/app/api/admin/disputes/route.ts` revoke flow. When a
  fraudulent Student is revoked, their Votes are cascade-deleted and then
  `Candidate.voteCount` is recomputed from live Vote rows so public results
  stay correct.
- **Password rotation endpoint** —
  `src/app/api/admin/allowlist/[matric]/rotate-password/route.ts`.
- **Allowlist JSON batch insert** — `src/app/api/admin/allowlist/batch/route.ts`
  (takes pre-parsed JSON, used for offline-parsed rosters).
- Previous security hardening: closed matric enumeration + mass-claim vuln.

### Done locally, NOT yet committed/pushed (awaiting user confirmation)
- **Roster file upload route** — `src/app/api/admin/allowlist/upload/route.ts`
  Accepts `.docx` / `.csv` / `.txt` via FormData + programme + level, extracts
  9-digit matrics + names, upserts into MatricAllowlist with three-way
  semantics: `inserted` / `updated` / `skippedClaimed`.
- **Roster parser** — `src/lib/roster-parser.ts`. Extracts (matric, fullName)
  from messy text; handles list markers, name-first/martic-first, CSV, headers.
- **mammoth** dependency installed (for `.docx` text extraction).
- Lint passes clean. Dev server compiled the new route without errors.
- **STATUS: code is written and ready, but NOT committed. Awaiting user
  confirmation before `git add` / `git commit` / `git push`.**

### Why this upload route was built
The admin UI's "Upload roster" button (Voter Register tab) calls
`POST /api/admin/allowlist/upload`, but that route did NOT exist — only
`/batch` (JSON) did. So the upload button was 404ing. The new route matches
the `UploadSummary` interface the UI already expects.

---

## 5. Key File Map

| Concern | Path |
|---|---|
| Prisma schema | `prisma/schema.prisma` |
| DB client | `src/lib/db.ts` (`import { db } from '@/lib/db'`) |
| Password rule | `src/lib/password-generator.ts` |
| Vote count recompute | `src/lib/vote-counts.ts` |
| Roster parser | `src/lib/roster-parser.ts` |
| Admin auth helper | `src/lib/auth/server-auth.ts` (`getAdminFromToken`, `hashPassword`) |
| Student login route | `src/app/api/auth/login/route.ts` |
| Admin login route | `src/app/api/auth/admin-login/route.ts` |
| Cast vote | `src/app/api/elections/vote/route.ts` |
| Public results | `src/app/api/elections/results/route.ts` |
| Disputes (public file + admin resolve) | `src/app/api/disputes/route.ts` + `src/app/api/admin/disputes/route.ts` |
| Allowlist list/search | `src/app/api/admin/allowlist/route.ts` |
| Allowlist JSON batch | `src/app/api/admin/allowlist/batch/route.ts` |
| Allowlist file upload (NEW, uncommitted) | `src/app/api/admin/allowlist/upload/route.ts` |
| Password rotation | `src/app/api/admin/allowlist/[matric]/rotate-password/route.ts` |
| Admin UI (single big file) | `src/components/views/admin-view.tsx` |
| Student voting UI | `src/components/views/elections-view.tsx` |
| Dev server log | `/home/z/my-project/dev.log` |
| Worklog (dev progress) | `/home/z/my-project/worklog.md` |

### Known cosmetic note
`ls` and `find` sometimes display the dynamic route dir as `atric]` instead of
`[matric]` — this is a terminal display artifact (the `[m` looks like an escape
sequence). `od -c` confirms the real bytes on disk are `[matric]`. NOT a bug.

---

## 6. The "What If An Imposter Claims A Matric" Runbook

This was discussed at length. The agreed resolution flow:

1. **Legitimate student notices** they can't log in (imposter already claimed
   the matric) OR spots that someone voted using their account.
2. **Student contacts admin via WhatsApp** — the login page's "Can't log in?"
   button links to the admin's WhatsApp. Student sends their matric + biodata.
3. **Admin files a dispute** via `POST /api/disputes` (or the student files it
   themselves through the public dispute form).
4. **Admin reviews** in the Disputes tab of the admin panel.
5. **If fraudulent → Revoke**: deletes the imposter's `Student` record (which
   cascade-deletes their Votes), frees the allowlist entry, AND recomputes
   `Candidate.voteCount` for every affected election so public tallies are correct.
6. **Admin then rotates the password** on that matric (Voter Register →
   "Rotate Password"). Gets a one-time plaintext back.
7. **Admin sends the new password to the legitimate student via WhatsApp.**
   The imposter can no longer log in with the rule-based password.
8. **Legitimate student logs in**, re-claims the matric, and (if the election
   is still open) casts their own vote.

---

## 7. Env Vars (Render)

> The user will paste env vars here as they send them. Until then, this section
> is a placeholder. **Do NOT ask repeatedly** — wait for the user to send.

```
# PASTE RENDER ENV VARS BELOW THIS LINE WHEN PROVIDED
```

- Database URL for Render's MySQL: _awaiting user_
- NextAuth secret: _awaiting user_
- Any other secrets: _awaiting user_

---

## 8. Pending Decisions / Open Questions

- Whether to commit + push the new roster upload route
  (`src/app/api/admin/allowlist/upload/route.ts` + parser + mammoth dep).
  Code is ready, awaiting user's "go".
- Whether to remove the dead `reset-password` endpoint (clears `Student.password`
  which is no longer checked at login). Low priority.
- Whether to expose the within-file `duplicates` list in the upload result UI
  (currently the backend returns it but the UI toast doesn't show it).

---

## 9. How To Resume A Session

1. Read this file (`/home/z/my-project/MEMORY.md`) top to bottom.
2. Read `/home/z/my-project/worklog.md` (dev progress log, append-only).
3. `git status` + `git log --oneline -10` to see committed state.
4. `tail -50 /home/z/my-project/dev.log` to see latest runtime behavior.
5. Only then, ask the user what they want to do next. Do not assume.
