'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { Coins, Zap, Star, Crown } from 'lucide-react'
import toast from 'react-hot-toast'

const PACKAGES = [
  { id: 'starter', label: 'Starter',  price_eur: 5,  coins: 500,  bonus_pct: 0,  icon: Coins,  color: '#64748B' },
  { id: 'pro',     label: 'Pro',      price_eur: 10, coins: 1100, bonus_pct: 10, icon: Zap,    color: '#3B82F6' },
  { id: 'elite',   label: 'Elite',    price_eur: 25, coins: 3000, bonus_pct: 20, icon: Star,   color: '#8B5CF6' },
  { id: 'legend',  label: 'Legend',   price_eur: 50, coins: 6500, bonus_pct: 30, icon: Crown,  color: '#F59E0B' },
]

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { updateBalance } = useAuthStore()
  const [selected, setSelected] = useState(PACKAGES[1].id)
  const [step, setStep] = useState<'shop' | 'processing' | 'success'>('shop')
  const [purchased, setPurchased] = useState<typeof PACKAGES[0] | null>(null)

  const pkg = PACKAGES.find(p => p.id === selected)!

  const handleBuy = async () => {
    setStep('processing')
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ package_id: selected }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      // Update balance in store
      updateBalance(data.data.new_balance)
      setPurchased(pkg)
      setStep('success')
    } catch {
      toast.error('Aankoop mislukt, probeer opnieuw.')
      setStep('shop')
    }
  }

  const handleClose = () => {
    onClose()
    setTimeout(() => setStep('shop'), 300)
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Coins kopen">
      {step === 'shop' && (
        <div className="space-y-5">
          <p className="text-sm text-gray-400">
            Coins zijn intern betaalmiddel — niet inwisselbaar voor geld.
            Gebruik ze voor transfers, duels en power-ups.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {PACKAGES.map(p => {
              const Icon = p.icon
              const isActive = selected === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className={`relative p-4 rounded-xl border text-left transition-all ${
                    isActive ? 'border-[#00FF87] bg-[#00FF87]/5' : 'border-[#1E2A45] bg-[#0A0E1A] hover:border-[#2D3A55]'
                  }`}
                >
                  {p.bonus_pct > 0 && (
                    <span className="absolute top-2 right-2 text-xs bg-[#00FF87] text-[#0A0E1A] font-black px-1.5 py-0.5 rounded-full">
                      +{p.bonus_pct}%
                    </span>
                  )}
                  <Icon className="w-5 h-5 mb-2" style={{ color: p.color }} />
                  <p className="font-bold text-sm">{p.label}</p>
                  <p className="text-[#00FF87] font-black text-lg">{p.coins.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">coins</p>
                  <p className="text-xs text-gray-400 mt-1">€{p.price_eur}</p>
                </button>
              )
            })}
          </div>

          <div className="bg-[#0A0E1A] rounded-xl p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Pakket</span>
              <span>{pkg.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Coins</span>
              <span className="text-[#00FF87] font-bold">{pkg.coins.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-[#1E2A45] pt-2">
              <span>Prijs</span>
              <span>€{pkg.price_eur}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleBuy} className="flex-1">
              <Coins className="w-4 h-4 mr-2" />
              Kopen voor €{pkg.price_eur}
            </Button>
            <Button variant="ghost" onClick={handleClose} className="flex-1">Annuleren</Button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 border-4 border-[#00FF87] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-semibold">Verwerken...</p>
        </div>
      )}

      {step === 'success' && purchased && (
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 bg-[#00FF87]/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">✓</span>
          </div>
          <h3 className="text-xl font-bold">Gelukt!</h3>
          <p className="text-gray-400 text-sm">
            <span className="text-[#00FF87] font-black">{purchased.coins.toLocaleString()} coins</span> zijn toegevoegd aan je account.
          </p>
          <Button onClick={handleClose} className="w-full">Sluiten</Button>
        </div>
      )}
    </Modal>
  )
}
