'use client'

import { MarketplaceListing } from '@/types'
import { Clock, TrendingUp, Gavel, ShoppingCart } from 'lucide-react'
import { formatCredits } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import { Button } from '@/components/ui/Button'

interface ListingCardProps {
  listing: MarketplaceListing
  onBuy?: () => void
  onBid?: () => void
  onViewPlayer?: () => void
  isBuying?: boolean
  isOwn?: boolean
  onCancel?: () => void
}

const positionColors: Record<string, string> = {
  GK: '#FFD700', DEF: '#3B82F6', MID: '#00FF87', FWD: '#EF4444',
}

export function ListingCard({ listing, onBuy, onBid, onViewPlayer, isBuying, isOwn, onCancel }: ListingCardProps) {
  const { player } = listing
  const expiresIn = formatDistanceToNow(new Date(listing.expires_at), { addSuffix: true, locale: nl })
  const isAuction = listing.listing_type === 'auction'
  const color = positionColors[player.position] ?? '#9B59B6'
  const priceChange = player.price_change_week

  return (
    <div className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-4 hover:border-[#00FF87]/20 transition-all flex flex-col gap-3">
      {/* Player info */}
      <div className="flex items-center gap-3 cursor-pointer" onClick={onViewPlayer}>
        <div className="w-12 h-12 rounded-xl bg-[#1E2A45] flex items-center justify-center overflow-hidden flex-shrink-0">
          {player.photo_url
            ? <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            : <span className="text-lg font-black text-gray-400">{player.name.charAt(0)}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold truncate">{player.name}</span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: `${color}20`, color }}>
              {player.position}
            </span>
          </div>
          <p className="text-xs text-gray-500">{player.club}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-400">{player.total_points} pt</span>
            <span className="text-xs text-gray-400">Form: {player.form.toFixed(1)}</span>
            {priceChange !== 0 && (
              <span className={`text-xs flex items-center gap-0.5 ${priceChange > 0 ? 'text-[#00FF87]' : 'text-red-400'}`}>
                <TrendingUp className="w-3 h-3" />
                {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Price section */}
      <div className="flex items-end justify-between bg-[#0A0E1A] rounded-lg p-3">
        <div>
          {isAuction ? (
            <>
              <p className="text-xs text-gray-500 mb-0.5">Huidig bod</p>
              <p className="text-xl font-black text-[#00FF87]">
                {listing.current_bid ? formatCredits(listing.current_bid) : formatCredits(listing.price)}
              </p>
              <p className="text-xs text-gray-500">{listing.bid_count} biedingen</p>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-0.5">Vaste prijs</p>
              <p className="text-xl font-black text-[#00FF87]">{formatCredits(listing.price)}</p>
              <p className="text-xs text-gray-500">+{(listing.price * 0.05).toFixed(1)} cr fee (5%)</p>
            </>
          )}
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-gray-500 text-xs">
            <Clock className="w-3 h-3" />
            <span>{expiresIn}</span>
          </div>
          {isAuction && <span className="text-xs bg-[#F97316]/20 text-[#F97316] px-2 py-0.5 rounded-full mt-1 inline-block">Veiling</span>}
        </div>
      </div>

      {/* Actions */}
      {!isOwn ? (
        <div className="flex gap-2">
          {isAuction ? (
            <Button onClick={onBid} variant="secondary" className="flex-1 text-sm py-2">
              <Gavel className="w-3.5 h-3.5 mr-1" />
              Bieden
            </Button>
          ) : (
            <Button onClick={onBuy} loading={isBuying} className="flex-1 text-sm py-2">
              <ShoppingCart className="w-3.5 h-3.5 mr-1" />
              Kopen
            </Button>
          )}
        </div>
      ) : (
        <button onClick={onCancel} className="w-full border border-red-500/30 text-red-400 py-2 rounded-lg text-sm hover:bg-red-500/10 transition-colors">
          Listing annuleren
        </button>
      )}
    </div>
  )
}
