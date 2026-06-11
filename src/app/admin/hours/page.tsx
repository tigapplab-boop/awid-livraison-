'use client'

// ========================================
// AWID / BURGER MINUTE - Opening Hours Management
// Admin page to set opening/closing hours per day
// ========================================

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Clock, Save, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'

interface DayHours {
  open: string
  close: string
  closed: boolean
}

interface OpeningHours {
  enabled: boolean
  monday: DayHours
  tuesday: DayHours
  wednesday: DayHours
  thursday: DayHours
  friday: DayHours
  saturday: DayHours
  sunday: DayHours
}

const DAYS = [
  { key: 'monday', label: 'Lundi', labelAr: 'الإثنين' },
  { key: 'tuesday', label: 'Mardi', labelAr: 'الثلاثاء' },
  { key: 'wednesday', label: 'Mercredi', labelAr: 'الأربعاء' },
  { key: 'thursday', label: 'Jeudi', labelAr: 'الخميس' },
  { key: 'friday', label: 'Vendredi', labelAr: 'الجمعة' },
  { key: 'saturday', label: 'Samedi', labelAr: 'السبت' },
  { key: 'sunday', label: 'Dimanche', labelAr: 'الأحد' },
] as const

export default function OpeningHoursPage() {
  const [hours, setHours] = useState<OpeningHours | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const token = typeof window !== 'undefined' ? localStorage.getItem('bm_token') : null

  useEffect(() => {
    fetchHours()
  }, [])

  const fetchHours = async () => {
    try {
      const res = await fetch('/api/settings/hours')
      if (res.ok) {
        const data = await res.json()
        setHours(data)
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleSave = async () => {
    if (!hours) return
    setSaving(true)
    try {
      const res = await fetch('/api/settings/hours', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(hours),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }

      showMessage('success', 'Horaires mis à jour ✓')
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const handleDayChange = (day: string, field: keyof DayHours, value: string | boolean) => {
    if (!hours) return
    const currentDay = hours[day as keyof OpeningHours] as DayHours
    setHours({
      ...hours,
      [day]: {
        ...currentDay,
        [field]: value,
      },
    })
  }

  const handleCopyToAll = (sourceDay: string) => {
    if (!hours) return
    const sourceDayHours = hours[sourceDay as keyof OpeningHours] as DayHours
    
    const newHours = { ...hours }
    DAYS.forEach(day => {
      newHours[day.key as keyof OpeningHours] = { ...sourceDayHours } as any
    })
    
    setHours(newHours)
    showMessage('success', 'Horaires copiés à tous les jours ✓')
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="h-10 bg-stone-200 rounded-lg animate-pulse w-64 mb-6" />
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-stone-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!hours) {
    return (
      <div className="p-4 lg:p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-stone-400 mx-auto mb-3" />
          <p className="text-stone-500">Erreur de chargement</p>
          <Button onClick={fetchHours} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-stone-900 flex items-center gap-3">
          <Clock className="h-7 w-7 text-bm-primary" />
          Horaires d'Ouverture
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Gérez les heures d'ouverture et de fermeture par jour
        </p>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      <div className="max-w-4xl space-y-4">
        {/* Global Enable/Disable */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">Activer la vérification des horaires</Label>
                <p className="text-sm text-stone-500 mt-1">
                  Les clients ne pourront pas commander en dehors des heures d'ouverture
                </p>
              </div>
              <Switch
                checked={hours.enabled}
                onCheckedChange={(checked) => setHours({ ...hours, enabled: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Days */}
        {DAYS.map((day, index) => {
          const dayHours = hours[day.key] as DayHours
          return (
            <Card key={day.key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{day.label}</CardTitle>
                  <div className="flex items-center gap-2">
                    {index === 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyToAll(day.key)}
                        className="text-xs"
                      >
                        Copier à tous
                      </Button>
                    )}
                    <Switch
                      checked={!dayHours.closed}
                      onCheckedChange={(checked) => handleDayChange(day.key, 'closed', !checked)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {dayHours.closed ? (
                  <div className="text-center py-4 text-stone-400">
                    <p className="text-sm font-medium">Fermé toute la journée</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Heure d'ouverture</Label>
                      <Input
                        type="time"
                        value={dayHours.open}
                        onChange={(e) => handleDayChange(day.key, 'open', e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Heure de fermeture</Label>
                      <Input
                        type="time"
                        value={dayHours.close}
                        onChange={(e) => handleDayChange(day.key, 'close', e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

        {/* Save Button */}
        <Card className="sticky bottom-4 shadow-lg">
          <CardContent className="pt-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full min-h-[48px] bg-bm-primary hover:bg-bm-primary-600 text-stone-900 font-bold"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder les horaires'}
            </Button>
          </CardContent>
        </Card>

        {/* Preview Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Info:</strong> Quand le restaurant est fermé, les clients verront un modal avec un compte à rebours jusqu'à la prochaine ouverture. Ils pourront toujours consulter le menu mais ne pourront pas passer de commande.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
