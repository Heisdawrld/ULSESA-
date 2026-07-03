import { NextResponse } from 'next/server'
import { db, dbConfig } from '@/lib/db'

// Health check endpoint — verifies database connectivity.
// Does NOT leak secrets. Returns only connection status + env var presence.
export async function GET() {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: {
      configured: dbConfig.hasUrl,
      type: dbConfig.isTurso ? 'turso' : dbConfig.isLocal ? 'sqlite' : 'none',
      hasAuthToken: dbConfig.hasToken,
    },
    email: {
      configured: Boolean(
        process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ),
      host: process.env.SMTP_HOST ? 'set' : 'not set',
    },
    auth: {
      jwtConfigured: Boolean(process.env.JWT_SECRET),
      adminConfigured: Boolean(
        process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD
      ),
    },
  }

  // Test actual DB connectivity
  let dbConnected = false
  let dbError: string | undefined
  try {
    // A lightweight query — just count students
    await db.student.count()
    dbConnected = true
  } catch (error) {
    dbError = error instanceof Error ? error.message : String(error)
  }

  checks.database = {
    ...checks.database,
    connected: dbConnected,
    ...(dbError ? { error: dbError } : {}),
  }

  const status = dbConnected ? 'ok' : 'degraded'
  const httpStatus = dbConnected ? 200 : 503

  return NextResponse.json({ status, checks }, { status: httpStatus })
}
