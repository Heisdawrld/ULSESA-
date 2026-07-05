/**
 * Roster parser — extracts (matric, fullName) pairs from messy text.
 *
 * Handles the real-world formats admins upload:
 *   - "210315001 Raji Olatubosun Joshua"
 *   - "210315001 - Raji Olatubosun Joshua"
 *   - "210315001\tRaji Olatubosun Joshua"
 *   - "1. 210315001 Raji Olatubosun Joshua"
 *   - "Raji Olatubosun Joshua 210315001"      (name first)
 *   - CSV: "210315001,Raji Olatubosun Joshua" or "Name,Matric"
 *   - Lines with surrounding noise like "S/N MATRIC NUMBER FULL NAME"
 *
 * Strategy: for each non-empty line, find the FIRST run of exactly 9 digits
 * (Nigerian matrics are 9 digits). Everything else on the line, minus list
 * markers / dashes / separators, is treated as the name. Lines with no 9-digit
 * run are skipped (headers, blank rows, footnotes).
 */

export interface ParsedEntry {
  matric: string
  name: string
  row: number
}

export interface ParseResult {
  entries: ParsedEntry[]
  /** matrics that appeared more than once in the source text */
  duplicates: string[]
  /** lines that were skipped because no 9-digit matric could be found */
  skippedLines: number
}

// 9 consecutive digits, not surrounded by more digits (so we don't grab part
// of a longer number like a phone number).
const MATRIC_RE = /(?<!\d)(\d{9})(?!\d)/

// Tokens that should be stripped from the name portion of a line.
// Includes list markers (1., 2), -, *, •), S/N column headers, "MATRIC", etc.
const NOISE_TOKENS = new Set([
  's/n',
  'sn',
  'matric',
  'matricno',
  'matricnumber',
  'name',
  'fullname',
  'studentname',
  'no',
  'no.',
])

/**
 * Clean a raw line down to just the human name, stripping:
 *  - leading list markers ("1.", "2)", "-", "*", "•")
 *  - the matric number itself
 *  - separator punctuation (dashes, pipes, colons, tabs, commas)
 *  - header tokens (S/N, MATRIC, NAME)
 */
function extractName(line: string, matric: string): string {
  let s = line
  // Remove the matric number wherever it appears (start, middle, or end).
  s = s.replace(new RegExp(`\\b${matric}\\b`, 'g'), ' ')
  // Remove leading list markers like "1.", "2)", "3 -", "*", "•"
  s = s.replace(/^\s*(\d+[.)]\s*|[-*•·–—]\s*)+/, '')
  // Replace separators with spaces so tokens split cleanly
  s = s.replace(/[\t|,;:_/\\]+/g, ' ')
  // Collapse dashes that act as separators (but keep hyphenated names like
  // "OSAKWE-OGO" intact — only strip standalone dashes surrounded by spaces)
  s = s.replace(/\s[-–—]\s/g, ' ')
  // Collapse whitespace
  const tokens = s
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !NOISE_TOKENS.has(t.toLowerCase()))
  return tokens.join(' ')
}

/**
 * Parse raw roster text into (matric, name) pairs.
 *
 * Handles .txt, .csv (treated as text), and the raw text extracted from .docx
 * by mammoth. Each logical record must be on its own line; CSV rows with
 * embedded newlines in quoted fields are NOT supported (rosters don't use
 * quoted multiline fields in practice).
 */
export function parseRosterText(raw: string): ParseResult {
  const lines = raw.split(/\r?\n/)
  const entries: ParsedEntry[] = []
  const seen = new Map<string, number>() // matric → first row seen
  const duplicates = new Set<string>()
  let skippedLines = 0

  lines.forEach((line, idx) => {
    const trimmed = line.trim()
    if (!trimmed) {
      return
    }
    const match = trimmed.match(MATRIC_RE)
    if (!match) {
      skippedLines++
      return
    }
    const matric = match[1]
    const name = extractName(trimmed, matric)

    // Require at least 2 letters in the name to avoid picking up pure-number
    // lines (e.g. a column of just matrics with names in another column).
    if (name.replace(/[^a-z]/gi, '').length < 2) {
      skippedLines++
      return
    }

    const row = idx + 1
    if (seen.has(matric)) {
      duplicates.add(matric)
      return // keep the first occurrence only
    }
    seen.set(matric, row)
    entries.push({ matric, name, row })
  })

  return {
    entries,
    duplicates: [...duplicates],
    skippedLines,
  }
}
