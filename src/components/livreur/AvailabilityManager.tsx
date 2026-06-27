'use client'

// ========================================
// AWID / BURGER MINUTE - Availability Manager
// Gestion de disponibilité et horaires du livreur
// ========================================

import { useState } from 'react'
import { Clock, Calendar, Check, X, Copy } from 'lucide-react'

interface AvailabilitySchedule {
  [key: string]: { start: string; end: string; enabled: boolean }
}

interface AvailabilityManagerProps {
  userId: string
  currentAvailability: boolean
  currentSchedule: AvailabilitySchedule | null
  onUpdate: (isAvailable: boolean, schedule: AvailabilitySchedule | null) => Promise<void>
  onClose: () => void
}

const DAYS = [
  { key: 'monday', label: 'Lundi' },
  { key: 'tuesday', label: 'Mardi' },
  { key: 'wednesday', label: 'Mercredi' },
  { key: 'thursday', label: 'Jeudi' },
  { key: 'friday', label: 'Vendredi' },
  { key: 'saturday', label: 'Samedi' },
  { key: 'sunday', label: 'Dimanche' },
]

export default function AvailabilityManager({
  userId,
  currentAvailability,
  currentSchedule,
  onUpdate,
  onClose,
}: AvailabilityManagerProps) {
  const [schedule, setSchedule] = useState<AvailabilitySchedule>(
    currentSchedule || {
      monday: { start: '09:00', end: '18:00', enabled: true },
      tuesday: { start: '09:00', end: '18:00', enabled: true },
      wednesday: { start: '09:00', end: '18:00', enabled: true },
      thursday: { start: '09:00', end: '18:00', enabled: true },
      friday: { start: '09:00', end: '18:00', enabled: true },
      saturday: { start: '09:00', end: '18:00', enabled: false },
      sunday: { start: '09:00', end: '18:00', enabled: false },
    }
  )
  const [saving, setSaving] = useState(false)
  const [copyFromDay, setCopyFromDay] = useState<string | null>(null)

  const handleDayToggle = (day: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }))
  }

  const handleTimeChange = (day: string, field: 'start' | 'end', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }))
  }

  const handleCopyToAllDays = (sourceDay: string) => {
    const sourceSchedule = schedule[sourceDay]
    if (!sourceSchedule) return

    const newSchedule = { ...schedule }
    DAYS.forEach(({ key }) => {
      if (key !== sourceDay) {
        newSchedule[key] = { ...sourceSchedule }
      }
    })
    setSchedule(newSchedule)
    setCopyFromDay(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onUpdate(currentAvailability, schedule)
      onClose()
    } catch (err) {
      console.error('Failed to update schedule:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Horaires de disponibilité</h2>
              <p className="text-sm text-stone-500">Configurez vos horaires de travail</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-stone-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <Copy className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              <strong>Astuce:</strong> Configurez un jour puis cliquez sur le bouton <strong>Copier</strong> pour appliquer les mêmes horaires à toute la semaine.
            </p>
          </div>

          {DAYS.map(({ key, label }) => (
            <div key={key} className="border border-stone-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={schedule[key]?.enabled || false}
                    onChange={() => handleDayToggle(key)}
                    className="w-5 h-5 rounded border-stone-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-stone-900">{label}</span>
                </label>
                
                {schedule[key]?.enabled && (
                  <button
                    onClick={() => handleCopyToAllDays(key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Copier ces horaires sur tous les jours"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copier partout
                  </button>
                )}
              </div>

              {schedule[key]?.enabled && (
                <div className="flex items-center gap-3 pl-8">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-stone-600 mb-1">Début</label>
                    <input
                      type="time"
                      value={schedule[key].start}
                      onChange={(e) => handleTimeChange(key, 'start', e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-stone-600 mb-1">Fin</label>
                    <input
                      type="time"
                      value={schedule[key].end}
                      onChange={(e) => handleTimeChange(key, 'end', e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-stone-200 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-stone-300 text-stone-700 rounded-xl font-semibold hover:bg-stone-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Enregistrer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
