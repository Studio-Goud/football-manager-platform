'use client'

import { useState } from 'react'
import { Player } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Tag, Gavel } from 'lucide-react'
import { MARKETPLACE_CONFIG } from '@/lib/constants'

interface CreateListingModalProps {
  player: Player | null
  isOpen: boolean
  onClose: () => void
  onCreate: (data: { player_id: string; price: number; listing_type: 'fixed' | 'auction'; duration_hours: number }) => void
  isCreating?: boolean
}

export function CreateListingModal({ player, isOpen, onClose, onCreate, isCreating }: CreateListingModalProps) {
  const [listingType, setListingType] = useState<'fixed' | 'auction'>('fixed')
  const [price, setPrice] = useState(player?.price ?? 5)
  const [duration, setDuration] = useState(24)

  if (!player) return null

  const fee = price * MARKETPLACE_CONFIG.transaction_fee_percentage
  const youReceive = price - fee

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Speler te koop zetten">
      <div className="space-y-4">
        {/* Player preview */}
        <div className="bg-[#0A0E1A] rounded-xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#1E2A45] flex items-center justify-center overflow-hidden">
            {player.photo_url
              ? <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              : <span className="text-lg font-black text-gray-400">{player.name.charAt(0)}</span>
            }
          </div>
          <div>
            <p className="font-bold">{player.name}</p>
            <p className="text-sm text-gray-400">{player.club} · Huidige waarde: {player.price.toFixed(1)} cr</p>
          </div>
        </div>

        {/* Type selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Type listing</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setListingType('fixed')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${listingType === 'fixed' ? 'border-[#00FF87] bg-[#00FF87]/10' : 'border-[#1E2A45] hover:border-[#00FF87]/30'}`}
            >
              <Tag className={`w-5 h-5 ${listingType === 'fixed' ? 'text-[#00FF87]' : 'text-gray-400'}`} />
              <span className={`text-sm font-medium ${listingType === 'fixed' ? 'text-[#00FF87]' : 'text-gray-400'}`}>Vaste Prijs</span>
            </button>
            <button
              onClick={() => setListingType('auction')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${listingType === 'auction' ? 'border-[#F97316] bg-[#F97316]/10' : 'border-[#1E2A45] hover:border-[#F97316]/30'}`}
            >
              <Gavel className={`w-5 h-5 ${listingType === 'auction' ? 'text-[#F97316]' : 'text-gray-400'}`} />
              <span className={`text-sm font-medium ${listingType === 'auction' ? 'text-[#F97316]' : 'text-gray-400'}`}>Veiling</span>
            </button>
          </div>
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {listingType === 'fixed' ? 'Vraagprijs' : 'Startbod'} (credits)
          </label>
          <input
            type="number"
            value={price}
            onChange={e => setPrice(Number(e.target.value))}
            min={MARKETPLACE_CONFIG.min_price}
            step={0.1}
            className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF87]"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Duur: {duration} uur</label>
          <input
            type="range"
            value={duration}
            onChange={e => setDuration(Number(e.target.value))}
            min={1}
            max={168}
            step={1}
            className="w-full accent-[#00FF87]"
          />
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>1u</span>
            <span>7 dagen</span>
          </div>
        </div>

        {/* Fee breakdown */}
        <div className="bg-[#0A0E1A] rounded-xl p-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Verkoopprijs</span>
            <span>{price.toFixed(1)} cr</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Platform fee (5%)</span>
            <span className="text-red-400">-{fee.toFixed(1)} cr</span>
          </div>
          <div className="flex justify-between font-bold border-t border-[#1E2A45] pt-1.5">
            <span>Jij ontvangt</span>
            <span className="text-[#00FF87]">{youReceive.toFixed(1)} cr</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => { onCreate({ player_id: player.id, price, listing_type: listingType, duration_hours: duration }); onClose() }}
            loading={isCreating}
            className="flex-1"
          >
            Listing aanmaken
          </Button>
          <Button variant="ghost" onClick={onClose} className="flex-1">Annuleren</Button>
        </div>
      </div>
    </Modal>
  )
}
