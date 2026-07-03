import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type View =
  | 'home'
  | 'auth'
  | 'dashboard'
  | 'elections'
  | 'academics'
  | 'community'
  | 'resources'
  | 'about'
  | 'help'
  | 'admin'

interface NavState {
  view: View
  subview: string | null
  setView: (view: View, subview?: string | null) => void
  navigate: (view: View, subview?: string | null) => void
}

export const useNav = create<NavState>()(
  persist(
    (set) => ({
      view: 'home',
      subview: null,
      setView: (view, subview = null) => set({ view, subview }),
      navigate: (view, subview = null) => {
        set({ view, subview })
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      },
    }),
    {
      name: 'ddp-nav',
      partialize: (state) => ({ view: state.view, subview: state.subview }),
    }
  )
)
