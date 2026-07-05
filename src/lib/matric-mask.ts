/**
 * Mask a matric number for public / student-facing display.
 *
 * Shows the first 4 digits (the cohort prefix — admission year + programme
 * code, which is discoverable from a student's level/department anyway)
 * and replaces the unique-identifier portion with asterisks.
 *
 * Example: "230313001" → "2303*****"
 *
 * Rationale: the first 4 digits are not secret. The remaining digits
 * uniquely identify the student within their cohort and are hidden so
 * that a masked matric alone cannot be used to reconstruct the full one.
 */
export function maskMatric(matric: string): string {
  if (!matric) return '****'
  if (matric.length <= 4) return '*'.repeat(matric.length)
  return matric.slice(0, 4) + '*'.repeat(matric.length - 4)
}

/**
 * Extract a display name that HIDES the surname.
 *
 * Nigerian official naming convention writes names as:
 *   "SURNAME FirstName [MiddleName]"
 *
 * The surname is the FIRST token and is a password component:
 *   password = matric + last4(lowercase(surname))
 *
 * If we exposed the full name alongside even a masked matric, an attacker
 * in the same cohort (who knows the cohort prefix) could reconstruct the
 * full matric AND compute the password. This function drops the surname
 * and returns only the given names, title-cased for display.
 *
 * Examples:
 *   "EFFIONG FLORENCE JOY"   → "Florence Joy"
 *   "OLADEPO SAMUEL"         → "Samuel"
 *   "BABALOLA ABDULAZEEZ A." → "Abdulazeez A."
 */
export function displayFirstName(fullName: string): string {
  const tokens = fullName.trim().split(/\s+/)
  if (tokens.length <= 1) return 'Student'
  return tokens
    .slice(1)
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
    .join(' ')
}
