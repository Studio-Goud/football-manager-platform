'use client'

import { useState } from 'react'
import { Shield, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

export function ResponsibleGaming() {
  const [sessionLimit, setSessionLimit] = useState(120)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise(r => setTimeout(r, 600))
    setIsSaving(false)
    toast.success('Instellingen opgeslagen')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 bg-[#00FF87]/5 border border-[#00FF87]/20 rounded-xl p-4">
        <Shield className="w-5 h-5 text-[#00FF87] flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-[#00FF87] mb-1">Verantwoord Spelen</p>
          <p className="text-gray-400">
            FootballManager Pro gebruikt alleen interne coins — geen echt geld, geen prijzenpotten.
            Stel een sessielimiet in als je speeltijd wilt beheren.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <Clock className="w-4 h-4 inline mr-1" />
          Sessie duur limiet: {sessionLimit} minuten
        </label>
        <input
          type="range"
          value={sessionLimit}
          onChange={e => setSessionLimit(Number(e.target.value))}
          min={30}
          max={480}
          step={30}
          className="w-full accent-[#00FF87]"
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>30 min</span>
          <span>8 uur</span>
        </div>
      </div>

      <Button onClick={handleSave} loading={isSaving} variant="secondary" className="w-full">
        Instellingen opslaan
      </Button>

      <div className="bg-[#0A0E1A] rounded-xl p-4 text-sm text-gray-400">
        <p className="font-medium text-white mb-2">Over coins</p>
        <ul className="space-y-1 text-xs">
          <li>• Coins zijn intern betaalmiddel, niet inwisselbaar voor geld</li>
          <li>• Geen kansspelelementen — puur skill en voetbalkennis</li>
          <li>• Geen leeftijdsverificatie of KYC vereist</li>
        </ul>
      </div>
    </div>
  )
}
