import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  // Read the Turso URL. Prefer TURSO_DATABASE_URL (the name used on Render),
  // but fall back to DATABASE_URL so the same code works anywhere.
  const databaseUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL

  // If the database URL is a Turso/libsql URL, use the libsql adapter
  // (this is for production — Render, etc. — where the filesystem is ephemeral)
  if (databaseUrl && databaseUrl.startsWith('libsql://')) {
    const libsql = createClient({
      url: databaseUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    const adapter = new PrismaLibSql(libsql)
    return new PrismaClient({ adapter })
  }

  // Otherwise, use local SQLite (development)
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
