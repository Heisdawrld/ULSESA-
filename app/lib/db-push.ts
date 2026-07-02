import dotenv from "dotenv";
import { config } from "dotenv";
import { existsSync } from "fs";
import { join } from "path";

const candidates = [".env.local", ".env"];
for (const file of candidates) {
  const path = join(process.cwd(), file);
  if (existsSync(path)) {
    config({ path });
    break;
  }
}
import db from "./db";

async function migrate() {
  console.log("Running comprehensive database migration...");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      matric TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      profile_photo_url TEXT,
      biodata_document_url TEXT,
      verification_status TEXT DEFAULT 'pending',
      ai_confidence_score REAL,
      verified_at TEXT,
      verified_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_departments (
      user_id TEXT NOT NULL,
      department_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      election_year INTEGER,
      joined_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY(user_id, department_id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      membership_number TEXT UNIQUE,
      membership_card_url TEXT,
      join_date TEXT,
      membership_status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS elections (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      election_type TEXT DEFAULT 'department',
      department_id TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      require_verification INTEGER DEFAULT 1,
      allow_proxy_voting INTEGER DEFAULT 0,
      results_public INTEGER DEFAULT 1,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS positions (
      id TEXT PRIMARY KEY,
      election_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      max_votes INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      FOREIGN KEY (election_id) REFERENCES elections(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      position_id TEXT NOT NULL,
      election_id TEXT NOT NULL,
      manifesto TEXT,
      photo_url TEXT,
      status TEXT DEFAULT 'pending',
      approved_by TEXT,
      approved_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (position_id) REFERENCES positions(id),
      FOREIGN KEY (election_id) REFERENCES elections(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      voter_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      position_id TEXT NOT NULL,
      election_id TEXT NOT NULL,
      vote_hash TEXT NOT NULL,
      timestamp TEXT DEFAULT (datetime('now')),
      ip_address TEXT,
      user_agent TEXT,
      FOREIGN KEY (voter_id) REFERENCES users(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id),
      FOREIGN KEY (position_id) REFERENCES positions(id),
      FOREIGN KEY (election_id) REFERENCES elections(id),
      UNIQUE(voter_id, position_id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS vote_receipts (
      id TEXT PRIMARY KEY,
      vote_id TEXT NOT NULL,
      receipt_token TEXT UNIQUE NOT NULL,
      verified INTEGER DEFAULT 0,
      verified_at TEXT,
      FOREIGN KEY (vote_id) REFERENCES votes(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS blockchain_anchors (
      id TEXT PRIMARY KEY,
      election_id TEXT NOT NULL,
      block_hash TEXT,
      anchor_tx_id TEXT,
      vote_batch_hash TEXT,
      anchored_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (election_id) REFERENCES elections(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      author_id TEXT,
      published INTEGER DEFAULT 0,
      published_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      event_date TEXT,
      location TEXT,
      organizer_id TEXT,
      rsvp_required INTEGER DEFAULT 0,
      max_rsvp INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS event_rsvps (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'going',
      rsvp_at TEXT DEFAULT (datetime('now')),
      UNIQUE(event_id, user_id),
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      role TEXT DEFAULT 'admin',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS verification_queue (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      document_url TEXT NOT NULL,
      extracted_data TEXT,
      confidence_score REAL,
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at TEXT,
      review_notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS otp_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  console.log("Migration complete!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
