'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useWallet } from '@/hooks/useWallet'
import { useAuthStore } from '@/store/authStore'
import { FINANCIAL_CONFIG } from '@/lib/constants'
import { AlertTriangle, Banknote } from 'lucide-react'

interface WithdrawModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
  const { withdraw, isWithdrawing } = useWallet()
  const { user } = useAuthStore()
  const [amount, setAmount] = useState(10)
  const [iban, setIban] = useState('')
  const seasonActive = true // mock — would come from season state

  const penalty = seasonActive ? amount * FINANCIAL_CONFIG.early_withdrawal_penalty : 0
  const youReceive = amount - penalty

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Credits opnemen">
      <div className="space-y-5">
        {seasonActive && (
          <div className="bg-[#F97316]/10 border border-[#F97316]/30 rounded-xl p-3 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-[#F97316] flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-[#F97316]">Seizoen is actief</p>
              <p className="text-gray-400 mt-0.5">Vroeg opnemen kost {FINANCIAL_CONFIG.early_withdrawal_penalty * 100}% boete. Je ontvangt {(1 - FINANCIAL_CONFIG.early_withdrawal_penalty) * 100}% van het gevraagde bedrag.</p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Bedrag (credits) · Beschikbaar: {user?.balance_credits?.toFixed(1) ?? '0'} cr
          </label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            min={FINANCIAL_CONFIG.min_withdrawal}
            max={user?.balance_credits ?? 0}
            className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF87]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">IBAN rekeningnummer</label>
          <input
            type="text"
            value={iban}
            onChange={e => setIban(e.target.value.toUpperCase())}
            placeholder="NL91 ABNA 0417 1643 00"
            className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87] font-mono text-sm"
          />
        </div>

        {/* Breakdown */}
        <div className="bg-[#0A0E1A] rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Gevraagd</span>
            <span>{amount} cr</span>
          </div>
          {penalty > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Boete (10%)</span>
              <span className="text-red-400">-{penalty.toFixed(1)} cr</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">Verwerking</span>
            <span>{FINANCIAL_CONFIG.withdrawal_processing_days} werkdagen</span>
          </div>
          <div className="flex justify-between font-bold border-t border-[#1E2A45] pt-2">
            <span>Jij ontvangt</span>
            <span className="text-[#00FF87]">€{youReceive.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => { withdraw({ amountCredits: amount, bankAccount: iban }); onClose() }}
            isLoading={isWithdrawing}
            disabled={!iban || amount < FINANCIAL_CONFIG.min_withdrawal || amount > (user?.balance_credits ?? 0)}
            className="flex-1"
          >
            <Banknote className="w-4 h-4 mr-2" />
            Opnemen
          </Button>
          <Button variant="ghost" onClick={onClose} className="flex-1">Annuleren</Button>
        </div>
      </div>
    </Modal>
  )
}
