'use client'

import { Modal } from '@/components/ui/Modal'
import { Coins } from 'lucide-react'

interface WithdrawModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Coins">
      <div className="text-center py-6 space-y-4">
        <div className="w-16 h-16 bg-[#00FF87]/10 rounded-full flex items-center justify-center mx-auto">
          <Coins className="w-8 h-8 text-[#00FF87]" />
        </div>
        <h3 className="font-bold text-lg">Coins zijn intern</h3>
        <p className="text-gray-400 text-sm max-w-xs mx-auto">
          Coins zijn een intern betaalmiddel en niet inwisselbaar voor geld.
          Gebruik ze voor transfers, power-ups en duels.
        </p>
        <button
          onClick={onClose}
          className="w-full bg-[#00FF87] text-[#0A0E1A] py-3 rounded-xl font-bold hover:bg-[#00CC6A] transition-colors"
        >
          Begrepen
        </button>
      </div>
    </Modal>
  )
}
