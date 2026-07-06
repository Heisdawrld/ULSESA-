import { db } from '@/lib/db'

/**
 * ULSESA election auto-pilot.
 *
 * The election's effective status is DERIVED from the clock:
 *   - now < startDate            → "upcoming"
 *   - startDate ≤ now < endDate  → "active"
 *   - now ≥ endDate              → "ended"
 *
 * …UNLESS the admin has set a `manualOverride`, which always wins:
 *   - "active"     → force-open immediately (overrides schedule)
 *   - "ended"      → force-close immediately (overrides schedule)
 *   - "cancelled"  → election voided (no voting, no results)
 *   - "upcoming"   → force-lock before scheduled open
 *
 * The stored `Election.status` column is a mirror that we sync
 * opportunistically so the admin panel and audit trail reflect the
 * live clock state — but getEffectiveStatus() is the source of truth.
 */

export type ElectionStatus = 'upcoming' | 'active' | 'ended' | 'cancelled'

type ElectionLike = {
  status: string
  startDate: Date | string
  endDate: Date | string
  manualOverride?: string | null
}

/**
 * Pure derivation — no DB writes. Call this anywhere you need to know
 * whether voting is open right now.
 *
 * @param election  The election row (needs startDate, endDate, manualOverride)
 * @param now       Override for testing / server time normalisation
 */
export function getEffectiveStatus(
  election: ElectionLike,
  now: Date = new Date()
): ElectionStatus {
  // Admin override wins absolutely.
  if (election.manualOverride) {
    const ov = election.manualOverride as ElectionStatus
    if (
      ov === 'active' ||
      ov === 'ended' ||
      ov === 'cancelled' ||
      ov === 'upcoming'
    ) {
      return ov
    }
  }

  const start = new Date(election.startDate)
  const end = new Date(election.endDate)
  const t = now.getTime()

  if (t < start.getTime()) return 'upcoming'
  if (t >= end.getTime()) return 'ended'
  return 'active'
}

/**
 * Is voting currently allowed? True only when effective status is "active".
 * (Cancelled / ended / upcoming all block voting.)
 */
export function isVotingOpen(
  election: ElectionLike,
  now: Date = new Date()
): boolean {
  return getEffectiveStatus(election, now) === 'active'
}

/**
 * Opportunistically sync the stored `Election.status` column to match the
 * derived effective status — BUT only when there's no manualOverride (in
 * which case the stored status is whatever the admin last set, and we
 * shouldn't fight it).
 *
 * Called from GET /api/elections on every page load so the admin panel
 * and audit trail reflect the clock transition without needing a cron.
 *
 * Returns the effective status (whether or not a write happened).
 */
export async function syncElectionStatus(
  election: ElectionLike & { id: string }
): Promise<ElectionStatus> {
  const effective = getEffectiveStatus(election)

  // Only sync when in auto-pilot mode AND the stored status is stale.
  if (
    !election.manualOverride &&
    election.status !== effective
  ) {
    try {
      await db.election.update({
        where: { id: election.id },
        data: { status: effective },
      })
      // Also drop an audit log entry for the transition — but we can't
      // attribute it to an admin (it's the system). Use a sentinel adminId
      // of "system" by writing directly via $executeRawUnsafe to avoid the
      // Admin FK constraint. Actually, AuditLog.adminId has a FK to Admin,
      // so we can't use "system". Skip the audit log for auto-transitions —
      // the updatedAt timestamp on the Election row is enough telemetry.
    } catch (e) {
      // Non-fatal — the derived status is still returned to the caller,
      // so the request handling is correct even if the mirror write failed.
      console.error('[election-status] sync write failed:', e)
    }
  }

  return effective
}

/**
 * Human-readable label for the status badge in the UI.
 */
export function getStatusLabel(status: ElectionStatus): string {
  switch (status) {
    case 'upcoming':
      return 'Opens Soon'
    case 'active':
      return 'Voting Open'
    case 'ended':
      return 'Voting Closed'
    case 'cancelled':
      return 'Cancelled'
  }
}

/**
 * Describe the scheduling mode for the admin panel.
 */
export function getSchedulingMode(
  election: ElectionLike
): { mode: 'auto' | 'manual'; override: ElectionStatus | null } {
  if (election.manualOverride) {
    return {
      mode: 'manual',
      override: election.manualOverride as ElectionStatus,
    }
  }
  return { mode: 'auto', override: null }
}

/**
 * Format a countdown to a future Date, e.g. "1d 5h 30m" or "2h 15m 10s".
 * Returns null if the target is in the past.
 */
export function formatCountdown(target: Date, now: Date = new Date()): string | null {
  const diff = target.getTime() - now.getTime()
  if (diff <= 0) return null

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  return `${minutes}m ${seconds}s`
}
