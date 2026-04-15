'use client'

import { useState } from 'react'
import { MarketplaceListing } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Gavel } from 'lucide-react'

interface BidModalProps {
  listing: MarketplaceListing | null
  isOpen: boolean
  onClose: () => void
  onBid: (listingId: string, amount: number) => void
  isBidding?: boolean
  userBalance?: number
}

export function BidModal({ listing, isOpen, onClose, onBid, isBidding, userBalance = 0 }: BidModalProps) {
  const minBid = listing ? (listing.current_bid ?? listing.price) + 0.1 : 0
  const [amount, setAmount] = useState(minBid)

  if (!listing) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Bieden op ${listing.player.name}`}>
      <div className="space-y-4">
        <div className="bg-[#0A0E1A] rounded-xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#1E2A45] flex items-center justify-center overflow-hidden">
            {listing.player.photo_url
              ? <img src={listing.player.photo_url} alt={listing.player.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              : <span className="text-lg font-black text-gray-400">{listing.player.name.charAt(0)}</span>
            }
          </div>
          <div>
            <p className="font-bold">{listing.player.name}</p>
            <p className="text-sm text-gray-400">{listing.player.club} · {listing.player.position}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-[#0A0E1A] rounded-lg p-3 text-center">
            <p className="text-gray-500 text-xs mb-1">Huidig bod</p>
            <p className="font-bold text-[#00FF87]">{listing.current_bid?.toFixed(1) ?? listing.price.toFixed(1)} cr</p>
          </div>
          <div className="bg-[#0A0E1A] rounded-lg p-3 text-center">
            <p className="text-gray-500 text-xs mb-1">Jouw saldo</p>
            <p className="font-bold">{userBalance.toFixed(1)} cr</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Jouw bod (min. {minBid.toFixed(1)} cr)</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            min={minBid}
            max={userBalance}
            step={0.1}
            className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF87]"
          />
        </div>

        {amount > userBalance && (
          <p className="text-red-400 text-sm">Onvoldoende saldo</p>
        )}

        <div className="flex gap-3">
          <Button
            onClick={() => { onBid(listing.id, amount); onClose() }}
            disabled={amount < minBid || amount > userBalance}
            loading={isBidding}
            className="flex-1"
          >
            <Gavel className="w-4 h-4 mr-2" />
            Bod plaatsen
          </Button>
          <Button variant="ghost" onClick={onClose} className="flex-1">Annuleren</Button>
        </div>
      </div>
    </Modal>
  )
}
