'use client'

import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { POWERUP_CONFIG } from '@/lib/constants'
import { PowerupType } from '@/types'
import { Zap, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'

export default function PowerupsPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const balance = user?.balance_credits ?? 0

  const { data: userPowerups = [] } = useQuery({
    queryKey: ['powerups', 'my'],
    queryFn: async () => {
      const res = await api.get('/powerups/my')
      return res.data.data ?? []
    },
  })

  const buyMutation = useMutation({
    mutationFn: async (type: string) => {
      const res = await api.post('/powerups/buy', { type })
      return res.data.data
    },
    onSuccess: (_data, type) => {
      queryClient.invalidateQueries({ queryKey: ['powerups'] })
      queryClient.invalidateQueries({ queryKey: ['user'] })
      toast.success(`${POWERUP_CONFIG[type as PowerupType]?.name ?? type} gekocht!`)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Aankoop mislukt')
    },
  })

  const handlePurchase = (type: PowerupType) => {
    buyMutation.mutate(type.toLowerCase())
  }

  const availablePowerups = userPowerups.filter((p: { status: string }) => p.status === 'available')
  const usedPowerups = userPowerups.filter((p: { status: string }) => p.status === 'used' || p.status === 'expired')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Power-ups</h1>
          <p className="text-gray-400 text-sm mt-1">Versterk je team met strategische voordelen</p>
        </div>
        <div className="bg-[#0F1629] border border-[#1E2A45] rounded-xl px-4 py-2 text-center">
          <p className="text-xs text-gray-500">Saldo</p>
          <p className="font-black text-[#00FF87]">{balance.toFixed(1)} cr</p>
        </div>
      </div>

      {/* Shop */}
      <div>
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#FFD700]" />
          Power-up Shop
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Object.entries(POWERUP_CONFIG) as [PowerupType, typeof POWERUP_CONFIG[PowerupType]][]).map(([type, config]) => {
            const owned = userPowerups.filter((p: { type: string; status: string }) => p.type === type && p.status === 'available').length
            const canAfford = balance >= config.cost

            return (
              <motion.div
                key={type}
                whileHover={{ scale: 1.02 }}
                className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-5 flex flex-col hover:border-[#00FF87]/20 transition-all"
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4" style={{ background: `${config.color}20` }}>
                  {config.icon}
                </div>

                {/* Info */}
                <h3 className="font-bold mb-1">{config.name}</h3>
                <p className="text-sm text-gray-400 flex-1 mb-4">{config.description}</p>

                {/* Max per season */}
                <p className="text-xs text-gray-500 mb-3">Max {config.max_per_season}x per seizoen</p>

                {/* Owned */}
                {owned > 0 && (
                  <div className="flex items-center gap-1.5 bg-[#00FF87]/10 rounded-lg px-3 py-1.5 mb-3">
                    <span className="w-2 h-2 bg-[#00FF87] rounded-full" />
                    <span className="text-xs text-[#00FF87] font-medium">{owned}x beschikbaar</span>
                  </div>
                )}

                {/* Buy button */}
                <Button
                  onClick={() => handlePurchase(type)}
                  loading={buyMutation.isPending && buyMutation.variables === type.toLowerCase()}
                  disabled={!canAfford}
                  variant={canAfford ? 'primary' : 'ghost'}
                  className="w-full"
                >
                  {!canAfford
                    ? <><Lock className="w-3.5 h-3.5 mr-1" /> Niet genoeg credits</>
                    : `Kopen voor ${config.cost} cr`
                  }
                </Button>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* My inventory */}
      {availablePowerups.length > 0 && (
        <Card className="p-5">
          <h2 className="font-bold mb-4">Mijn Power-ups</h2>
          <div className="space-y-3">
            {availablePowerups.map((pu: { id: string; type: string; status: string }) => {
              const config = POWERUP_CONFIG[pu.type as PowerupType] ?? { name: pu.type, description: '', icon: '⚡', color: '#00FF87' }
              return (
                <div key={pu.id} className="flex items-center gap-4 bg-[#0A0E1A] rounded-xl p-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: `${config.color}20` }}>
                    {config.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{config.name}</p>
                    <p className="text-xs text-gray-500">{config.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-[#00FF87]/10 text-[#00FF87] px-2 py-0.5 rounded-full">Beschikbaar</span>
                    <button className="text-xs border border-[#00FF87]/30 text-[#00FF87] px-3 py-1 rounded-lg hover:bg-[#00FF87]/10 transition-colors">
                      Activeren
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Used power-ups */}
      {usedPowerups.length > 0 && (
        <Card className="p-5">
          <h2 className="font-bold mb-4 text-gray-400">Gebruikt</h2>
          <div className="space-y-2">
            {usedPowerups.map((pu: { id: string; type: string; status: string }) => {
              const config = POWERUP_CONFIG[pu.type as PowerupType] ?? { name: pu.type, icon: '⚡', color: '#666' }
              return (
                <div key={pu.id} className="flex items-center gap-3 bg-[#0A0E1A] rounded-xl p-3 opacity-50">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0 grayscale" style={{ background: `${config.color}20` }}>
                    {config.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{config.name}</p>
                  </div>
                  <span className="text-xs text-gray-600">{pu.status}</span>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
