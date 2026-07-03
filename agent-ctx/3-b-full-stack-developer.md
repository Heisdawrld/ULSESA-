# Task 3-b — Admin UI for manual-verify, reset-password, and add-student

**Agent:** full-stack-developer
**Task ID:** 3-b
**Project:** ULSESA (Next.js 16 + Prisma + Turso)
**Status:** ✅ Complete — lint passes

## Summary

Added the UI for the three admin backend features built in Task 3-a:
manual-verify, reset-password, and add-student. Made one small surgical
backend change to `/api/admin/students` GET to expose a derived `hasPassword`
boolean (the hash itself is never returned) so the UI can correctly show/hide
the manual-verify and reset-password buttons.

## Files modified (2)

### 1. `src/app/api/admin/students/route.ts` (surgical edit, GET handler only)
- GET now selects `password: true` but **never returns the hash** — it maps
  the result to strip the password and expose a derived `hasPassword: Boolean(password)`
  boolean on each student row.
- Added `'admin_verified'` to the list of valid `status` filter values so the
  new status filter option in the UI works.
- POST handler untouched.

### 2. `src/components/views/admin-view.tsx` (surgical edits, 8 changes)
1. Imports — added `KeyRound` and `UserPlus` to the lucide-react imports
   (`ShieldCheck` was already imported).
2. Types — added `hasPassword?: boolean` to the `StudentRow` interface.
3. `statusBadge()` helper — added a new `'admin_verified'` case: emerald-tinted
   Badge with a `ShieldCheck` icon and label "Admin Verified", visually
   distinct from the regular "Approved" badge.
4. `StudentsSection` header — wrapped Refresh button in a flex div with a new
   primary "Add Student" button (`UserPlus` icon).
5. `StudentsSection` state — added `manualVerifying`, `resettingPassword`,
   `showManualVerifyConfirm`, `showResetPasswordConfirm`, `showAddDialog`,
   `addingStudent`, `newMatric`, `newFullName`, `newLevel`, `newProgramme`,
   `newEmail`, `newPhone`.
6. `StudentsSection` handlers — added `handleManualVerify()`,
   `handleResetPassword()`, `resetAddForm()`, `handleAddStudent(e)` async
   functions. They follow the exact same try/catch/toast/refresh pattern as
   the existing `verify()` function.
7. Student detail dialog body — extended the notes Textarea condition so it
   also shows when the new buttons are visible; added a Manual Verify panel
   (emerald, `ShieldCheck` icon, helper text) shown only when
   `verificationStatus !== 'admin_verified' && !hasPassword`; added a Reset
   Password panel (amber, `KeyRound` icon, warning text) shown only when
   `hasPassword`.
8. Two controlled `AlertDialog` confirmations as siblings of the student
   detail `Dialog` — emerald Manual Verify confirm and amber Reset Password
   confirm, each with a Loader2 spinner during the API call and Cancel
   disabled while pending.
9. Add Student dialog — full form with Matric Number, Full Name, Level
   (Select 100–500), Programme (Select with all 16 ULSESA programmes), Email
   (optional), Phone (optional), Create Student submit button with spinner.
10. Status filter Select — added an `admin_verified` option for consistency.

## Verification
- `bun run lint` → **0 errors, 0 warnings** ✅
- Pre-existing prisma errors in `dev.log` about `TURSO_DATABASE_URL` are
  unrelated to my changes (environment-level DB config issue — schema says
  `env("DATABASE_URL")`, runtime is looking for `TURSO_DATABASE_URL`). GET /
  still returns 200.

## Constraints honoured
- ✅ Did NOT rewrite the entire admin-view.tsx — used Edit/MultiEdit for
  targeted changes only. Existing verify/approve/reject flow is untouched.
- ✅ Used existing UI components (Dialog, AlertDialog, Button, Input, Label,
  Select, Textarea, Badge) — all already imported.
- ✅ Followed existing code style (same indentation, same toast usage, same
  api.post pattern as `verify()`).
- ✅ No tests written.
- ✅ Password hash is NEVER returned in any response.
- ✅ Manual Verify button hidden when `verificationStatus === 'admin_verified'`
  or when student has a password.
- ✅ Reset Password button shown only when student has a password.

## Issues encountered
None. All edits applied cleanly on the first attempt. Lint passed without
modifications needed.
