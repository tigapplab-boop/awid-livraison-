'use client'

import { useEffect, useState } from 'react'
import { MapPin, Phone, AlertTriangle, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

export default function AdminSettingsPage() {
  const [restaurantInfo, setRestaurantInfo] = useState({
    phone: '',
    address: '',
    lat: 36.891389,
    lng: 4.122778,
    mapsUrl: '',
  })

  const [maintenance, setMaintenance] = useState({
    enabled: false,
    message: '',
  })

  const [saving, setSaving] = useState(false)
  const [savedSection, setSavedSection] = useState<string | null>(null)

  useEffect(() => {
    // Fetch restaurant info
    fetch('/api/settings/restaurant-info')
      .then((res) => res.json())
      .then((data) => setRestaurantInfo(data))
      .catch(console.error)

    // Fetch maintenance
    fetch('/api/settings/maintenance')
      .then((res) => res.json())
      .then((data) => setMaintenance(data))
      .catch(console.error)
  }, [])

  const saveRestaurantInfo = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/restaurant-info', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restaurantInfo),
      })

      if (res.ok) {
        setSavedSection('restaurant')
        setTimeout(() => setSavedSection(null), 2000)
      }
    } catch (error) {
      console.error('Error saving restaurant info:', error)
    } finally {
      setSaving(false)
    }
  }

  const saveMaintenance = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/maintenance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maintenance),
      })

      if (res.ok) {
        setSavedSection('maintenance')
        setTimeout(() => setSavedSection(null), 2000)
      }
    } catch (error) {
      console.error('Error saving maintenance:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateMapsUrl = () => {
    if (restaurantInfo.lat && restaurantInfo.lng) {
      setRestaurantInfo({
        ...restaurantInfo,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${restaurantInfo.lat},${restaurantInfo.lng}`,
      })
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-stone-50 mb-2">Paramètres</h1>
        <p className="text-stone-400">Configuration générale du restaurant</p>
      </div>

      {/* Restaurant Info Section */}
      <div className="bg-stone-800/50 backdrop-blur-sm border border-stone-700 rounded-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-6">
          <MapPin className="w-5 h-5 text-bm-primary" />
          <h2 className="text-xl font-semibold text-stone-50">
            Informations Restaurant
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <div className="flex gap-2">
              <Phone className="w-5 h-5 text-stone-400 mt-2" />
              <Input
                id="phone"
                value={restaurantInfo.phone}
                onChange={(e) =>
                  setRestaurantInfo({ ...restaurantInfo, phone: e.target.value })
                }
                placeholder="+213 26 XX XX XX"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={restaurantInfo.address}
              onChange={(e) =>
                setRestaurantInfo({ ...restaurantInfo, address: e.target.value })
              }
              placeholder="Grande Plage, Tigzirt, Algérie"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                type="number"
                step="0.000001"
                value={restaurantInfo.lat}
                onChange={(e) =>
                  setRestaurantInfo({
                    ...restaurantInfo,
                    lat: parseFloat(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                type="number"
                step="0.000001"
                value={restaurantInfo.lng}
                onChange={(e) =>
                  setRestaurantInfo({
                    ...restaurantInfo,
                    lng: parseFloat(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={updateMapsUrl}
            className="w-full"
          >
            Générer le lien Google Maps
          </Button>

          {restaurantInfo.mapsUrl && (
            <div>
              <Label>Lien Google Maps</Label>
              <div className="flex gap-2">
                <Input value={restaurantInfo.mapsUrl} readOnly />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(restaurantInfo.mapsUrl, '_blank')}
                >
                  Tester
                </Button>
              </div>
            </div>
          )}

          <Button
            onClick={saveRestaurantInfo}
            disabled={saving}
            className="w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            {savedSection === 'restaurant'
              ? 'Enregistré ✓'
              : 'Enregistrer les informations'}
          </Button>
        </div>
      </div>

      {/* Maintenance Mode Section */}
      <div className="bg-stone-800/50 backdrop-blur-sm border border-stone-700 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <AlertTriangle className="w-5 h-5 text-bm-primary" />
          <h2 className="text-xl font-semibold text-stone-50">
            Mode Maintenance
          </h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-stone-900/50 rounded-lg">
            <div>
              <Label htmlFor="maintenance-toggle" className="text-base">
                Activer le mode maintenance
              </Label>
              <p className="text-sm text-stone-400 mt-1">
                Empêche les clients d'accéder au menu et de passer des commandes
              </p>
            </div>
            <Switch
              id="maintenance-toggle"
              checked={maintenance.enabled}
              onCheckedChange={(checked) =>
                setMaintenance({ ...maintenance, enabled: checked })
              }
            />
          </div>

          <div>
            <Label htmlFor="maintenance-message">Message de maintenance</Label>
            <Textarea
              id="maintenance-message"
              value={maintenance.message}
              onChange={(e) =>
                setMaintenance({ ...maintenance, message: e.target.value })
              }
              placeholder="Nous effectuons une maintenance. Nous revenons très bientôt."
              rows={3}
            />
            <p className="text-xs text-stone-500 mt-1">
              Ce message sera affiché aux clients pendant la maintenance
            </p>
          </div>

          {maintenance.enabled && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">
                ⚠️ Le mode maintenance est actuellement activé. Les clients ne
                peuvent pas passer de commandes.
              </p>
            </div>
          )}

          <Button
            onClick={saveMaintenance}
            disabled={saving}
            className="w-full"
            variant={maintenance.enabled ? 'destructive' : 'default'}
          >
            <Save className="w-4 h-4 mr-2" />
            {savedSection === 'maintenance'
              ? 'Enregistré ✓'
              : maintenance.enabled
              ? 'Activer la maintenance'
              : 'Enregistrer les paramètres'}
          </Button>
        </div>
      </div>
    </div>
  )
}
