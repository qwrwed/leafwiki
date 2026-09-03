import { usePrivacyBlurStore } from '@/features/privacyblur/privacyBlur'
import { useLayoutEffect } from 'react'

export default function useApplyPrivacyBlur() {
  const active = usePrivacyBlurStore((s) => s.active)

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('privacy-blur-active', active)
  }, [active])
}
