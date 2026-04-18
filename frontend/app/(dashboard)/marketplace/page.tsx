'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, TrendingUp, Package, List, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMarketplace } from '@/hooks/useMarketplace'
import { useAuthStore } from '@/store/authStore'
import { ListingCard } from '@/components/marketplace/ListingCard'
import { BidModal } from '@/components/marketplace/BidModal'
import { CreateListingModal } from '@/components/marketplace/CreateListingModal'
import { PackShop } from '@/components/marketplace/PackShop'
import { PriceChart } from '@/components/marketplace/PriceChart'
import { PlayerModal } from '@/components/team/PlayerModal'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { MarketplaceListing, Player } from '@/types'
import { useTeam } from '@/hooks/useTeam'

type Tab = 'market' | 'hot' | 'packs' | 'my_listings'

export default function MarketplacePage() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState<Tab>('market')
  const [search, setSearch] = useState('')
  const [positionFilter, setPositionFilter] = useState('')
  const [listingTypeFilter, setListingTypeFilter] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [page, setPage] = useState(1)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null)
  const [bidModal, setBidModal] = useState<MarketplaceListing | null>(null)
  const [createModal, setCreateModal] = useState<Player | null>(null)
  const [viewPlayer, setViewPlayer] = useState<Player | null>(null)

  const filters = {
    search: search || undefined,
    position: positionFilter || undefined,
    listing_type: listingTypeFilter || undefined,
    sort_by: sortBy !== 'newest' ? sortBy : undefined,
    min_price: minPrice ? parseFloat(minPrice) : undefined,
    max_price: maxPrice ? parseFloat(maxPrice) : undefined,
    page,
    per_page: 12,
  }

  const { listings, total, hotPlayers, isLoading, buy, bid, createListing, isBuying, isBidding, isCreating } = useMarketplace(filters)
  const { team } = useTeam()

  const displayListings: MarketplaceListing[] = listings as MarketplaceListing[]
  const myListings = displayListings.filter((l: MarketplaceListing) => l.seller_id === user?.id)
  const sellablePlayers = team?.players?.map(tp => tp.player).filter(Boolean) as Player[] | undefined

  const totalPages = Math.ceil(total / 12)

  function resetFilters() {
    setSearch('')
    setPositionFilter('')
    setListingTypeFilter('')
    setSortBy('newest')
    setMinPrice('')
    setMaxPrice('')
    setPage(1)
  }

  const tabs = [
    { key: 'market' as Tab, label: 'Markt', icon: List },
    { key: 'hot' as Tab, label: 'Hot', icon: TrendingUp },
    { key: 'packs' as Tab, label: 'Packs', icon: Package },
    { key: 'my_listings' as Tab, label: 'Mijn', icon: List },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Transfermarkt</h1>
          <p className="text-gray-400 text-sm mt-1">Koop en verkoop spelers · Fee: 5%</p>
        </div>
        {sellablePlayers && sellablePlayers.length > 0 && (
          <button
            onClick={() => setCreateModal(sellablePlayers[0])}
            className="bg-[#00FF87] text-[#0A0E1A] px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#00CC6A] transition-colors"
          >
            + Verkopen
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0F1629] rounded-xl p-1 border border-[#1E2A45]">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-[#00FF87] text-[#0A0E1A]' : 'text-gray-400 hover:text-white'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Market tab */}
      {tab === 'market' && (
        <div className="space-y-4">
          {/* Primary filters row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Zoek speler..."
                className="w-full bg-[#0F1629] border border-[#1E2A45] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87]"
              />
            </div>
            <select
              value={positionFilter}
              onChange={e => { setPositionFilter(e.target.value); setPage(1) }}
              className="bg-[#0F1629] border border-[#1E2A45] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#00FF87]"
            >
              <option value="">Alle pos.</option>
              <option value="GK">GK</option>
              <option value="DEF">DEF</option>
              <option value="MID">MID</option>
              <option value="FWD">FWD</option>
            </select>
            <button
              onClick={() => setShowAdvanced(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm transition-colors ${showAdvanced ? 'bg-[#00FF87] text-[#0A0E1A] border-[#00FF87]' : 'bg-[#0F1629] border-[#1E2A45] text-gray-400 hover:text-white'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filter</span>
            </button>
          </div>

          {/* Advanced filters */}
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-4 space-y-3"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Sorteren</label>
                  <select
                    value={sortBy}
                    onChange={e => { setSortBy(e.target.value); setPage(1) }}
                    className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00FF87]"
                  >
                    <option value="newest">Nieuwste eerst</option>
                    <option value="price_asc">Prijs laag → hoog</option>
                    <option value="price_desc">Prijs hoog → laag</option>
                    <option value="form">Beste form</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Type</label>
                  <select
                    value={listingTypeFilter}
                    onChange={e => { setListingTypeFilter(e.target.value); setPage(1) }}
                    className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00FF87]"
                  >
                    <option value="">Alle types</option>
                    <option value="fixed">Vaste prijs</option>
                    <option value="auction">Veiling</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Min. prijs (cr)</label>
                  <input
                    type="number"
                    value={minPrice}
                    onChange={e => { setMinPrice(e.target.value); setPage(1) }}
                    placeholder="0"
                    min="0"
                    className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87]"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Max. prijs (cr)</label>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={e => { setMaxPrice(e.target.value); setPage(1) }}
                    placeholder="∞"
                    min="0"
                    className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87]"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{total} listing{total !== 1 ? 's' : ''} gevonden</span>
                <button onClick={resetFilters} className="text-xs text-[#00FF87] hover:underline">Reset filters</button>
              </div>
            </motion.div>
          )}

          {/* Price chart for selected */}
          {selectedListing && (selectedListing as any).player?.price_history && (
            <PriceChart
              data={(selectedListing as any).player.price_history}
              playerName={selectedListing.player.name}
            />
          )}

          {/* Results count (when no advanced panel) */}
          {!showAdvanced && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{total} listing{total !== 1 ? 's' : ''}</span>
              {totalPages > 1 && <span>Pagina {page} van {totalPages}</span>}
            </div>
          )}

          {/* Listings grid */}
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayListings.map(listing => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <ListingCard
                    listing={listing}
                    onBuy={() => buy(listing.id)}
                    onBid={() => setBidModal(listing)}
                    onViewPlayer={() => { setViewPlayer(listing.player); setSelectedListing(listing) }}
                    isBuying={isBuying}
                    isOwn={listing.seller_id === user?.id}
                  />
                </motion.div>
              ))}
            </div>
          )}

          {displayListings.length === 0 && !isLoading && (
            <div className="text-center py-12 text-gray-500">Geen listings gevonden</div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#0F1629] border border-[#1E2A45] text-sm disabled:opacity-40 hover:border-[#00FF87] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Vorige
              </button>
              <span className="text-sm text-gray-400">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#0F1629] border border-[#1E2A45] text-sm disabled:opacity-40 hover:border-[#00FF87] transition-colors"
              >
                Volgende
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hot players tab */}
      {tab === 'hot' && (
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#F97316]" />
              Hot Spelers — Prijsstijgers
            </h2>
            <div className="space-y-3">
              {hotPlayers.slice(0, 5).map((listing, i) => (
                <div key={listing.id} className="flex items-center gap-3 p-3 bg-[#0A0E1A] rounded-xl">
                  <span className="text-lg font-black text-gray-600 w-6">{i + 1}</span>
                  <div className="flex-1">
                    <p className="font-bold">{listing.player.name}</p>
                    <p className="text-xs text-gray-500">{listing.player.club} · Form: {listing.player.form.toFixed(1)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#00FF87]">{listing.player.price.toFixed(1)} cr</p>
                    <p className={`text-xs ${listing.player.price_change_week >= 0 ? 'text-[#00FF87]' : 'text-red-400'}`}>
                      {listing.player.price_change_week >= 0 ? '+' : ''}{listing.player.price_change_week.toFixed(1)} cr
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Packs tab */}
      {tab === 'packs' && (
        <Card className="p-4">
          <PackShop />
        </Card>
      )}

      {/* My listings tab */}
      {tab === 'my_listings' && (
        <div className="space-y-4">
          {myListings.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500 mb-4">Je hebt nog geen actieve listings</p>
              {sellablePlayers && sellablePlayers.length > 0 && (
                <button
                  onClick={() => setCreateModal(sellablePlayers[0])}
                  className="bg-[#00FF87] text-[#0A0E1A] px-6 py-2.5 rounded-xl font-bold hover:bg-[#00CC6A] transition-colors text-sm"
                >
                  Eerste speler verkopen
                </button>
              )}
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {myListings.map(listing => (
                <ListingCard key={listing.id} listing={listing} isOwn />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <BidModal
        listing={bidModal}
        isOpen={!!bidModal}
        onClose={() => setBidModal(null)}
        onBid={(id, amount) => bid({ listingId: id, amount })}
        isBidding={isBidding}
        userBalance={user?.balance_credits ?? 0}
      />

      <CreateListingModal
        player={createModal}
        isOpen={!!createModal}
        onClose={() => setCreateModal(null)}
        onCreate={createListing}
        isCreating={isCreating}
      />

      <PlayerModal
        player={viewPlayer}
        isOpen={!!viewPlayer}
        onClose={() => setViewPlayer(null)}
        mode="view"
      />
    </div>
  )
}
