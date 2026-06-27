'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function MaintenancePage() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/settings/maintenance')
      .then((res) => res.json())
      .then((data) => {
        setMessage(data.message || 'Le site est actuellement en maintenance.')
      })
      .catch(() => {
        setMessage('Le site est actuellement en maintenance.')
      })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-stone-800/50 backdrop-blur-sm border border-stone-700 rounded-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-bm-primary/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-bm-primary" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-stone-50 mb-4">
          Maintenance en cours
        </h1>
        
        <p className="text-stone-300 mb-6">
          {message}
        </p>
        
        <p className="text-sm text-stone-400">
          Nous revenons très bientôt. Merci pour votre patience.
        </p>
        
        <div className="mt-8 pt-6 border-t border-stone-700">
          <p className="text-xs text-stone-500">
            Burger Minute - Tigzirt
          </p>
        </div>
      </div>
    </div>
  )
}
