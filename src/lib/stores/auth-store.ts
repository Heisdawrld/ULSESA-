import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface StudentUser {
  id: string
  matricNumber: string
  fullName: string
  level: string
  programme: string
  email: string | null
  isVerified: boolean
  verificationStatus: string // pending, submitted, approved, rejected
  hasVoted?: boolean
}

export interface AdminUser {
  id: string
  username: string
  name: string
  role: string
}

interface AuthState {
  student: StudentUser | null
  admin: AdminUser | null
  studentToken: string | null
  adminToken: string | null
  setStudent: (student: StudentUser, token: string) => void
  setAdmin: (admin: AdminUser, token: string) => void
  logoutStudent: () => void
  logoutAdmin: () => void
  isAuthenticated: () => boolean
  isAdminAuthenticated: () => boolean
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      student: null,
      admin: null,
      studentToken: null,
      adminToken: null,
      setStudent: (student, token) => set({ student, studentToken: token }),
      setAdmin: (admin, token) => set({ admin, adminToken: token }),
      logoutStudent: () => set({ student: null, studentToken: null }),
      logoutAdmin: () => set({ admin: null, adminToken: null }),
      isAuthenticated: () => !!get().studentToken,
      isAdminAuthenticated: () => !!get().adminToken,
    }),
    {
      name: 'ddp-auth',
    }
  )
)
