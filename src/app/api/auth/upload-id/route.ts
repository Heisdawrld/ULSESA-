import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { db } from '@/lib/db'

// POST /api/auth/upload-id
//
// Student-side fallback for when Gmail SMTP can't deliver their OTP (or the
// 500/day cap is exhausted). The student uploads a photo of their student ID
// card or biodata form. We compress it server-side with sharp and store it
// as a base64 data URL on `Student.idDocumentUrl`, then mark the student as
// `verificationStatus = 'submitted'` so they appear in the admin verification
// queue. An ULSESA admin then reviews the actual image and either:
//   - approves  → POST /api/admin/students/[id]/manual-verify (status → admin_verified)
//   - rejects   → POST /api/admin/students/[id]/verify { action: 'reject' } (status → rejected)
//
// After approval the student re-enters their matric in the claim flow; the
// `adminVerified` flag short-circuits the OTP step and lets them set a
// password directly. After rejection they see the rejection reason and can
// re-upload a clearer image (this same endpoint resets them to 'submitted').
//
// Storage strategy: we intentionally reuse the existing `idDocumentUrl`
// column with a base64 data URL (no new schema fields, no migrations, no
// S3 / object storage). sharp keeps each image to ~150–400KB so the row
// stays small enough for Turso/SQLite.

const MAX_RAW_BYTES = 8 * 1024 * 1024 // 8 MB pre-compression cap

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const matricNumber = (body?.matricNumber ?? '').toString().trim()
    const documentData = (body?.documentData ?? '').toString()
    const documentType = body?.documentType
      ? (body.documentType as string).toString().trim()
      : 'student_id'

    if (!matricNumber) {
      return NextResponse.json(
        { error: 'Matric number is required' },
        { status: 400 }
      )
    }
    if (!documentData) {
      return NextResponse.json(
        { error: 'ID document image is required' },
        { status: 400 }
      )
    }
    if (!documentData.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Image must be a data URL starting with data:image/' },
        { status: 400 }
      )
    }

    // Parse the data URL: data:image/<subtype>;base64,<payload>
    const match = documentData.match(
      /^data:image\/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/
    )
    if (!match) {
      return NextResponse.json(
        { error: 'Malformed image data URL' },
        { status: 400 }
      )
    }
    // match[0] = full match, match[1] = subtype, match[2] = base64 payload.
    // NOTE: a previous version used `const [, /* subtype */ base64Payload] = match`
    // which is a TWO-element destructure — it actually assigns match[1] (the
    // subtype string, e.g. "jpeg") to base64Payload, not the payload itself.
    // That silently decoded 4 bytes of garbage and sharp rejected it. Use
    // explicit indexing instead.
    const base64Payload = match[2]

    let rawBuffer: Buffer
    try {
      rawBuffer = Buffer.from(base64Payload, 'base64')
    } catch {
      return NextResponse.json(
        { error: 'Could not decode image data' },
        { status: 400 }
      )
    }

    if (rawBuffer.length === 0) {
      return NextResponse.json(
        { error: 'Image data is empty' },
        { status: 400 }
      )
    }
    if (rawBuffer.length > MAX_RAW_BYTES) {
      return NextResponse.json(
        { error: 'Image too large, max 8MB' },
        { status: 413 }
      )
    }

    // Find the student.
    const student = await db.student.findUnique({
      where: { matricNumber },
      select: {
        id: true,
        fullName: true,
        matricNumber: true,
        password: true,
        verificationStatus: true,
      },
    })

    if (!student) {
      return NextResponse.json(
        {
          error:
            'No student found with that matric number. Only pre-registered ULSESA members can upload an ID.',
        },
        { status: 404 }
      )
    }

    // If the student already has a password they have already claimed —
    // sending them back to upload makes no sense.
    if (student.password) {
      return NextResponse.json(
        {
          error:
            'This account has already been claimed. Please sign in instead.',
        },
        { status: 400 }
      )
    }

    // Compress with sharp: downscale to max 1400px wide, JPEG q78. This
    // turns a 5MB phone photo into a ~150–400KB data URL, small enough for
    // Turso/SQLite row storage while staying legible for admin review.
    let compressedBuffer: Buffer
    try {
      compressedBuffer = await sharp(rawBuffer)
        .rotate() // honour EXIF orientation from phone cameras
        .resize({
          width: 1400,
          height: 1400,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .flatten({ background: '#ffffff' }) // flatten alpha so JPEG has no transparency artefacts
        .jpeg({ quality: 78, mozjpeg: true })
        .toBuffer()
    } catch (imgErr) {
      console.error('[auth/upload-id] sharp compression failed:', imgErr)
      return NextResponse.json(
        { error: 'Could not process image. Please try a different photo.' },
        { status: 400 }
      )
    }

    const compressedDataUrl = `data:image/jpeg;base64,${compressedBuffer.toString(
      'base64'
    )}`

    // Persist. We deliberately do NOT touch `isVerified` here — admin will
    // set that when they review the image. Resetting to 'submitted' also
    // covers the re-upload-after-rejection case.
    await db.student.update({
      where: { id: student.id },
      data: {
        idDocumentUrl: compressedDataUrl,
        verificationStatus: 'submitted',
      },
    })

    // Always create a fresh VerificationLog so the audit trail reflects
    // every upload (including re-uploads after a rejection).
    await db.verificationLog.create({
      data: {
        studentId: student.id,
        action: 'submitted',
        notes: `Student uploaded ID document for manual review${
          documentType !== 'student_id' ? ` (${documentType})` : ''
        }`,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Your ID has been uploaded and is pending admin review.',
    })
  } catch (error) {
    console.error('[auth/upload-id] Error:', error)
    return NextResponse.json(
      { error: 'Failed to upload ID document' },
      { status: 500 }
    )
  }
}
