// The zustand store for the privacy-blur toggle (blurs page titles/content
// so the screen isn't readable at a glance). State is persisted across
// sessions using localStorage.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type PrivacyBlurStore = {
  active: boolean
  setActive: (active: boolean) => void
  toggle: () => void
}

export const usePrivacyBlurStore = create<PrivacyBlurStore>()(
  persist(
    (set) => ({
      active: false,
      setActive: (active) => set({ active }),
      toggle: () => set((state) => ({ active: !state.active })),
    }),
    {
      name: 'leafwiki-privacy-blur',
    },
  ),
)
