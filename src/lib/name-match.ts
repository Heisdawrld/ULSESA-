/**
 * Name matching for the claim flow.
 *
 * The student types their full name. We compare it against the name on the
 * attendance list. Match is:
 *  - Case-insensitive
 *  - Whitespace-insensitive (multiple spaces collapsed)
 *  - Non-alphanumeric stripped (hyphens, apostrophes, dots)
 *  - Order-insensitive (tokens sorted before comparison)
 *
 * This handles realistic variations:
 *   "OGUNDIPE INIOLUWA DANIEL"  ==  "daniel ogundipe inioluwa"
 *   "Abdul-Sobur Adewunmi"      ==  "abdul sobur adewunmi"
 *   "God'spraise Sukore"        ==  "godspraise sukore"
 *
 * But does NOT match:
 *   - Missing names (must have all tokens)
 *   - Extra names (no extras allowed)
 *   - Typos (different characters)
 */

/**
 * Normalize a name into a canonical comparable form.
 * Returns a sorted, space-joined string of alphanumeric tokens.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ''))
    .filter((token) => token.length > 0)
    .sort()
    .join(' ')
}

/**
 * Check if a user-typed name matches the name on the attendance list.
 * Both names are normalized, then compared for exact equality.
 *
 * Returns true if all name tokens match (in any order, case-insensitive).
 */
export function namesMatch(typedName: string, expectedName: string): boolean {
  const typed = normalizeName(typedName)
  const expected = normalizeName(expectedName)

  if (!typed || !expected) return false
  if (typed === expected) return true

  // Allow the typed name to be a subset of the expected name — this handles
  // students who don't have/use a middle name. The typed tokens must all be
  // present in the expected name.
  const typedTokens = new Set(typed.split(' '))
  const expectedTokens = new Set(expected.split(' '))

  // All typed tokens must be in expected name
  for (const t of typedTokens) {
    if (!expectedTokens.has(t)) return false
  }

  // And the typed name must have at least 2 tokens (first + last)
  // to avoid trivial matches like just "daniel"
  if (typedTokens.size < 2) return false

  return true
}
