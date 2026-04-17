'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CheckCircle, TrendingUp, Star } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import toast from 'react-hot-toast'
import api from '@/lib/api'

interface Sponsor {
  id: number
  name: string
  logo: string
  weekly_income: number
  requirement: string
  tier: string
  description: string
}

interface UserSponsor {
  sponsor_id: number
  sponsor: Sponsor
}

const tierColors: Record<string, string> = {
  BRONZE: 'text-[#CD7F32] bg-[#CD7F32]/10 border-[#CD7F32]/30',
  SILVER: 'text-[#C0C0C0] bg-[#C0C0C0]/10 border-[#C0C0C0]/30',
  GOLD: 'text-[#FFD700] bg-[#FFD700]/10 border-[#FFD700]/30',
}

export default function SponsorsPage() {
  const qc = useQueryClient()

  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ['sponsors'],
    queryFn: async () => {
      const res = await api.get('/sponsors')
      return res.data.data as Sponsor[]
    },
  })

  const { data: mySponsor } = useQuery({
    queryKey: ['my-sponsor'],
    queryFn: async () => {
      const res = await api.get('/sponsors/my')
      return res.data.data as UserSponsor | null
    },
  })

  const selectMutation = useMutation({
    mutationFn: (id: number) => api.post(`/sponsors/${id}/select`),
    onSuccess: (_, id) => {
      const s = sponsors.find(s => s.id === id)
      toast.success(`Sponsor "${s?.name}" gekozen!`)
      qc.invalidateQueries({ queryKey: ['my-sponsor'] })
    },
    onError: () => toast.error('Selecteren mislukt'),
  })

  const grouped = {
    BRONZE: sponsors.filter(s => s.tier === 'BRONZE'),
    SILVER: sponsors.filter(s => s.tier === 'SILVER'),
    GOLD: sponsors.filter(s => s.tier === 'GOLD'),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Sponsors</h1>
        <p className="text-gray-400 text-sm mt-1">Kies een sponsor en verdien wekelijks coins.</p>
        <p className="text-[10px] text-gray-600 mt-0.5">Coins zijn virtueel betaalmiddel en hebben geen geldwaarde.</p>
      </div>

      {mySponsor && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#00FF87]/10 border border-[#00FF87]/30 rounded-xl p-4 flex items-center gap-4"
        >
          <span className="text-3xl">{mySponsor.sponsor.logo}</span>
          <div className="flex-1">
            <p className="font-bold text-[#00FF87]">{mySponsor.sponsor.name}</p>
            <p className="text-sm text-gray-400">Jouw actieve sponsor · {mySponsor.sponsor.weekly_income} coins/week</p>
          </div>
          <CheckCircle className="w-5 h-5 text-[#00FF87]" />
        </motion.div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : (
        <>
          {(['BRONZE', 'SILVER', 'GOLD'] as const).map(tier => (
            grouped[tier].length > 0 && (
              <div key={tier}>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border mb-3 ${tierColors[tier]}`}>
                  <Star className="w-3 h-3" />
                  {tier}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {grouped[tier].map((sponsor, i) => {
                    const isActive = mySponsor?.sponsor_id === sponsor.id
                    return (
                      <motion.div
                        key={sponsor.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Card className={`p-5 transition-all ${isActive ? 'border-[#00FF87]/50 bg-[#00FF87]/5' : 'hover:border-[#1E2A45]'}`}>
                          <div className="flex items-start gap-3 mb-3">
                            <span className="text-3xl">{sponsor.logo}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-black text-base">{sponsor.name}</h3>
                                {isActive && <CheckCircle className="w-4 h-4 text-[#00FF87] flex-shrink-0" />}
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">{sponsor.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-3.5 h-3.5 text-[#00FF87]" />
                            <span className="text-sm font-bold text-[#00FF87]">{sponsor.weekly_income} coins/week</span>
                          </div>

                          <p className="text-xs text-gray-500 mb-4">
                            <span className="text-gray-400 font-medium">Vereiste: </span>
                            {sponsor.requirement}
                          </p>

                          <button
                            onClick={() => selectMutation.mutate(sponsor.id)}
                            disabled={isActive || selectMutation.isPending}
                            className={`w-full py-2 rounded-xl text-sm font-bold transition-all ${
                              isActive
                                ? 'bg-[#00FF87]/20 text-[#00FF87] cursor-default'
                                : 'bg-[#1E2A45] text-white hover:bg-[#2D3A55] active:scale-95'
                            }`}
                          >
                            {isActive ? 'Actief' : 'Kies sponsor'}
                          </button>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          ))}
        </>
      )}
    </div>
  )
}
