'use client'

import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { Zap } from 'lucide-react'

interface LivePointsProps {
  points: number
  rank?: number
  prizeEstimate?: number
}

export function LivePoints({ points, rank, prizeEstimate }: LivePointsProps) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, Math.round)
  const prevPoints = useRef(0)

  useEffect(() => {
    const controls = animate(count, points, { duration: 0.8, ease: 'easeOut' })
    prevPoints.current = points
    return controls.stop
  }, [points, count])

  return (
    <div className="bg-gradient-to-br from-[#0F1629] to-[#0A0E1A] border border-[#00FF87]/30 rounded-2xl p-6 text-center">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Zap className="w-5 h-5 text-[#00FF87]" />
        <span className="text-sm font-medium text-gray-400">Live Punten</span>
        <span className="w-2 h-2 bg-[#00FF87] rounded-full animate-pulse" />
      </div>

      <motion.div className="text-5xl font-black text-[#00FF87] tabular-nums">
        {rounded}
      </motion.div>
      <p className="text-gray-500 text-xs mt-1">punten dit speelronde</p>

      {rank && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-[#0A0E1A] rounded-xl p-3">
            <p className="text-lg font-black">#{rank}</p>
            <p className="text-xs text-gray-500">Live rang</p>
          </div>
          {prizeEstimate && (
            <div className="bg-[#0A0E1A] rounded-xl p-3">
              <p className="text-lg font-black text-[#00FF87]">€{prizeEstimate}</p>
              <p className="text-xs text-gray-500">Geschatte prijs</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
