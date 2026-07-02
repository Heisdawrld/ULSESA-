import "dotenv/config";
import { config } from "dotenv";
import { existsSync } from "fs";
import { join } from "path";
import { createClient } from "@libsql/client";

const candidates = [".env.local", ".env"];
for (const file of candidates) {
  const path = join(process.cwd(), file);
  if (existsSync(path)) {
    config({ path });
    break;
  }
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function seed() {
  console.log("Seeding test data...\n");

  // 1. Add voter
  const voterId = crypto.randomUUID();
  await db.execute({
    sql: `INSERT OR IGNORE INTO voters (id, matric, name, email, cohort) VALUES (?, ?, ?, ?, ?)`,
    args: [voterId, "230315011", "Chukwunenye David Chimaeze", "230315011@live.unilag.edu.ng", "2023"],
  });
  console.log("Voter added: Chukwunenye David Chimaeze (230315011)");

  // 2. Create election
  const electionId = crypto.randomUUID();
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  await db.execute({
    sql: `INSERT OR IGNORE INTO elections (id, title, description, start_time, end_time, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
    args: [
      electionId,
      "ULSESA 2026 Election",
      "Science Education Department Executive Election",
      now.toISOString(),
      tomorrow.toISOString(),
    ],
  });
  console.log("Election created: ULSESA 2026 Election (ACTIVE)");

  // 3. Create positions
  const positions = ["President", "Secretary", "Treasurer", "PRO", "Welfare Director"];
  const positionIds: string[] = [];

  for (let i = 0; i < positions.length; i++) {
    const posId = crypto.randomUUID();
    positionIds.push(posId);
    await db.execute({
      sql: `INSERT OR IGNORE INTO positions (id, title, election_id, display_order) VALUES (?, ?, ?, ?)`,
      args: [posId, positions[i], electionId, i + 1],
    });
  }
  console.log(`Positions created: ${positions.join(", ")}`);

  // 4. Create candidates for each position
  const candidatesData: Record<string, string[]> = {
    President: ["Adebayo Johnson", "Fatima Abdulahi", "Emeka Okonkwo"],
    Secretary: ["Blessing Eze", "Yusuf Abdullahi"],
    Treasurer: ["Grace Nnamdi", "Oluwaseun Adeyemi"],
    PRO: ["Chidinma Okafor", "Ibrahim Musa"],
    "Welfare Director": ["Amara Obi", "Tunde Bakare"],
  };

  let totalCandidates = 0;
  for (let i = 0; i < positions.length; i++) {
    const posCandidates = candidatesData[positions[i]];
    for (const name of posCandidates) {
      const candId = crypto.randomUUID();
      await db.execute({
        sql: `INSERT OR IGNORE INTO candidates (id, name, position_id, election_id, image_url, bio) VALUES (?, ?, ?, ?, '', '')`,
        args: [candId, name, positionIds[i], electionId],
      });
      totalCandidates++;
    }
  }
  console.log(`Candidates created: ${totalCandidates}\n`);
  console.log("========================================");
  console.log("TEST READY!");
  console.log("Matric: 230315011");
  console.log("Name:   Chukwunenye David Chimaeze");
  console.log("Election: ULSESA 2026 Election (ACTIVE)");
  console.log("========================================");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
