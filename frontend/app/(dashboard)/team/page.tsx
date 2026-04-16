'use client'

import { useState, useEffect } from 'react'
import { Save, RefreshCw, Info } from 'lucide-react'
import { useTeamStore } from '@/store/teamStore'
import { Formation, Player, TeamPlayer } from '@/types'
import { PitchView } from '@/components/team/PitchView'
import { FormationSelector } from '@/components/team/FormationSelector'
import { TransferPanel } from '@/components/team/TransferPanel'
import { TacticSelector, TacticStyle } from '@/components/team/TacticSelector'
import { TacticImpactPanel } from '@/components/team/TacticImpactPanel'
import { ScoutPanel } from '@/components/team/ScoutPanel'
import { Skeleton } from '@/components/ui/Skeleton'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useTeam } from '@/hooks/useTeam'
import toast from 'react-hot-toast'

export default function TeamPage() {
  const { setFormation } = useTeamStore()
  const { team, isLoading, saveTeam, isSaving } = useTeam()
  const [formation, setFormationLocal] = useState<Formation>('4-4-2')
  const [tactic, setTacticLocal] = useState<TacticStyle>('BALANCED')
  const [players, setPlayers] = useState<TeamPlayer[]>([])

  // Initialiseer vanuit echte teamdata zodra die binnenkomt
  useEffect(() => {
    if (team) {
      setFormationLocal(team.formation as Formation)
      if (team.tactic_style) setTacticLocal(team.tactic_style as TacticStyle)
      setPlayers((team.players ?? []) as unknown as TeamPlayer[])
    }
  }, [team])
  const [selectedPlayer, setSelectedPlayer] = useState<(TeamPlayer & { player?: Player }) | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [showTransfer, setShowTransfer] = useState(false)


  const budget = 100
  const spent = players.reduce((sum, tp) => sum + (Number((tp as any).player?.price ?? (tp as any).purchase_price ?? 0)), 0)
  const budgetRemaining = budget - spent

  const handleFormationChange = (f: Formation) => {
    setFormationLocal(f)
    setFormation(f)
  }

  const handlePlayerClick = (tp: TeamPlayer) => {
    setSelectedPlayer(tp as TeamPlayer & { player?: Player })
  }

  const handleSlotClick = (slot: number) => {
    setSelectedSlot(slot)
    setShowTransfer(true)
  }

  const handleAddPlayer = (player: Player) => {
    if (!selectedSlot) return
    if (players.some(p => p.player_id === player.id)) {
      toast.error('Speler al in je team')
      return
    }
    if (budgetRemaining < player.price) {
      toast.error('Onvoldoende budget')
      return
    }
    setPlayers(prev => {
      const filtered = prev.filter(p => p.slot !== selectedSlot)
      return [...filtered, {
        player_id: player.id,
        player,
        position: player.position,
        is_captain: false,
        is_vice_captain: false,
        purchase_price: player.price,
        slot: selectedSlot,
        is_benched: selectedSlot > 11,
      }]
    })
    setShowTransfer(false)
    setSelectedSlot(null)
  }

  const handleRemovePlayer = (tp: TeamPlayer) => {
    setPlayers(prev => prev.filter(p => p.slot !== tp.slot))
    setSelectedPlayer(null)
  }

  const handleSetCaptain = (tp: TeamPlayer) => {
    setPlayers(prev => prev.map(p => ({ ...p, is_captain: p.slot === tp.slot, is_vice_captain: p.is_vice_captain && p.slot !== tp.slot })))
    setSelectedPlayer(null)
  }

  const handleSave = () => {
    if (!team?.id) { toast.error('Geen team gevonden'); return }
    saveTeam(players)
  }

  const excludedIds = players.map(p => (p as any).player_id ?? (p as any).player?.id)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <div className="grid lg:grid-cols-5 gap-6">
          <Skeleton className="lg:col-span-3 h-96 rounded-xl" />
          <Skeleton className="lg:col-span-2 h-96 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Mijn Team</h1>
          <p className="text-gray-400 text-sm mt-1">Deadline: Vrijdag 18:00 · Speelronde 28</p>
        </div>
        <Button onClick={handleSave} loading={isSaving} className="hidden sm:flex">
          <Save className="w-4 h-4 mr-2" />
          Opslaan
        </Button>
      </div>

      {/* Budget bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Budget</span>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-400">Gebruikt: <span className="text-white font-bold">{spent.toFixed(1)} cr</span></span>
            <span className="text-[#00FF87] font-bold">Resterend: {budgetRemaining.toFixed(1)} cr</span>
          </div>
        </div>
        <ProgressBar value={spent} max={budget} color={budgetRemaining < 5 ? 'red' : 'green'} />
      </Card>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Pitch + controls */}
        <div className="lg:col-span-3 space-y-4">
          {/* Formation */}
          <Card className="p-4">
            <p className="text-sm font-medium text-gray-400 mb-3">Formatie</p>
            <FormationSelector value={formation} onChange={handleFormationChange} />
          </Card>

          {/* Tactic */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-400">Tactiek</p>
              <span className="text-[10px] font-bold text-[#00FF87] uppercase tracking-wider bg-[#00FF87]/10 px-2 py-0.5 rounded-full">Nieuw</span>
            </div>
            <TacticSelector value={tactic} onChange={setTacticLocal} />
          </Card>

          {/* Tactic impact */}
          <Card className="p-4">
            <p className="text-sm font-medium text-gray-400 mb-3">Tactiek Impact</p>
            <TacticImpactPanel tacticStyle={tactic} />
          </Card>

          {/* Pitch */}
          <Card className="p-4">
            <PitchView
              formation={formation}
              players={players}
              onPlayerClick={handlePlayerClick}
              onSlotClick={handleSlotClick}
            />
          </Card>

          <Button onClick={handleSave} loading={isSaving} className="w-full sm:hidden">
            <Save className="w-4 h-4 mr-2" />
            Team opslaan
          </Button>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2 space-y-4">
          {showTransfer ? (
            <Card className="p-4 h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">Speler kiezen</h2>
                <button onClick={() => { setShowTransfer(false); setSelectedSlot(null) }} className="text-gray-500 hover:text-white">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <TransferPanel
                onSelectPlayer={handleAddPlayer}
                excludeIds={excludedIds}
                budget={budgetRemaining}
              />
            </Card>
          ) : selectedPlayer ? (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">Speler detail</h2>
                <button onClick={() => setSelectedPlayer(null)} className="text-gray-500 hover:text-white text-sm">Sluiten</button>
              </div>
              {selectedPlayer.player && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-[#1E2A45] flex items-center justify-center overflow-hidden">
                      {selectedPlayer.player.photo_url
                        ? <img src={selectedPlayer.player.photo_url} alt={selectedPlayer.player.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        : <span className="text-xl font-black text-gray-400">{selectedPlayer.player.name.charAt(0)}</span>
                      }
                    </div>
                    <div>
                      <p className="font-bold">{selectedPlayer.player.name}</p>
                      <p className="text-sm text-gray-400">{selectedPlayer.player.club} · {selectedPlayer.player.position}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-[#0A0E1A] rounded-lg p-2">
                      <p className="font-bold text-[#00FF87]">{selectedPlayer.player.price.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">credits</p>
                    </div>
                    <div className="bg-[#0A0E1A] rounded-lg p-2">
                      <p className="font-bold">{selectedPlayer.player.total_points}</p>
                      <p className="text-xs text-gray-500">punten</p>
                    </div>
                    <div className="bg-[#0A0E1A] rounded-lg p-2">
                      <p className="font-bold text-[#00FF87]">{selectedPlayer.player.form.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">form</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => handleSetCaptain(selectedPlayer)}
                      disabled={selectedPlayer.is_captain}
                    >
                      {selectedPlayer.is_captain ? '✓ Aanvoerder' : 'Maak aanvoerder (x2)'}
                    </Button>
                    <button
                      onClick={() => handleRemovePlayer(selectedPlayer)}
                      className="w-full border border-red-500/30 text-red-400 py-2 rounded-xl text-sm hover:bg-red-500/10 transition-colors"
                    >
                      Verwijder uit team
                    </button>
                    <button
                      onClick={() => { setSelectedSlot(selectedPlayer.slot); setShowTransfer(true); handleRemovePlayer(selectedPlayer) }}
                      className="w-full border border-[#1E2A45] text-gray-400 py-2 rounded-xl text-sm hover:border-[#00FF87]/30 transition-colors"
                    >
                      Transfer (vervangen)
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-4">
              <div className="flex items-start gap-2 text-sm text-gray-400">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#3B82F6]" />
                <div>
                  <p className="font-medium text-white mb-1">Tips</p>
                  <ul className="space-y-1.5">
                    <li>• Klik op een speler om details te zien</li>
                    <li>• Klik op een leeg vak om een speler toe te voegen</li>
                    <li>• Stel een aanvoerder in voor 2x punten</li>
                    <li>• Max 3 spelers per club</li>
                    <li>• Budget: 100 credits totaal</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#1E2A45]">
                <p className="text-sm font-medium mb-2">Team statistieken</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Spelers geselecteerd</span>
                    <span>{players.length}/15</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Totale waarde</span>
                    <span className="text-[#00FF87]">{spent.toFixed(1)} cr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Aanvoerder</span>
                    <span>{players.find(p => p.is_captain)?.player_id ? 'Ingesteld' : 'Niet ingesteld'}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* AI Scout */}
          <Card className="p-4">
            <ScoutPanel />
          </Card>
        </div>
      </div>
    </div>
  )
}
