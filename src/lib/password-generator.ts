/**
 * ULSESA pre-set password scheme — PURE utility (client-safe).
 *
 * This file has NO server-only imports (no next/headers, no db, no bcrypt)
 * so it can be imported from client components like the login screen.
 *
 * Rule (confirmed with the admin):
 *   password = matricNumber + last4(lowercase(surname))
 *
 * Nigerian naming convention: names on the attendance list are written
 * "SURNAME FirstName [MiddleName]" in UPPERCASE. So the surname is the
 * FIRST whitespace-separated token of fullName.
 *
 * Examples (fictional — NOT real students):
 *   230315001 BELLO Aisha Mohammed   → 230315001ello
 *   230315002 ADEWALE John Oluwaseun → 230315002wale
 *   230315003 EZE Grace Ngozi        → 230315003eze  (short surname → whole thing)
 *
 * Edge cases handled:
 *  - Surname shorter than 4 letters → use the whole surname (e.g. "Eze" → "eze")
 *  - Hyphens / apostrophes / accents stripped before slicing
 *    (e.g. "OSAKWE-OGO" → "osakweogo" → last4 = "wego")
 *  - Leading titles (Dr, Mr, Mrs, Miss, Engr, Prof, Hon) stripped so they
 *    don't get mistaken for the surname.
 */

// Common Nigerian name prefixes/titles that sometimes appear before the
// surname on official lists. Stripped before extracting the surname.
const NAME_TITLES = new Set([
  'dr', 'mr', 'mrs', 'miss', 'ms', 'engr', 'prof', 'hon',
  'chief', 'mrs.', 'mr.', 'dr.', 'prof.', 'engr.',
])

/**
 * Extract the surname token from a full name written in Nigerian convention
 * (SURNAME FirstName Middle...), stripping titles and non-alpha characters.
 */
export function extractSurname(fullName: string): string {
  const tokens = fullName
    .trim()
    .split(/\s+/)
    .map((t) => t.toLowerCase().replace(/[^a-z]/g, ''))
    .filter((t) => t.length > 0)

  // Drop leading title tokens
  while (tokens.length > 1 && NAME_TITLES.has(tokens[0])) {
    tokens.shift()
  }

  return tokens[0] ?? ''
}

/**
 * The last 4 letters of the surname (lowercased, alpha-only).
 * If the surname is shorter than 4 letters, returns the whole surname.
 */
export function surnameSuffix(fullName: string): string {
  const surname = extractSurname(fullName)
  if (surname.length <= 4) return surname
  return surname.slice(-4)
}

/**
 * The plaintext password for a student, per the ULSESA rule.
 * This is what the student types at login.
 */
export function generatePlainPassword(
  matricNumber: string,
  fullName: string
): string {
  const cleanMatric = matricNumber.trim()
  const suffix = surnameSuffix(fullName)
  return `${cleanMatric}${suffix}`
}

/**
 * Human-readable description of the password rule, shown on the login screen
 * as a hint so real students know what to type (an attacker still needs to
 * know the target's name as it appears on the attendance list).
 */
export const PASSWORD_RULE_HINT =
  'Your password is your matric number + the last 4 letters of your surname (all lowercase, no spaces).'

/**
 * Example used in the login hint box. Uses a FICTIONAL student that is
 * NOT in any roster, so the hint can never leak a real password.
 */
export const PASSWORD_RULE_EXAMPLE = 'e.g. matric 230315001, surname "Bello" → 230315001ello'
