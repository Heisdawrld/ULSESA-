import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Read the Turso URL from any of these env vars (different hosts name it differently).
// On Render, set TURSO_DATABASE_URL. Locally, DATABASE_URL is used for SQLite.
const TURSO_URL =
  process.env.TURSO_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.LIBSQL_URL

const TURSO_TOKEN =
  process.env.TURSO_AUTH_TOKEN ||
  process.env.TURSO_TOKEN ||
  process.env.LIBSQL_AUTH_TOKEN

function createPrismaClient(): PrismaClient {
  // Production path: Turso (libsql://) — persistent hosted SQLite.
  if (TURSO_URL && TURSO_URL.startsWith('libsql://')) {
    if (!TURSO_TOKEN) {
      console.error(
        '[db] FATAL: TURSO_DATABASE_URL is set but TURSO_AUTH_TOKEN is missing. ' +
          'Set both in your Render environment variables.'
      )
    }
    const libsql = createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN,
    })
    const adapter = new PrismaLibSql(libsql)
    return new PrismaClient({ adapter })
  }

  // Development path: local SQLite file.
  if (TURSO_URL && TURSO_URL.startsWith('file:')) {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  }

  // No database URL at all — fail fast with a clear, actionable message
  // instead of a cryptic Prisma URL_INVALID error at query time.
  const msg =
    '\n[db] FATAL: No database URL configured.\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'Set these environment variables on Render (Dashboard → Environment):\n' +
    '  TURSO_DATABASE_URL = libsql://ulsesa-dawrld.aws-us-west-2.turso.io\n' +
    '  TURSO_AUTH_TOKEN   = <your Turso auth token>\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'For local dev, set DATABASE_URL="file:./db/custom.db" in .env\n'
  console.error(msg)
  throw new Error('Database URL not configured. See server logs for instructions.')
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Export the resolved config for diagnostics (no secrets leaked)
export const dbConfig = {
  hasUrl: Boolean(TURSO_URL),
  hasToken: Boolean(TURSO_TOKEN),
  isTurso: Boolean(TURSO_URL && TURSO_URL.startsWith('libsql://')),
  isLocal: Boolean(TURSO_URL && TURSO_URL.startsWith('file:')),
}
