import { createHash, randomBytes } from "crypto";
import db from "./db";

const SERVER_SECRET = process.env.VOTE_SECRET || "ulsesa-default-secret-change-me";

export interface VoteReceipt {
  token: string;
  voteId: string;
  positionId: string;
  candidateId: string;
  timestamp: Date;
  verificationUrl: string;
}

export interface VoteData {
  candidateId: string;
  positionId: string;
}

function generateVoteHash(
  voterId: string,
  candidateId: string,
  positionId: string
): string {
  const data = `${voterId}:${candidateId}:${positionId}:${SERVER_SECRET}`;
  return createHash("sha256").update(data).digest("hex");
}

function generateReceiptToken(): string {
  return randomBytes(32).toString("hex");
}

export async function castVotes(
  voterId: string,
  votes: VoteData[],
  electionId: string,
  metadata: { ip: string; userAgent: string }
): Promise<{ success: boolean; receipts: VoteReceipt[]; error?: string }> {
  try {
    const receipts: VoteReceipt[] = [];
    const now = new Date().toISOString();

    await db.execute({
      sql: `UPDATE users SET has_voted = 1, voted_at = ? WHERE id = ?`,
      args: [now, voterId],
    });

    for (const vote of votes) {
      const voteId = randomBytes(16).toString("hex");
      const voteHash = generateVoteHash(voterId, vote.candidateId, vote.positionId);
      const receiptToken = generateReceiptToken();

      await db.execute({
        sql: `INSERT INTO votes (id, voter_id, candidate_id, position_id, election_id, vote_hash, timestamp, ip_address, user_agent)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [voteId, voterId, vote.candidateId, vote.positionId, electionId, voteHash, now, metadata.ip, metadata.userAgent],
      });

      await db.execute({
        sql: `INSERT INTO vote_receipts (id, vote_id, receipt_token)
              VALUES (?, ?, ?)`,
        args: [randomBytes(16).toString("hex"), voteId, receiptToken],
      });

      receipts.push({
        token: receiptToken,
        voteId,
        positionId: vote.positionId,
        candidateId: vote.candidateId,
        timestamp: new Date(now),
        verificationUrl: `/vote/verify?token=${receiptToken}`,
      });
    }

    return { success: true, receipts };
  } catch (error) {
    console.error("Vote casting error:", error);
    return {
      success: false,
      receipts: [],
      error: error instanceof Error ? error.message : "Failed to cast votes",
    };
  }
}

export async function verifyVoteReceipt(token: string): Promise<{
  valid: boolean;
  vote?: {
    voteId: string;
    candidateId: string;
    positionId: string;
    electionId: string;
    timestamp: Date;
    hashValid: boolean;
  };
  error?: string;
}> {
  try {
    const result = await db.execute({
      sql: `SELECT vr.id as receipt_id, vr.receipt_token, vr.verified, vr.verified_at,
                    v.id as vote_id, v.candidate_id, v.position_id, v.election_id, v.timestamp, v.vote_hash, v.voter_id
             FROM vote_receipts vr
             JOIN votes v ON vr.vote_id = v.id
             WHERE vr.receipt_token = ?`,
      args: [token],
    });

    if (result.rows.length === 0) {
      return { valid: false, error: "Receipt not found" };
    }

    const row = result.rows[0];
    const expectedHash = generateVoteHash(
      row.voter_id as string,
      row.candidate_id as string,
      row.position_id as string
    );

    const hashValid = row.vote_hash === expectedHash;

    await db.execute({
      sql: `UPDATE vote_receipts SET verified = 1, verified_at = ? WHERE receipt_token = ?`,
      args: [new Date().toISOString(), token],
    });

    return {
      valid: hashValid,
      vote: {
        voteId: row.vote_id as string,
        candidateId: row.candidate_id as string,
        positionId: row.position_id as string,
        electionId: row.election_id as string,
        timestamp: new Date(row.timestamp as string),
        hashValid,
      },
    };
  } catch (error) {
    console.error("Receipt verification error:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

export async function getElectionResults(electionId: string): Promise<{
  success: boolean;
  results?: Array<{
    positionId: string;
    positionTitle: string;
    candidates: Array<{
      candidateId: string;
      candidateName: string;
      voteCount: number;
      percentage: number;
    }>;
  }>;
  totalVoters: number;
}> {
  try {
    const positionsResult = await db.execute({
      sql: `SELECT p.id, p.title, p.max_votes
            FROM positions p
            WHERE p.election_id = ?
            ORDER BY p.display_order`,
      args: [electionId],
    });

    const votersResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM users WHERE verification_status IN ('ai_verified', 'manual_approved')`,
      args: [],
    });

    const totalVoters = (votersResult.rows[0]?.count as number) || 0;
    const results: Array<{
      positionId: string;
      positionTitle: string;
      candidates: Array<{
        candidateId: string;
        candidateName: string;
        voteCount: number;
        percentage: number;
      }>;
    }> = [];

    for (const position of positionsResult.rows) {
      const votesResult = await db.execute({
        sql: `SELECT c.id as candidate_id, c.user_id, u.name as candidate_name, COUNT(v.id) as vote_count
              FROM candidates c
              JOIN users u ON c.user_id = u.id
              LEFT JOIN votes v ON v.candidate_id = c.id
              WHERE c.position_id = ? AND c.election_id = ? AND c.status = 'approved'
              GROUP BY c.id, c.user_id, u.name
              ORDER BY vote_count DESC`,
        args: [position.id, electionId],
      });

      const totalVotesForPosition = votesResult.rows.reduce(
        (sum, row) => sum + (Number(row.vote_count) || 0),
        0
      );

      results.push({
        positionId: position.id as string,
        positionTitle: position.title as string,
        candidates: votesResult.rows.map((row) => ({
          candidateId: row.candidate_id as string,
          candidateName: row.candidate_name as string,
          voteCount: Number(row.vote_count) || 0,
          percentage:
            totalVotesForPosition > 0
              ? Math.round(((Number(row.vote_count) || 0) / totalVotesForPosition) * 100)
              : 0,
        })),
      });
    }

    return { success: true, results, totalVoters };
  } catch (error) {
    console.error("Results retrieval error:", error);
    return { success: false, totalVoters: 0 };
  }
}
