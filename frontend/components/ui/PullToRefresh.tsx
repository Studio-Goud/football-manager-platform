'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'

const THRESHOLD = 70 // px to pull before triggering

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only activate when scrolled to top
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startY.current === null || isRefreshing) return
    const delta = e.touches[0].clientY - startY.current
    if (delta > 0 && window.scrollY === 0) {
      e.preventDefault()
      setPullDistance(Math.min(delta * 0.5, THRESHOLD + 20))
    }
  }, [isRefreshing])

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(THRESHOLD)
      await queryClient.invalidateQueries()
      // Small delay so spinner is visible
      await new Promise(r => setTimeout(r, 600))
      setIsRefreshing(false)
    }
    setPullDistance(0)
    startY.current = null
  }, [pullDistance, isRefreshing, queryClient])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  const progress = Math.min(pullDistance / THRESHOLD, 1)
  const showIndicator = pullDistance > 8 || isRefreshing

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Pull indicator */}
      {showIndicator && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center"
          style={{
            top: Math.max(0, pullDistance - 40),
            opacity: progress,
            transition: isRefreshing ? 'none' : 'opacity 0.1s',
          }}
        >
          <div className="bg-[#0F1629] border border-[#1E2A45] rounded-full p-2 shadow-lg">
            <RefreshCw
              className="w-5 h-5 text-[#00FF87]"
              style={{
                transform: `rotate(${progress * 180}deg)`,
                animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none',
              }}
            />
          </div>
        </div>
      )}

      {/* Push content down while pulling */}
      <div
        style={{
          transform: `translateY(${isRefreshing ? THRESHOLD * 0.6 : pullDistance * 0.6}px)`,
          transition: pullDistance === 0 && !isRefreshing ? 'transform 0.3s ease' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}
