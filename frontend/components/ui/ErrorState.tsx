'use client'

import { WifiOff, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
  compact?: boolean
}

export function ErrorState({ message = 'Kon data niet laden', onRetry, compact = false }: ErrorStateProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
        <WifiOff className="w-4 h-4 flex-shrink-0" />
        <span>{message}</span>
        {onRetry && (
          <button onClick={onRetry} className="ml-auto text-[#00FF87] hover:underline text-xs">
            Opnieuw
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-[#1E2A45] flex items-center justify-center">
        <WifiOff className="w-7 h-7 text-gray-500" />
      </div>
      <div>
        <p className="font-bold text-white mb-1">{message}</p>
        <p className="text-sm text-gray-500">Controleer je verbinding en probeer opnieuw.</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1E2A45] hover:bg-[#2D3A55] text-white rounded-xl text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Opnieuw laden
        </button>
      )}
    </div>
  )
}
