'use client'

import { useEffect, useState } from 'react'
import { MapPin, Phone, AlertTriangle, Save, Image, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

export default function AdminSettingsPage() {
  const [restaurantInfo, setRestaurantInfo] = useState({
    phone: '',
    address: '',
    lat: 36.894516,
    lng: 4.125496,
    mapsUrl: '',
    gallery: [] as string[],
  })

  const [maintenance, setMaintenance] = useState({
    enabled: false,
    message: '',
  })

  const [saving, setSaving] = useState(false)
  const [savedSection, setSavedSection] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Récupère le jeton de connexion stocké au moment du login,
  // pour l'envoyer sur chaque requête qui modifie des données (PATCH/POST/DELETE).
  const getAuthHeaders = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('bm_token') : null
    return token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : { 'Content-Type': 'application/json' }
  }

  useEffect(() => {
    // Fetch restaurant info
    Promise.all([
      fetch('/api/settings/restaurant-info').then((res) => res.json()),
      fetch('/api/settings/maintenance').then((res) => res.json()),
    ])
      .then(([restaurantData, maintenanceData]) => {
        setRestaurantInfo(restaurantData)
        setMaintenance(maintenanceData)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const saveRestaurantInfo = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/settings/restaurant-info', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(restaurantInfo),
      })

      if (res.ok) {
        setSavedSection('restaurant')
        setTimeout(() => setSavedSection(null), 2000)
      } else {
        const data = await res.json().catch(() => ({}))
        setSaveError(data.error || `Échec de la sauvegarde (${res.status})`)
      }
    } catch (error) {
      console.error('Error saving restaurant info:', error)
      setSaveError('Erreur réseau — vérifiez votre connexion')
    } finally {
      setSaving(false)
    }
  }

  const saveMaintenance = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/settings/maintenance', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(maintenance),
      })

      if (res.ok) {
        setSavedSection('maintenance')
        setTimeout(() => setSavedSection(null), 2000)
      } else {
        const data = await res.json().catch(() => ({}))
        setSaveError(data.error || `Échec de la sauvegarde (${res.status})`)
      }
    } catch (error) {
      console.error('Error saving maintenance:', error)
      setSaveError('Erreur réseau — vérifiez votre connexion')
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

  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [galleryError, setGalleryError] = useState<string | null>(null)

  const handleGalleryFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setGalleryError(null)
    setUploadingGallery(true)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('bm_token') : null
      const body = new FormData()
      body.append('image', file)

      const res = await fetch('/api/settings/restaurant-info/gallery-upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body,
      })

      const data = await res.json()

      if (!res.ok) {
        setGalleryError(data.error || 'Échec du chargement de la photo')
        return
      }

      setRestaurantInfo((prev) => ({
        ...prev,
        gallery: [...prev.gallery, data.url],
      }))
    } catch (error) {
      console.error('Failed to upload gallery image:', error)
      setGalleryError('Erreur réseau lors du chargement de la photo')
    } finally {
      setUploadingGallery(false)
      // Permet de réuploader le même fichier une deuxième fois si besoin
      e.target.value = ''
    }
  }

  const removeGalleryImage = (index: number) => {
    setRestaurantInfo({
      ...restaurantInfo,
      gallery: restaurantInfo.gallery.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-bm-primary/10 rounded-lg">
              <MapPin className="w-6 h-6 text-bm-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-900">Paramètres Restaurant</h1>
              <p className="text-sm text-stone-500">Configuration des informations et maintenance</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-bm-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Restaurant Info Section */}
          <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-bm-primary/10 to-bm-primary/5 px-6 py-4 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-bm-primary" />
                <h2 className="text-lg font-bold text-stone-900">
                  Informations Restaurant
                </h2>
              </div>
              <p className="text-sm text-stone-600 mt-1">
                Ces informations sont affichées sur la page menu client
              </p>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone" className="text-sm font-semibold text-stone-700">
                    Téléphone du restaurant
                  </Label>
                  <div className="flex gap-2 mt-1.5">
                    <div className="p-2.5 bg-stone-100 border border-stone-200 rounded-lg">
                      <Phone className="w-5 h-5 text-stone-600" />
                    </div>
                    <Input
                      id="phone"
                      value={restaurantInfo.phone}
                      onChange={(e) =>
                        setRestaurantInfo({ ...restaurantInfo, phone: e.target.value })
                      }
                      placeholder="+213 791643294"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address" className="text-sm font-semibold text-stone-700">
                    Adresse complète
                  </Label>
                  <Input
                    id="address"
                    value={restaurantInfo.address}
                    onChange={(e) =>
                      setRestaurantInfo({ ...restaurantInfo, address: e.target.value })
                    }
                    placeholder="Grande Plage, Tigzirt, Algérie"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-stone-200">
                <h3 className="text-sm font-semibold text-stone-700 mb-3">Coordonnées GPS</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lat" className="text-xs text-stone-600">Latitude</Label>
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
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lng" className="text-xs text-stone-600">Longitude</Label>
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
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={updateMapsUrl}
                  className="w-full mt-3"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Générer le lien Google Maps
                </Button>

                {restaurantInfo.mapsUrl && (
                  <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex gap-2 items-center">
                      <Input value={restaurantInfo.mapsUrl} readOnly className="text-xs bg-white" />
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
              </div>

              {/* Gallery Section */}
              <div className="pt-5 border-t border-stone-200">
                <div className="flex items-center gap-2 mb-3">
                  <Image className="w-5 h-5 text-bm-primary" />
                  <h3 className="text-sm font-semibold text-stone-700">Galerie Photos Intérieures</h3>
                </div>
                <p className="text-sm text-stone-500 mb-4">
                  Photos de l'intérieur du restaurant affichées dans le menu client avec défilement
                </p>

                {/* Add new image — chargement direct du fichier */}
                <div className="mb-4">
                  <label className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-bm-primary/40 rounded-lg cursor-pointer hover:bg-bm-primary/5 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingGallery}
                      onChange={handleGalleryFileSelect}
                    />
                    <Plus className="w-4 h-4 text-bm-primary" />
                    <span className="text-sm font-medium text-stone-700">
                      {uploadingGallery ? 'Chargement en cours...' : 'Choisir une photo depuis votre appareil'}
                    </span>
                  </label>
                  {galleryError && (
                    <p className="text-sm text-red-600 mt-2">⚠ {galleryError}</p>
                  )}
                  <p className="text-xs text-stone-400 mt-1">JPG, PNG ou WebP — 5 Mo maximum</p>
                </div>

                {/* Gallery preview */}
                {restaurantInfo.gallery.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {restaurantInfo.gallery.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Galerie ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border-2 border-stone-200"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <button
                            onClick={() => removeGalleryImage(index)}
                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          #{index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-stone-50 rounded-lg border-2 border-dashed border-stone-300">
                    <Image className="w-16 h-16 text-stone-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-stone-600">Aucune photo ajoutée</p>
                    <p className="text-xs text-stone-400 mt-1">Ajoutez des photos pour créer la galerie</p>
                  </div>
                )}
              </div>

              <div className="pt-4">
                {saveError && (
                  <p className="text-sm text-red-600 mb-2">⚠ {saveError}</p>
                )}
                <Button
                  onClick={saveRestaurantInfo}
                  disabled={saving}
                  className="w-full bg-bm-primary hover:bg-bm-primary-600 text-stone-900 font-bold"
                  size="lg"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {savedSection === 'restaurant'
                    ? '✓ Enregistré avec succès'
                    : 'Enregistrer les informations'}
                </Button>
              </div>
            </div>
          </div>

          {/* Maintenance Mode Section */}
          <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-bold text-stone-900">
                  Mode Maintenance
                </h2>
              </div>
              <p className="text-sm text-stone-600 mt-1">
                Désactiver temporairement l'accès client au site
              </p>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg border border-stone-200">
                <div>
                  <Label htmlFor="maintenance-toggle" className="text-base font-semibold text-stone-900">
                    Activer le mode maintenance
                  </Label>
                  <p className="text-sm text-stone-500 mt-1">
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
                <Label htmlFor="maintenance-message" className="text-sm font-semibold text-stone-700">
                  Message de maintenance
                </Label>
                <Textarea
                  id="maintenance-message"
                  value={maintenance.message}
                  onChange={(e) =>
                    setMaintenance({ ...maintenance, message: e.target.value })
                  }
                  placeholder="Nous effectuons une maintenance. Nous revenons très bientôt."
                  rows={3}
                  className="mt-1.5"
                />
                <p className="text-xs text-stone-500 mt-2">
                  Ce message sera affiché aux clients pendant la maintenance
                </p>
              </div>

              {maintenance.enabled && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-900">
                        Mode maintenance activé
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        Les clients ne peuvent pas accéder au site ni passer de commandes.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {saveError && (
                <p className="text-sm text-red-600">⚠ {saveError}</p>
              )}

              <Button
                onClick={saveMaintenance}
                disabled={saving}
                className={`w-full font-bold ${
                  maintenance.enabled
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-bm-primary hover:bg-bm-primary-600 text-stone-900'
                }`}
                size="lg"
              >
                <Save className="w-4 h-4 mr-2" />
                {savedSection === 'maintenance'
                  ? '✓ Enregistré avec succès'
                  : maintenance.enabled
                  ? 'Activer la maintenance'
                  : 'Enregistrer les paramètres'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
