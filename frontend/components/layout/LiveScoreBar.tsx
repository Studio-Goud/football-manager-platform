'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Radio, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLive } from '@/hooks/useLive'
import Link from 'next/link'

interface LiveMatch {
  id: string
  home_team: string
  away_team: string
  home_score?: number
  away_score?: number
  minute?: number
  status: string
}

function MatchPill({ match, highlight }: { match: LiveMatch; highlight: boolean }) {
  return (
    <motion.div
      animate={highlight ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 0.4 }}
      className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
        highlight
          ? 'bg-[#00FF87]/20 border border-[#00FF87]/40 text-[#00FF87]'
          : 'bg-[#162040] border border-[#1E2A45] text-gray-300'
      }`}
    >
      <span className="font-semibold truncate max-w-[60px]">
        {match.home_team.split(' ').slice(-1)[0]}
      </span>
      <span className={`font-black px-1 ${highlight ? 'text-[#00FF87]' : 'text-white'}`}>
        {match.home_score ?? 0}–{match.away_score ?? 0}
      </span>
      <span className="font-semibold truncate max-w-[60px]">
        {match.away_team.split(' ').slice(-1)[0]}
      </span>
      {match.minute && (
        <span className="text-[10px] text-gray-500 font-normal">{match.minute}'</span>
      )}
    </motion.div>
  )
}

export function LiveScoreBar() {
  const { matches } = useLive()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const prevScores = useRef<Record<string, { h: number; a: number }>>({})

  const liveMatches = matches.filter(m => {
    const s = (m.status as string).toLowerCase()
    return s === 'live' || s === 'half_time'
  })

  // Detect score changes → flash highlight
  useEffect(() => {
    liveMatches.forEach(m => {
      const prev = prevScores.current[m.id]
      const h = m.home_score ?? 0
      const a = m.away_score ?? 0
      if (prev && (prev.h !== h || prev.a !== a)) {
        setHighlightId(m.id)
        setTimeout(() => setHighlightId(null), 2500)
      }
      prevScores.current[m.id] = { h, a }
    })
  }, [liveMatches])

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' })
    }
  }

  if (liveMatches.length === 0) return null

  return (
    <div className="bg-[#0F1629]/90 backdrop-blur-sm border-b border-[#1E2A45] px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        {/* LIVE badge */}
        <Link href="/live" className="flex-shrink-0 flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-red-400" />
          <span className="text-[10px] font-black text-red-400 tracking-widest">LIVE</span>
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
        </Link>

        {/* Scroll left */}
        <button onClick={() => scroll('left')} className="flex-shrink-0 p-1 text-gray-500 hover:text-white">
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scrollable match pills */}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide flex-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {liveMatches.map(m => (
            <MatchPill key={m.id} match={m as LiveMatch} highlight={highlightId === m.id} />
          ))}
        </div>

        {/* Scroll right */}
        <button onClick={() => scroll('right')} className="flex-shrink-0 p-1 text-gray-500 hover:text-white">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
