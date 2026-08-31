import { useIsMobile } from '@/lib/useIsMobile'
import { useSidebarStore } from '@/stores/sidebar'
import { useEffect, useRef } from 'react'

// how close to the left edge a touch must start to be considered an edge swipe
const EDGE_ZONE_WIDTH = 24
// how far right the touch must travel before we open the sidebar
const OPEN_THRESHOLD = 60
// if vertical movement exceeds this before the horizontal threshold is hit,
// treat it as a scroll instead of a swipe
const VERTICAL_CANCEL_THRESHOLD = 30

export function useSwipeToOpenSidebar() {
  const isMobile = useIsMobile()
  const sidebarVisible = useSidebarStore((s) => s.sidebarVisible)
  const setSidebarVisible = useSidebarStore((s) => s.setSidebarVisible)

  const trackingRef = useRef(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)

  useEffect(() => {
    if (!isMobile || sidebarVisible) return

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!touch || touch.clientX > EDGE_ZONE_WIDTH) return

      trackingRef.current = true
      startXRef.current = touch.clientX
      startYRef.current = touch.clientY
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!trackingRef.current) return

      const touch = e.touches[0]
      if (!touch) return

      const deltaX = touch.clientX - startXRef.current
      const deltaY = touch.clientY - startYRef.current

      if (Math.abs(deltaY) > VERTICAL_CANCEL_THRESHOLD) {
        trackingRef.current = false
        return
      }

      if (deltaX > OPEN_THRESHOLD) {
        trackingRef.current = false
        setSidebarVisible(true)
      }
    }

    const onTouchEnd = () => {
      trackingRef.current = false
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    document.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [isMobile, sidebarVisible, setSidebarVisible])
}
