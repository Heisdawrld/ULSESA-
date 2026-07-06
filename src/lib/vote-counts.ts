import { db } from '@/lib/db'

/**
 * Recompute `Candidate.voteCount` for every candidate in an election from the
 * actual `Vote` rows.
 *
 * WHY THIS EXISTS:
 *   `Candidate.voteCount` is a denormalized counter — incremented by +1 inside
 *   the vote-casting transaction (`/api/elections/vote`). It is NOT decremented
 *   when a `Vote` row is deleted (e.g. via the cascade-delete that happens when
 *   a fraudulent `Student` is revoked through the disputes panel). Without
 *   recomputation, the public Results page (which reads `voteCount`) would
 *   show inflated tallies and potentially announce the wrong winner.
 *
 * CALL AFTER any path that deletes Vote rows:
 *   - `/api/admin/disputes` revoke flow (cascade-deletes the accused student's votes)
 *   - future: a vote-nullify endpoint (if added)
 *
 * @param electionId  The election whose candidates should be recomputed.
 * @returns           The number of candidates whose voteCount was refreshed.
 */
export async function recomputeElectionVoteCounts(
  electionId: string
): Promise<number> {
  // Pull every position → candidate in this election, with a live count of
  // their Vote rows. We use _count (a real aggregate) rather than trusting
  // the stored voteCount field.
  const positions = await db.position.findMany({
    where: { electionId },
    select: {
      id: true,
      candidates: {
        select: {
          id: true,
          _count: { select: { votes: true } },
        },
      },
    },
  })

  const candidates = positions.flatMap((p) =>
    p.candidates.map((c) => ({
      id: c.id,
      liveCount: c._count.votes,
    }))
  )

  if (candidates.length === 0) return 0

  // Batch-update every candidate's voteCount in a single transaction so the
  // public results stay consistent (no half-updated state visible mid-flight).
  await db.$transaction(
    candidates.map((c) =>
      db.candidate.update({
        where: { id: c.id },
        data: { voteCount: c.liveCount },
      })
    )
  )

  return candidates.length
}

/**
 * Convenience: recompute vote counts for multiple elections in parallel.
 * Useful when a student voted across several elections before being revoked.
 */
export async function recomputeManyElectionVoteCounts(
  electionIds: string[]
): Promise<number> {
  const unique = [...new Set(electionIds)]
  const results = await Promise.all(
    unique.map((id) => recomputeElectionVoteCounts(id))
  )
  return results.reduce((sum, n) => sum + n, 0)
}
