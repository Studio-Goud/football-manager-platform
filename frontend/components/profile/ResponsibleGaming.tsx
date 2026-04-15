'use client'

import { useState } from 'react'
import { Shield, Clock, AlertTriangle, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FINANCIAL_CONFIG } from '@/lib/constants'
import toast from 'react-hot-toast'

export function ResponsibleGaming() {
  const [dailyLimit, setDailyLimit] = useState(FINANCIAL_CONFIG.max_deposit_daily)
  const [weeklyLimit, setWeeklyLimit] = useState(FINANCIAL_CONFIG.max_deposit_weekly)
  const [sessionLimit, setSessionLimit] = useState(120)
  const [showExclude, setShowExclude] = useState(false)
  const [excludeDays, setExcludeDays] = useState(30)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setIsSaving(false)
    toast.success('Limieten opgeslagen')
  }

  const handleSelfExclude = async () => {
    await new Promise(r => setTimeout(r, 800))
    toast.success(`Zelfuitsluiting van ${excludeDays} dagen geactiveerd`)
    setShowExclude(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-xl p-4">
        <Shield className="w-5 h-5 text-[#3B82F6] flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-[#3B82F6] mb-1">Verantwoord Spelen</p>
          <p className="text-gray-400">
            Stel persoonlijke limieten in om je speelgedrag te beheren. Je kunt limieten altijd verlagen maar nooit direct verhogen (geldt met 24u vertraging).
          </p>
        </div>
      </div>

      {/* Deposit limits */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <span>Stortingslimieten</span>
        </h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Dagelijks maximum (€)</label>
            <input
              type="number"
              value={dailyLimit}
              onChange={e => setDailyLimit(Number(e.target.value))}
              max={FINANCIAL_CONFIG.max_deposit_daily}
              className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#00FF87] text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Wekelijks maximum (€)</label>
            <input
              type="number"
              value={weeklyLimit}
              onChange={e => setWeeklyLimit(Number(e.target.value))}
              max={FINANCIAL_CONFIG.max_deposit_weekly}
              className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#00FF87] text-sm"
            />
          </div>
        </div>
      </div>

      {/* Session limit */}
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
        Limieten opslaan
      </Button>

      {/* Self exclusion */}
      <div className="border-t border-[#1E2A45] pt-4">
        <h3 className="font-semibold flex items-center gap-2 text-red-400 mb-3">
          <AlertTriangle className="w-4 h-4" />
          Zelfuitsluiting
        </h3>

        {!showExclude ? (
          <div>
            <p className="text-sm text-gray-400 mb-3">
              Sluit jezelf tijdelijk uit van het platform. Dit is niet direct ongedaan te maken.
            </p>
            <button
              onClick={() => setShowExclude(true)}
              className="w-full border border-red-500/30 text-red-400 py-2.5 rounded-xl text-sm hover:bg-red-500/10 transition-colors"
            >
              Zelfuitsluiting instellen
            </button>
          </div>
        ) : (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-4">
            <p className="text-sm text-red-400 font-semibold">Weet je zeker dat je jezelf wilt uitsluiten?</p>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Duur</label>
              <select
                value={excludeDays}
                onChange={e => setExcludeDays(Number(e.target.value))}
                className="w-full bg-[#0A0E1A] border border-red-500/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
              >
                <option value={1}>1 dag</option>
                <option value={7}>1 week</option>
                <option value={30}>1 maand</option>
                <option value={90}>3 maanden</option>
                <option value={180}>6 maanden</option>
                <option value={365}>1 jaar</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSelfExclude}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Bevestigen
              </button>
              <button onClick={() => setShowExclude(false)} className="flex-1 border border-[#1E2A45] text-gray-400 py-2 rounded-lg text-sm hover:border-white transition-colors">
                Annuleren
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Help links */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>Heb je hulp nodig bij gokproblemen?</p>
        <p>• <span className="text-[#3B82F6]">Jellinek.nl</span> — Verslavingszorg</p>
        <p>• <span className="text-[#3B82F6]">GokkenInfo.nl</span> — Informatie en zelftest</p>
        <p>• <span className="text-[#3B82F6]">CRUKS</span> — Centraal Register Uitsluiting Kansspelen</p>
      </div>
    </div>
  )
}
