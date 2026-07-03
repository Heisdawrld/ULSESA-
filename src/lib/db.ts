import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: env vars MUST be read at CALL TIME, not at module-load time.
//
// Next.js evaluates API route modules during `next build` (for static
// generation / route registration). At that moment, Render's runtime env
// vars are NOT available. If we read them eagerly into module-level
// consts (e.g. `const TURSO_URL = process.env.DATABASE_URL`), the bundler
// can bake `undefined` into the built chunk — and that broken value
// persists into the running server, causing:
//   LibsqlError: URL_INVALID: The URL 'undefined' is not in a valid format
//
// By deferring every env read + client creation to first use (request
// time), we guarantee the values come from the live process environment.
// ─────────────────────────────────────────────────────────────────────────────

function getDatabaseUrl(): string | undefined {
  return (
    process.env.TURSO_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.LIBSQL_URL
  )
}

function getAuthToken(): string | undefined {
  return (
    process.env.TURSO_AUTH_TOKEN ||
    process.env.TURSO_TOKEN ||
    process.env.LIBSQL_AUTH_TOKEN
  )
}

function createPrismaClient(): PrismaClient {
  const url = getDatabaseUrl()
  const token = getAuthToken()

  // Production path: Turso (libsql://) — persistent hosted SQLite.
  // In @prisma/adapter-libsql v7, PrismaLibSql takes a Config object
  // ({ url, authToken }) directly — it creates the libsql client internally.
  if (url && url.startsWith('libsql://')) {
    if (!token) {
      console.error(
        '[db] FATAL: database URL is a libsql:// URL but the auth token is missing. ' +
          'Set TURSO_AUTH_TOKEN in your environment variables.'
      )
    }
    const adapter = new PrismaLibSql({ url, authToken: token })
    return new PrismaClient({ adapter })
  }

  // Development path: local SQLite file.
  if (url && url.startsWith('file:')) {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  }

  // No URL configured — throw with a clear, actionable message.
  throw new Error(
    '[db] No database URL configured. Set DATABASE_URL (or TURSO_DATABASE_URL) ' +
      'to a libsql:// URL and TURSO_AUTH_TOKEN in your environment.'
  )
}

// Lazy initialization — the PrismaClient is created on FIRST use, not at
// module-load time. See the note above about `next build` evaluation.
let _client: PrismaClient | undefined

function getClient(): PrismaClient {
  if (_client) return _client
  // Reuse a cached instance in dev to survive HMR.
  if (globalForPrisma.prisma) {
    _client = globalForPrisma.prisma
    return _client
  }
  _client = createPrismaClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = _client
  }
  return _client
}

// Proxy so `import { db }` keeps working everywhere without changing any
// route handler. Property access (e.g. `db.announcement.findMany()`)
// triggers lazy init on first use — always at request time, never at build.
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient()
    const value = Reflect.get(client, prop)
    // Bind methods so `this` is correct even if destructured.
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})

// Diagnostics — getters reflect the LIVE env state at access time, so the
// /api/health endpoint always reports what the running process actually sees.
export const dbConfig = {
  get hasUrl() {
    return Boolean(getDatabaseUrl())
  },
  get hasToken() {
    return Boolean(getAuthToken())
  },
  get isTurso() {
    const url = getDatabaseUrl()
    return Boolean(url && url.startsWith('libsql://'))
  },
  get isLocal() {
    const url = getDatabaseUrl()
    return Boolean(url && url.startsWith('file:'))
  },
}
