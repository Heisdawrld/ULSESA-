import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies, headers } from 'next/headers'
import { db } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'ulse-sa-election-2026-dev'

export interface StudentTokenPayload {
  studentId: string
  matricNumber: string
  type: 'student'
}

export interface AdminTokenPayload {
  adminId: string
  username: string
  type: 'admin'
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signStudentToken(payload: StudentTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

export function verifyToken<T = unknown>(token: string): T | null {
  try {
    return jwt.verify(token, JWT_SECRET) as T
  } catch {
    return null
  }
}

export async function getStudentFromToken(): Promise<{
  id: string
  matricNumber: string
} | null> {
  // Check cookie first
  const cookieStore = await cookies()
  let token = cookieStore.get('ddp-student-token')?.value

  // Fallback to x-student-token header (used by client-side api-client)
  if (!token) {
    const headerStore = await headers()
    token = headerStore.get('x-student-token') || undefined
  }

  if (!token) return null
  const payload = verifyToken<StudentTokenPayload>(token)
  if (!payload || payload.type !== 'student') return null
  return { id: payload.studentId, matricNumber: payload.matricNumber }
}

export async function getAdminFromToken(): Promise<{
  id: string
  username: string
} | null> {
  // Check cookie first
  const cookieStore = await cookies()
  let token = cookieStore.get('ddp-admin-token')?.value

  // Fallback to x-admin-token header (used by client-side api-client)
  if (!token) {
    const headerStore = await headers()
    token = headerStore.get('x-admin-token') || undefined
  }

  if (!token) return null
  const payload = verifyToken<AdminTokenPayload>(token)
  if (!payload || payload.type !== 'admin') return null
  return { id: payload.adminId, username: payload.username }
}

export async function getCurrentStudent() {
  const session = await getStudentFromToken()
  if (!session) return null
  const student = await db.student.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      matricNumber: true,
      fullName: true,
      level: true,
      programme: true,
      email: true,
      phone: true,
      isVerified: true,
      verificationStatus: true,
      hasVoted: true,
    },
  })
  return student
}

export async function getCurrentAdmin() {
  const session = await getAdminFromToken()
  if (!session) return null
  const admin = await db.admin.findUnique({
    where: { id: session.id },
    select: { id: true, username: true, name: true, role: true },
  })
  return admin
}

// OTP generation
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
