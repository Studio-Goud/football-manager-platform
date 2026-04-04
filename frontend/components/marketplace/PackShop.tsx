'use client'

import { useState } from 'react'
import { PACK_CONFIG } from '@/lib/constants'
import { PackType } from '@/types'
import { Button } from '@/components/ui/Button'
import { Package, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export function PackShop() {
  const [opening, setOpening] = useState<PackType | null>(null)
  const [revealedPlayers, setRevealedPlayers] = useState<string[]>([])

  const handleOpenPack = async (type: PackType) => {
    setOpening(type)
    await new Promise(r => setTimeout(r, 1500))
    // Mock revealed players
    const mockNames = ['E. Haaland', 'M. Salah', 'K. De Bruyne', 'B. Saka', 'J. Gakpo', 'V. van Dijk', 'A. Rüdiger', 'T. Alexander-Arnold']
    const count = PACK_CONFIG[type].players_count
    setRevealedPlayers(mockNames.slice(0, count))
    setOpening(null)
    toast.success(`${PACK_CONFIG[type].name} geopend!`)
  }

  if (revealedPlayers.length > 0) {
    return (
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-center">Jouw spelers!</h3>
        <div className="grid grid-cols-2 gap-3">
          {revealedPlayers.map((name, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.5, rotateY: 180 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ delay: i * 0.15, duration: 0.4 }}
              className="bg-gradient-to-br from-[#1E2A45] to-[#0F1629] border border-[#00FF87]/30 rounded-xl p-3 text-center"
            >
              <div className="w-12 h-12 bg-[#00FF87]/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Star className="w-6 h-6 text-[#00FF87]" />
              </div>
              <p className="font-bold text-sm">{name}</p>
            </motion.div>
          ))}
        </div>
        <Button onClick={() => setRevealedPlayers([])} variant="secondary" className="w-full">
          Meer packs kopen
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h3 className="font-bold text-lg">Pack Shop</h3>
        <p className="text-sm text-gray-400">Koop bundels en versterk je team</p>
      </div>

      {(Object.entries(PACK_CONFIG) as [PackType, typeof PACK_CONFIG[PackType]][]).map(([type, config]) => (
        <div key={type} className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-4 hover:border-[#00FF87]/20 transition-all">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${config.color}20` }}>
              <Package className="w-6 h-6" style={{ color: config.color }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold">{config.name}</h4>
                <span className="font-black text-[#00FF87]">{config.price} cr</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{config.description}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs bg-[#1E2A45] px-2 py-0.5 rounded-full">{config.players_count} spelers</span>
                <span className="text-xs" style={{ color: config.color }}>✓ {config.guaranteed}</span>
              </div>
            </div>
          </div>
          <Button
            onClick={() => handleOpenPack(type)}
            isLoading={opening === type}
            className="w-full mt-3 text-sm"
            variant={type === 'elite' ? 'primary' : 'secondary'}
          >
            {opening === type ? 'Openen...' : `Open ${config.name}`}
          </Button>
        </div>
      ))}
    </div>
  )
}
