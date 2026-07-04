import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminFromToken } from '@/lib/auth/server-auth'

/**
 * Admin endpoint to upload an attendance list and populate the MatricAllowlist.
 *
 * Accepts multipart/form-data with:
 *   - file: .docx, .csv, or .txt file containing matric + name pairs
 *   - programme: "Physics Education" | "Biology Education" | etc.
 *   - level: "100" | "200" | "300" | "400"
 *
 * Parses the file, extracts all 9-digit matrics + following name, upserts
 * them into MatricAllowlist. Returns a summary of inserted/skipped/duplicate
 * entries.
 *
 * Format expected in the file (any of):
 *   - 210313001\nOGUNDIPE INIOLUWA DANIEL\n  (one per line, matric then name)
 *   - 210313001,OGUNDIPE INIOLUWA DANIEL    (CSV)
 *   - S/N table format from Word attendance sheets (matric + name columns)
 */

// Parse matric + name pairs from raw text.
// Handles: CSV, one-per-line, Word table dumps (S/N / MATRIC / NAME / SIGNATURE)
function parseAttendanceText(text: string): { matric: string; name: string }[] {
  const results: { matric: string; name: string }[] = []
  const seen = new Set<string>()

  // Normalise whitespace
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\t/g, ' ').trim())
    .filter((l) => l.length > 0)

  // Try CSV / comma-separated first: "210313001,OGUNDIPE INIOLUWA DANIEL"
  for (const line of lines) {
    const csvMatch = line.match(/^(\d{9})\s*,\s*(.+)$/)
    if (csvMatch) {
      const matric = csvMatch[1]
      const name = csvMatch[2].trim().replace(/\s+/g, ' ')
      if (!seen.has(matric) && name.length >= 3) {
        seen.add(matric)
        results.push({ matric, name })
      }
      continue
    }
  }

  if (results.length > 0) return results

  // Fallback: sequential pairs — matric on one line, name on the next.
  // This is the format extracted from Word .docx tables.
  for (let i = 0; i < lines.length; i++) {
    const matricMatch = lines[i].match(/^(\d{9})$/)
    if (matricMatch) {
      const matric = matricMatch[1]
      // The name is on the NEXT non-empty line (skip S/N numbers)
      let nameLine = ''
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const candidate = lines[j].trim()
        // Skip pure numbers (S/N column)
        if (/^\d{1,3}$/.test(candidate)) continue
        // Skip the next matric (shouldn't happen but be safe)
        if (/^\d{9}$/.test(candidate)) break
        nameLine = candidate
        break
      }
      if (nameLine && nameLine.length >= 3 && !seen.has(matric)) {
        seen.add(matric)
        results.push({ matric, name: nameLine.replace(/\s+/g, ' ') })
      }
    }
  }

  return results
}

// Extract text from a .docx (it's a zip of XML)
async function extractDocxText(fileBuffer: ArrayBuffer): Promise<string> {
  // Dynamic import to avoid bundling JSZip unnecessarily
  const { unzipSync } = await import('fflate')
  const bytes = new Uint8Array(fileBuffer)
  const files = unzipSync(bytes)
  const docXml = files['word/document.xml']
  if (!docXml) throw new Error('Invalid .docx — no word/document.xml found')

  const xml = new TextDecoder().decode(docXml)
  // Strip XML tags, preserve paragraph + tab breaks
  let text = xml.replace(/<\/w:p>/g, '\n')
  text = text.replace(/<w:tab[^>]*\/>/g, '\t')
  text = text.replace(/<[^>]+>/g, '')
  // Decode basic XML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
  return text
}

export async function POST(request: Request) {
  try {
    // Admin auth
    const admin = await getAdminFromToken()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const programme = (formData.get('programme') as string | null)?.trim()
    const level = (formData.get('level') as string | null)?.trim()

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }
    if (!programme || !level) {
      return NextResponse.json(
        { error: 'Programme and level are required' },
        { status: 400 }
      )
    }

    const validProgrammes = [
      'Physics Education',
      'Biology Education',
      'Chemistry Education',
      'Mathematics Education',
      'Integrated Science Education',
    ]
    if (!validProgrammes.includes(programme)) {
      return NextResponse.json(
        { error: `Invalid programme. Must be one of: ${validProgrammes.join(', ')}` },
        { status: 400 }
      )
    }
    if (!['100', '200', '300', '400'].includes(level)) {
      return NextResponse.json(
        { error: 'Level must be 100, 200, 300, or 400' },
        { status: 400 }
      )
    }

    // Extract text based on file type
    const buffer = await file.arrayBuffer()
    let rawText = ''

    if (file.name.toLowerCase().endsWith('.docx')) {
      try {
        rawText = await extractDocxText(buffer)
      } catch (e) {
        return NextResponse.json(
          { error: 'Could not parse .docx file. Please ensure it is a valid Word document.' },
          { status: 400 }
        )
      }
    } else {
      // CSV or plain text
      rawText = new TextDecoder().decode(buffer)
    }

    const parsed = parseAttendanceText(rawText)

    if (parsed.length === 0) {
      return NextResponse.json(
        {
          error:
            'No valid matric + name pairs found in the file. Expected format: 9-digit matric followed by the student name. Supported: .docx attendance sheets, CSV (matric,name), or plain text.',
        },
        { status: 400 }
      )
    }

    // Derive cohort from programme (e.g. "Physics Education" → "Physics Ed")
    const cohort = programme

    // Upsert all entries. Skip matrics already in the allowlist (from a
    // previous upload) but update name/programme/level if the new data differs.
    const batchId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    let inserted = 0
    let updated = 0
    let skippedClaimed = 0
    const duplicates: string[] = []

    for (const { matric, name } of parsed) {
      const existing = await db.matricAllowlist.findUnique({
        where: { matricNumber: matric },
      })

      if (existing) {
        // Don't touch entries that are already claimed — that's a live account
        if (existing.isClaimed) {
          skippedClaimed++
          duplicates.push(matric)
          continue
        }
        // Update name/programme/level if different (class rep may have corrections)
        if (
          existing.fullName !== name ||
          existing.programme !== programme ||
          existing.level !== level
        ) {
          await db.matricAllowlist.update({
            where: { id: existing.id },
            data: { fullName: name, programme, level, cohort, uploadBatch: batchId },
          })
          updated++
        }
        continue
      }

      await db.matricAllowlist.create({
        data: {
          matricNumber: matric,
          fullName: name,
          programme,
          level,
          cohort,
          uploadBatch: batchId,
        },
      })
      inserted++
    }

    // Audit log
    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'allowlist_upload',
        target: `${programme} ${level}L`,
        details: `Uploaded ${file.name}: ${inserted} new, ${updated} updated, ${skippedClaimed} skipped (already claimed). Batch: ${batchId}`,
      },
    })

    return NextResponse.json({
      success: true,
      summary: {
        total: parsed.length,
        inserted,
        updated,
        skippedClaimed,
        duplicates,
      },
      batchId,
    })
  } catch (error) {
    console.error('[admin/allowlist/upload] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    )
  }
}
