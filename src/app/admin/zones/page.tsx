'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MapPin, Plus, Pencil, Moon, Sun } from 'lucide-react'
import { formatDA } from '@/bm/lib/format'

interface Zone {
  id: string
  name: string
  dayFee: number
  nightFee: number
  startNight: string
  endNight: string
  isActive: boolean
  createdAt: string
}

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(false)
  const [editingZone, setEditingZone] = useState<Zone | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form
  const [zName, setZName] = useState('')
  const [zDayFee, setZDayFee] = useState('')
  const [zNightFee, setZNightFee] = useState('')
  const [zStartNight, setZStartNight] = useState('19:00')
  const [zEndNight, setZEndNight] = useState('23:59')
  const [zActive, setZActive] = useState(true)

  const token = typeof window !== 'undefined' ? localStorage.getItem('bm_token') : null

  const fetchZones = useCallback(async () => {
    try {
      const res = await fetch('/api/zones', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setZones(await res.json())
    } catch {
      console.error('Fetch error')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchZones()
  }, [fetchZones])

  const openNew = () => {
    setEditingZone(null)
    setZName('')
    setZDayFee('')
    setZNightFee('')
    setZStartNight('19:00')
    setZEndNight('23:59')
    setZActive(true)
    setDialog(true)
  }

  const openEdit = (zone: Zone) => {
    setEditingZone(zone)
    setZName(zone.name)
    setZDayFee((zone.dayFee / 100).toString())
    setZNightFee((zone.nightFee / 100).toString())
    setZStartNight(zone.startNight)
    setZEndNight(zone.endNight)
    setZActive(zone.isActive)
    setDialog(true)
  }

  const saveZone = async () => {
    if (!zName || !zDayFee || !zNightFee) {
      setMessage({ type: 'error', text: 'Nom, frais jour et nuit requis' })
      return
    }

    const dayFeeCents = Math.round(parseFloat(zDayFee) * 100)
    const nightFeeCents = Math.round(parseFloat(zNightFee) * 100)

    if (isNaN(dayFeeCents) || isNaN(nightFeeCents) || dayFeeCents <= 0 || nightFeeCents <= 0) {
      setMessage({ type: 'error', text: 'Frais invalides' })
      return
    }

    setSaving(true)
    try {
      const url = editingZone ? `/api/zones/${editingZone.id}` : '/api/zones'
      const method = editingZone ? 'PATCH' : 'POST'
      const body = {
        name: zName,
        dayFee: dayFeeCents,
        nightFee: nightFeeCents,
        startNight: zStartNight,
        endNight: zEndNight,
        isActive: zActive,
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }

      setMessage({ type: 'success', text: editingZone ? 'Zone mise à jour' : 'Zone créée' })
      setDialog(false)
      fetchZones()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur' })
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (zone: Zone) => {
    try {
      const res = await fetch(`/api/zones/${zone.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !zone.isActive }),
      })
      if (res.ok) fetchZones()
    } catch {
      setMessage({ type: 'error', text: 'Erreur' })
    }
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 bg-stone-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Zones de Livraison</h1>
          <p className="text-sm text-stone-500 mt-1">{zones.length} zone{zones.length !== 1 ? 's' : ''} configurée{zones.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openNew} className="min-h-[48px] bg-bm-primary hover:bg-bm-primary-600 text-stone-900">
          <Plus className="h-4 w-4 mr-2" /> Nouvelle Zone
        </Button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
          message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-2 opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {zones.map((zone) => (
          <Card key={zone.id} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-bm-primary" />
                  <span className="font-bold text-stone-900">{zone.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={zone.isActive ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                    {zone.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Switch checked={zone.isActive} onCheckedChange={() => toggleActive(zone)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-amber-50 rounded-lg p-2">
                  <div className="flex items-center gap-1 text-amber-600 text-xs font-medium mb-1">
                    <Sun className="h-3 w-3" /> Jour
                  </div>
                  <span className="font-bold text-stone-900">{formatDA(zone.dayFee)}</span>
                </div>
                <div className="bg-indigo-50 rounded-lg p-2">
                  <div className="flex items-center gap-1 text-indigo-600 text-xs font-medium mb-1">
                    <Moon className="h-3 w-3" /> Nuit
                  </div>
                  <span className="font-bold text-stone-900">{formatDA(zone.nightFee)}</span>
                </div>
              </div>
              <div className="text-xs text-stone-500 mt-2">
                Heures nuit: {zone.startNight} - {zone.endNight}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEdit(zone)}
                className="mt-3 w-full min-h-[44px] border-bm-primary text-bm-primary"
              >
                <Pencil className="h-4 w-4 mr-2" /> Modifier
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block">
        <Card className="border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center gap-1 justify-center"><Sun className="h-3 w-3" /> Jour</div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center gap-1 justify-center"><Moon className="h-3 w-3" /> Nuit</div>
                </TableHead>
                <TableHead className="text-center">Heures Nuit</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((zone) => (
                <TableRow key={zone.id}>
                  <TableCell className="font-semibold">{zone.name}</TableCell>
                  <TableCell className="text-center font-medium">{formatDA(zone.dayFee)}</TableCell>
                  <TableCell className="text-center font-medium">{formatDA(zone.nightFee)}</TableCell>
                  <TableCell className="text-center text-sm text-stone-500">{zone.startNight} - {zone.endNight}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Badge className={zone.isActive ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                        {zone.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Switch checked={zone.isActive} onCheckedChange={() => toggleActive(zone)} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(zone)} className="h-8">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {zones.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-stone-400">
                    Aucune zone configurée
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Zone Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingZone ? 'Modifier la zone' : 'Nouvelle zone'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nom *</Label>
              <Input value={zName} onChange={(e) => setZName(e.target.value)} className="input-bm mt-1" placeholder="Ex: Ville, Hors Ville" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Frais Jour (DA) *</Label>
                <Input value={zDayFee} onChange={(e) => setZDayFee(e.target.value)} className="input-bm mt-1" placeholder="100" type="number" />
              </div>
              <div>
                <Label>Frais Nuit (DA) *</Label>
                <Input value={zNightFee} onChange={(e) => setZNightFee(e.target.value)} className="input-bm mt-1" placeholder="150" type="number" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Début Nuit</Label>
                <Input value={zStartNight} onChange={(e) => setZStartNight(e.target.value)} className="input-bm mt-1" type="time" />
              </div>
              <div>
                <Label>Fin Nuit</Label>
                <Input value={zEndNight} onChange={(e) => setZEndNight(e.target.value)} className="input-bm mt-1" type="time" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={zActive} onCheckedChange={setZActive} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialog(false)} className="min-h-[48px]">Annuler</Button>
            <Button onClick={saveZone} disabled={saving} className="min-h-[48px] bg-bm-primary hover:bg-bm-primary-600 text-stone-900">
              {saving ? 'Enregistrement...' : editingZone ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
