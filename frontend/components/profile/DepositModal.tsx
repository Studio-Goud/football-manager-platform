'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useWallet } from '@/hooks/useWallet'
import { FINANCIAL_CONFIG } from '@/lib/constants'
import { CreditCard, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

const presets = [5, 10, 20, 50, 100]

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { deposit, isDepositing } = useWallet()
  const [amount, setAmount] = useState(20)
  const [step, setStep] = useState<'amount' | 'payment' | 'success'>('amount')

  const handleConfirm = async () => {
    if (amount < FINANCIAL_CONFIG.min_deposit) {
      toast.error(`Minimale storting €${FINANCIAL_CONFIG.min_deposit}`)
      return
    }
    try {
      setStep('payment')
      await new Promise(r => setTimeout(r, 1500))
      setStep('success')
    } catch {
      setStep('amount')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setStep('amount') }} title="Credits storten">
      {step === 'amount' && (
        <div className="space-y-5">
          <p className="text-sm text-gray-400">Credits worden 1:1 omgezet naar euro's. Minimale storting €{FINANCIAL_CONFIG.min_deposit}.</p>

          {/* Preset amounts */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Selecteer bedrag</label>
            <div className="grid grid-cols-5 gap-2">
              {presets.map(p => (
                <button
                  key={p}
                  onClick={() => setAmount(p)}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                    amount === p ? 'bg-[#00FF87] text-[#0A0E1A]' : 'bg-[#1E2A45] text-gray-300 hover:bg-[#2D3A55]'
                  }`}
                >
                  €{p}
                </button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Of voer bedrag in</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">€</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                min={FINANCIAL_CONFIG.min_deposit}
                max={FINANCIAL_CONFIG.max_deposit_daily}
                className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-[#00FF87]"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-[#0A0E1A] rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Storting</span>
              <span>€{amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Verwerkingstijd</span>
              <span>Direct</span>
            </div>
            <div className="flex justify-between font-bold border-t border-[#1E2A45] pt-2">
              <span>Credits ontvangen</span>
              <span className="text-[#00FF87]">{amount} cr</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Shield className="w-3.5 h-3.5" />
            <span>Betaling verwerkt via Adyen · SSL beveiligd · Daglijmiet €{FINANCIAL_CONFIG.max_deposit_daily}</span>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleConfirm} isLoading={isDepositing} className="flex-1">
              <CreditCard className="w-4 h-4 mr-2" />
              Betalen
            </Button>
            <Button variant="ghost" onClick={onClose} className="flex-1">Annuleren</Button>
          </div>
        </div>
      )}

      {step === 'payment' && (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 border-4 border-[#00FF87] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-semibold">Betaling verwerken...</p>
          <p className="text-sm text-gray-400">Even wachten terwijl we je betaling verwerken</p>
        </div>
      )}

      {step === 'success' && (
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 bg-[#00FF87]/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">✓</span>
          </div>
          <h3 className="text-xl font-bold">Betaling geslaagd!</h3>
          <p className="text-gray-400 text-sm">{amount} credits zijn toegevoegd aan je account.</p>
          <Button onClick={() => { onClose(); setStep('amount') }} className="w-full">Sluiten</Button>
        </div>
      )}
    </Modal>
  )
}
