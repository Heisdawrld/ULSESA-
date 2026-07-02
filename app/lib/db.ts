import { createClient } from "@libsql/client";

let _db: ReturnType<typeof createClient> | null = null;

function getDb() {
  if (!_db) {
    _db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
  }
  return _db;
}

const db = {
  execute: (...args: Parameters<ReturnType<typeof createClient>["execute"]>) =>
    getDb().execute(...args),
  batch: (...args: Parameters<ReturnType<typeof createClient>["batch"]>) =>
    getDb().batch(...args),
  executeMultiple: (...args: Parameters<ReturnType<typeof createClient>["executeMultiple"]>) =>
    getDb().executeMultiple(...args),
};

export default db;
