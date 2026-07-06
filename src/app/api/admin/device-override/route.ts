import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/auth/server-auth'
import { hashDeviceFingerprint, shortFingerprint } from '@/lib/device-limit'

/**
 * POST /api/admin/device-override
 *
 * Grant extra claim allowance for a specific device fingerprint. Used when
 * the auto-cap (default 1) is too low for a legitimate case — e.g. a school
 * computer lab where many students share one browser, or an admin trusts a
 * class rep's phone for a bulk claim session.
 *
 * Body:
 *   { fingerprintHash: string, extraClaims: number, reason: string, expiresAt?: string }
 *
 * - fingerprintHash must already exist in DeviceClaimAttempt (you can't
 *   pre-grant overrides for a device that hasn't been seen yet).
 * - extraClaims is added to the default cap. e.g. default=1 + extra=1 → cap=2.
 * - reason is required (audit trail).
 * - expiresAt is optional ISO string; if omitted the override never expires.
 *
 * Records an AuditLog entry under the acting admin.
 */
export async function POST(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const fingerprintHash = (body?.fingerprintHash ?? '').toString().trim()
    const extraClaims = Number(body?.extraClaims ?? 1)
    const reason = (body?.reason ?? '').toString().trim()
    const expiresAtRaw = body?.expiresAt ? (body.expiresAt as string).toString().trim() : null

    if (!fingerprintHash) {
      return NextResponse.json(
        { error: 'fingerprintHash is required' },
        { status: 400 }
      )
    }
    if (!Number.isInteger(extraClaims) || extraClaims < 1 || extraClaims > 100) {
      return NextResponse.json(
        { error: 'extraClaims must be an integer between 1 and 100' },
        { status: 400 }
      )
    }
    if (!reason) {
      return NextResponse.json(
        { error: 'A reason is required (for the audit log)' },
        { status: 400 }
      )
    }

    // Verify the fingerprint exists in DeviceClaimAttempt — we don't grant
    // overrides for unseen devices.
    const seen = (await db.$queryRawUnsafe(
      `SELECT COUNT(*) AS n FROM DeviceClaimAttempt WHERE fingerprintHash = ?`,
      fingerprintHash
    )) as Array<{ n: bigint }>
    if (Number(seen[0]?.n ?? 0) === 0) {
      return NextResponse.json(
        { error: 'No claim attempts found for this device fingerprint. Wait for the device to appear in the activity list first.' },
        { status: 404 }
      )
    }

    const id = `override-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const expiresAt = expiresAtRaw || null

    await db.$executeRawUnsafe(
      `INSERT INTO DeviceOverride
         (id, fingerprintHash, fingerprintShort, extraClaims, reason, createdBy, createdAt, expiresAt)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
      id,
      fingerprintHash,
      shortFingerprint(fingerprintHash),
      extraClaims,
      reason,
      admin.id,
      expiresAt
    )

    // Audit log
    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'grant_device_override',
        target: shortFingerprint(fingerprintHash),
        details: `Granted +${extraClaims} extra claim(s) for device ${shortFingerprint(fingerprintHash)}. Reason: ${reason}${expiresAt ? `. Expires: ${expiresAt}` : ' (no expiry)'}.`,
      },
    })

    return NextResponse.json({
      ok: true,
      override: {
        id,
        fingerprintHash,
        fingerprintShort: shortFingerprint(fingerprintHash),
        extraClaims,
        reason,
        expiresAt,
      },
    })
  } catch (error) {
    console.error('[admin/device-override] Error:', error)
    return NextResponse.json(
      { error: 'Failed to grant device override' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/device-override?id=...
 *
 * Revoke a previously-granted override. Used when the legitimate bulk-claim
 * session is over and you want to restore the default cap.
 */
export async function DELETE(request: Request) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { error: 'id query param is required' },
        { status: 400 }
      )
    }

    // Fetch the override first so we can log what was revoked.
    const existing = (await db.$queryRawUnsafe(
      `SELECT fingerprintHash, fingerprintShort, extraClaims FROM DeviceOverride WHERE id = ?`,
      id
    )) as Array<{
      fingerprintHash: string
      fingerprintShort: string
      extraClaims: number
    }>

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Override not found' },
        { status: 404 }
      )
    }

    await db.$executeRawUnsafe(
      `DELETE FROM DeviceOverride WHERE id = ?`,
      id
    )

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'revoke_device_override',
        target: existing[0].fingerprintShort,
        details: `Revoked +${existing[0].extraClaims} override for device ${existing[0].fingerprintShort} (override id ${id}).`,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[admin/device-override DELETE] Error:', error)
    return NextResponse.json(
      { error: 'Failed to revoke device override' },
      { status: 500 }
    )
  }
}
