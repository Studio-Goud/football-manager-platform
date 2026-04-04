'use client'

import { Player } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { AlertCircle, TrendingUp, TrendingDown, Users } from 'lucide-react'

interface PlayerModalProps {
  player: Player | null
  isOpen: boolean
  onClose: () => void
  onBuy?: (player: Player) => void
  onSell?: (player: Player) => void
  isOwned?: boolean
  mode?: 'view' | 'buy' | 'sell'
}

const difficultyColors = ['', '#00FF87', '#a3e635', '#FFD700', '#f97316', '#EF4444']
const difficultyLabels = ['', 'Makkelijk', 'Gemakkelijk', 'Gemiddeld', 'Moeilijk', 'Heel Moeilijk']

export function PlayerModal({ player, isOpen, onClose, onBuy, onSell, isOwned, mode = 'view' }: PlayerModalProps) {
  if (!player) return null

  const formData = player.form_history.map((pts, i) => ({ gw: `GW${i + 1}`, pts }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={player.name}>
      <div className="space-y-4">
        {/* Player header */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-[#1E2A45] flex items-center justify-center overflow-hidden flex-shrink-0">
            {player.photo_url
              ? <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              : <span className="text-3xl font-black text-gray-400">{player.name.charAt(0)}</span>
            }
          </div>
          <div>
            <h2 className="text-xl font-black">{player.name}</h2>
            <p className="text-gray-400">{player.club} · {player.nationality}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-[#00FF87]/20 text-[#00FF87] text-xs font-bold px-2 py-0.5 rounded-full">{player.position}</span>
              {player.availability !== 'available' && (
                <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {player.availability === 'injured' ? 'Geblesseerd' : player.availability === 'suspended' ? 'Geschorst' : 'Twijfelachtig'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Prijs', value: `${player.price.toFixed(1)} cr` },
            { label: 'Punten', value: player.total_points.toString() },
            { label: 'Form', value: player.form.toFixed(1) },
            { label: 'Bezit', value: `${player.owned_by_percent}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#0A0E1A] rounded-xl p-3 text-center">
              <p className="text-sm font-black text-[#00FF87]">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Season stats */}
        <div>
          <h3 className="font-semibold text-sm text-gray-400 mb-2">Dit Seizoen</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Goals', value: player.goals },
              { label: 'Assists', value: player.assists },
              { label: 'Clean Sheets', value: player.clean_sheets },
              { label: 'Gele Kaarten', value: player.yellow_cards },
              { label: 'Rode Kaarten', value: player.red_cards },
              ...(player.position === 'GK' ? [{ label: 'Saves', value: player.saves ?? 0 }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#0A0E1A] rounded-lg p-2 text-center">
                <p className="text-base font-bold">{value}</p>
                <p className="text-xs text-gray-600">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Form chart */}
        <div>
          <h3 className="font-semibold text-sm text-gray-400 mb-2">Form (laatste 6 GW)</h3>
          <div className="h-24 bg-[#0A0E1A] rounded-xl p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formData}>
                <XAxis dataKey="gw" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#0F1629', border: '1px solid #1E2A45', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#9CA3AF' }}
                  itemStyle={{ color: '#00FF87' }}
                />
                <Line type="monotone" dataKey="pts" stroke="#00FF87" strokeWidth={2} dot={{ fill: '#00FF87', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Price change */}
        <div className="flex items-center justify-between bg-[#0A0E1A] rounded-xl p-3">
          <span className="text-sm text-gray-400">Prijswijziging (week)</span>
          <span className={`flex items-center gap-1 font-bold ${player.price_change_week >= 0 ? 'text-[#00FF87]' : 'text-red-400'}`}>
            {player.price_change_week >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {player.price_change_week >= 0 ? '+' : ''}{player.price_change_week.toFixed(1)} cr
          </span>
        </div>

        {/* Upcoming fixtures */}
        <div>
          <h3 className="font-semibold text-sm text-gray-400 mb-2">Aankomende Fixtures</h3>
          <div className="space-y-1">
            {player.upcoming_fixtures.slice(0, 3).map((fix, i) => (
              <div key={i} className="flex items-center justify-between bg-[#0A0E1A] rounded-lg px-3 py-2">
                <span className="text-sm">{fix.opponent} ({fix.home_away})</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${difficultyColors[fix.difficulty]}20`, color: difficultyColors[fix.difficulty] }}>
                  {difficultyLabels[fix.difficulty]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Ownership */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Users className="w-4 h-4" />
          <span>Geselecteerd door {player.owned_by_percent}% van de managers</span>
        </div>

        {/* Actions */}
        {mode !== 'view' && (
          <div className="flex gap-3 pt-2">
            {mode === 'buy' && onBuy && (
              <Button onClick={() => { onBuy(player); onClose() }} className="flex-1">
                Kopen voor {player.price.toFixed(1)} cr
              </Button>
            )}
            {mode === 'sell' && onSell && (
              <Button variant="danger" onClick={() => { onSell(player); onClose() }} className="flex-1">
                Verkopen
              </Button>
            )}
            <Button variant="ghost" onClick={onClose} className="flex-1">Annuleren</Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
