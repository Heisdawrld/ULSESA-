# Task 3-a — Admin manual-verify + reset-password + add-student backend

**Agent:** full-stack-developer
**Task ID:** 3-a
**Project:** ULSESA (Next.js 16 + Prisma + Turso)
**Status:** ✅ Complete — lint passes

## Summary

Implemented the admin manual-verification fallback flow so students whose email
OTP fails (Gmail 500/day cap) can still claim their account. Built 3 new API
routes + updated 2 existing routes. All admin routes follow the exact same
pattern as the existing `/api/admin/students/[id]/verify/route.ts` (auth check,
error handling, logging).

## Files created

### 1. `src/app/api/admin/students/[id]/manual-verify/route.ts` (NEW)
- **POST** `/api/admin/students/[id]/manual-verify`
- Body: `{ notes?: string }`
- Auth: `getCurrentAdmin` → 401 if missing
- Sets `verificationStatus='admin_verified'`, `isVerified=true`
- Writes `VerificationLog { action: 'admin_verified', adminId, notes }`
- Writes `AuditLog { action: 'manual_verify', target: matricNumber, details }`
- Also creates `Activity { action: 'account_verified' }` so the student sees
  a "your account was verified" message in their feed.
- Returns `{ student, message }` — student shape matches the existing
  `/verify` route's select for frontend consistency.

### 2. `src/app/api/admin/students/[id]/reset-password/route.ts` (NEW)
- **POST** `/api/admin/students/[id]/reset-password`
- Body: `{ notes?: string }`
- Auth: admin only
- Sets `password=null`, `verificationStatus='admin_verified'`, `isVerified=true`
- Writes `VerificationLog { action: 'password_reset', adminId, notes }`
- Writes `AuditLog { action: 'reset_password', target: matricNumber, details }`
- Returns `{ student (without password), message }` — student can re-enter the
  claim flow on `/auth` and the `set-password` route will let them through via
  the `admin_verified` bypass.

## Files modified

### 3. `src/app/api/admin/students/route.ts` — added POST handler
- Existing GET handler untouched.
- **POST** `/api/admin/students` creates a new pre-registered student.
- Body: `{ matricNumber, fullName, level, programme, email?, phone? }`
- Validates: `matricNumber` required + unique (400 on duplicate), `fullName`
  required, `level` ∈ [100,200,300,400,500], `programme` required.
- Creates student with `password=null`, `isVerified=false`,
  `verificationStatus='pending'`.
- Writes `AuditLog { action: 'create_student', target: matricNumber }`.
- Returns 201 `{ student, message: 'Student added successfully' }`.

### 4. `src/app/api/auth/claim/route.ts` — added `adminVerified` flag
- Added a top-level `adminVerified: student.verificationStatus === 'admin_verified'`
  to the response (next to `student`). Frontend will use this to skip the OTP
  step entirely for admin-verified students.

### 5. `src/app/api/auth/set-password/route.ts` — admin_verified bypass
- Removed the hard `if (!isOTPVerified(matricNumber))` early-return.
- Now fetches the student FIRST (added `verificationStatus` to the select).
- After the existing 404 and already-claimed 400 checks, the new logic is:
  ```ts
  const otpVerified = isOTPVerified(matricNumber)
  const adminVerified = student.verificationStatus === 'admin_verified'
  if (!otpVerified && !adminVerified) return 403
  ```
- After setting the password:
  - If `adminVerified` → `verificationStatus='approved'`, `isVerified=true`
    (student is fully approved — admin already verified identity).
  - If OTP verified → `verificationStatus='submitted'` (unchanged behaviour —
    pending admin approval).
- `VerificationLog.action` and notes now branch on `adminVerified`.
- Final response message branches on `adminVerified` so the student gets
  accurate feedback ("identity verified by an admin…" vs "pending admin
  approval…").
- Cookie + token logic untouched.

## Verification

- `bun run lint` → **0 errors, 0 warnings** ✅
- `bunx tsc --noEmit` → no errors in any of the 5 modified/created files
  (remaining TS errors in `examples/`, `skills/`, `src/lib/email.ts`,
  `src/app/api/health/route.ts`, `src/components/shared/theme-toggle.tsx` are
  pre-existing and out of scope).

## Constraints honoured

- ✅ Uses `import { db } from '@/lib/db'` (lazy-init proxy).
- ✅ Uses `getCurrentAdmin` from `@/lib/auth/server-auth` for admin auth.
- ✅ Follows the existing try/catch + `console.error('[route] Error:', error)`
  + `NextResponse.json({ error }, { status })` pattern.
- ✅ No rate limiting added on admin routes (admin is trusted).
- ✅ No tests written.
- ✅ Password hash is NEVER returned in any response (explicitly excluded
  from every `select`).

## End-to-end fallback flow (for the orchestrator's reference)

1. Student's email OTP fails (Gmail cap hit / delivery problem).
2. Student contacts ULSESA president (admin).
3. Admin opens admin panel → finds student → clicks "Manual verify".
   → `POST /api/admin/students/[id]/manual-verify`
   → student.verificationStatus becomes `'admin_verified'`, isVerified=true.
4. Student re-enters matric on `/auth` (or admin tells them to).
   → `POST /api/auth/claim` returns `{ student, adminVerified: true }`.
   → Frontend sees `adminVerified:true` and skips the OTP step.
5. Student sets a password.
   → `POST /api/auth/set-password` — `otpVerified=false` but
     `adminVerified=true` → password is set, `verificationStatus='approved'`,
     `isVerified=true`, token issued, student is fully done.

For a forgotten-password scenario, admin clicks "Reset password" instead at
step 3 → `POST /api/admin/students/[id]/reset-password` clears the password
and marks `admin_verified` → student goes through claim → set-password as
above.

## Issues encountered

None. All five file operations completed cleanly on the first attempt.
Lint passed without any modifications needed after the initial write.
