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
import { Bike, Plus, Pencil, Phone, Package, CheckCircle2, Trash2 } from 'lucide-react'

interface Livreur {
  id: string
  name: string
  phone: string | null
  isAvailable: boolean
  orderCounts: {
    total: number
    active: number
    delivered: number
  }
}

export default function LivreursPage() {
  const [livreurs, setLivreurs] = useState<Livreur[]>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(false)
  const [editingLivreur, setEditingLivreur] = useState<Livreur | null>(null)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [deletingLivreur, setDeletingLivreur] = useState<Livreur | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form
  const [lName, setLName] = useState('')
  const [lPhone, setLPhone] = useState('')
  const [lPassword, setLPassword] = useState('')
  const [lAvailable, setLAvailable] = useState(true)

  const token = typeof window !== 'undefined' ? localStorage.getItem('bm_token') : null

  const fetchLivreurs = useCallback(async () => {
    try {
      const res = await fetch('/api/livreurs', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setLivreurs(await res.json())
    } catch {
      console.error('Fetch error')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchLivreurs()
  }, [fetchLivreurs])

  const openNew = () => {
    setEditingLivreur(null)
    setLName('')
    setLPhone('')
    setLPassword('')
    setLAvailable(true)
    setDialog(true)
  }

  const openEdit = (livreur: Livreur) => {
    setEditingLivreur(livreur)
    setLName(livreur.name)
    setLPhone(livreur.phone || '')
    setLPassword('')
    setLAvailable(livreur.isAvailable)
    setDialog(true)
  }

  const saveLivreur = async () => {
    if (!editingLivreur && (!lName || !lPhone || !lPassword)) {
      setMessage({ type: 'error', text: 'Nom, téléphone et mot de passe requis' })
      return
    }
    if (!lName) {
      setMessage({ type: 'error', text: 'Nom requis' })
      return
    }

    setSaving(true)
    try {
      const url = editingLivreur ? `/api/livreurs/${editingLivreur.id}` : '/api/livreurs'
      const method = editingLivreur ? 'PATCH' : 'POST'
      const body: Record<string, unknown> = {
        name: lName,
        isAvailable: lAvailable,
      }

      if (!editingLivreur) {
        body.phone = lPhone
        body.password = lPassword
      } else {
        if (lPhone) body.phone = lPhone
        if (lPassword) body.password = lPassword
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

      setMessage({ type: 'success', text: editingLivreur ? 'Livreur mis à jour' : 'Livreur créé' })
      setDialog(false)
      fetchLivreurs()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur' })
    } finally {
      setSaving(false)
    }
  }

  const toggleAvailable = async (livreur: Livreur) => {
    try {
      const res = await fetch(`/api/livreurs/${livreur.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isAvailable: !livreur.isAvailable }),
      })
      if (res.ok) fetchLivreurs()
    } catch {
      setMessage({ type: 'error', text: 'Erreur' })
    }
  }

  const openDelete = (livreur: Livreur) => {
    setDeletingLivreur(livreur)
    setDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!deletingLivreur) return
    setSaving(true)
    try {
      const res = await fetch(`/api/livreurs/${deletingLivreur.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }
      setMessage({ type: 'success', text: 'Livreur supprimé' })
      setDeleteDialog(false)
      setDeletingLivreur(null)
      fetchLivreurs()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur' })
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (livreur: Livreur) => {
    if (!livreur.isAvailable) {
      return <Badge className="bg-stone-200 text-stone-600 border-0">Hors ligne</Badge>
    }
    if (livreur.orderCounts.active > 0) {
      return <Badge className="bg-blue-100 text-blue-700 border-0">En livraison</Badge>
    }
    return <Badge className="bg-emerald-100 text-emerald-700 border-0">Disponible</Badge>
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
          <h1 className="text-2xl font-extrabold text-stone-900">Livreurs</h1>
          <p className="text-sm text-stone-500 mt-1">{livreurs.length} livreur{livreurs.length !== 1 ? 's' : ''} enregistré{livreurs.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openNew} className="min-h-[48px] bg-bm-primary hover:bg-bm-primary-600 text-stone-900">
          <Plus className="h-4 w-4 mr-2" /> Nouveau Livreur
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
        {livreurs.map((livreur) => (
          <Card key={livreur.id} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-bm-primary-100 flex items-center justify-center">
                    <Bike className="h-5 w-5 text-bm-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900">{livreur.name}</p>
                    <p className="text-sm text-stone-500 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {livreur.phone || '-'}
                    </p>
                  </div>
                </div>
                {getStatusBadge(livreur)}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-sm mb-3">
                <div className="bg-stone-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-stone-900">{livreur.orderCounts.total}</p>
                  <p className="text-xs text-stone-500">Total</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-blue-700">{livreur.orderCounts.active}</p>
                  <p className="text-xs text-stone-500">En cours</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-emerald-700">{livreur.orderCounts.delivered}</p>
                  <p className="text-xs text-stone-500">Livrées</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch checked={livreur.isAvailable} onCheckedChange={() => toggleAvailable(livreur)} />
                  <span className="text-sm text-stone-600">Disponible</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(livreur)} className="min-h-[44px] border-bm-primary text-bm-primary">
                    <Pencil className="h-4 w-4 mr-1" /> Modifier
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openDelete(livreur)} className="min-h-[44px] border-red-300 text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
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
                <TableHead>Nom</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead className="text-center">Commandes</TableHead>
                <TableHead className="text-center">Disponible</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {livreurs.map((livreur) => (
                <TableRow key={livreur.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-bm-primary-100 flex items-center justify-center">
                        <Bike className="h-4 w-4 text-bm-primary" />
                      </div>
                      <span className="font-semibold">{livreur.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{livreur.phone || '-'}</TableCell>
                  <TableCell className="text-center">{getStatusBadge(livreur)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <span className="text-stone-500">{livreur.orderCounts.total} total</span>
                      <span className="text-blue-600">({livreur.orderCounts.active} active)</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={livreur.isAvailable} onCheckedChange={() => toggleAvailable(livreur)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(livreur)} className="h-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openDelete(livreur)} className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {livreurs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-stone-400">
                    Aucun livreur enregistré
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Livreur Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLivreur ? 'Modifier le livreur' : 'Nouveau livreur'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nom *</Label>
              <Input value={lName} onChange={(e) => setLName(e.target.value)} className="input-bm mt-1" placeholder="Nom du livreur" />
            </div>
            <div>
              <Label>Téléphone {editingLivreur ? '' : '*'}</Label>
              <Input value={lPhone} onChange={(e) => setLPhone(e.target.value)} className="input-bm mt-1" placeholder="0XXXXXXXXX" type="tel" />
            </div>
            <div>
              <Label>{editingLivreur ? 'Nouveau mot de passe (laisser vide si inchangé)' : 'Mot de passe *'}</Label>
              <Input value={lPassword} onChange={(e) => setLPassword(e.target.value)} className="input-bm mt-1" placeholder="••••••••" type="password" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={lAvailable} onCheckedChange={setLAvailable} />
              <Label>Disponible</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialog(false)} className="min-h-[48px]">Annuler</Button>
            <Button onClick={saveLivreur} disabled={saving} className="min-h-[48px] bg-bm-primary hover:bg-bm-primary-600 text-stone-900">
              {saving ? 'Enregistrement...' : editingLivreur ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-stone-600">
              Êtes-vous sûr de vouloir supprimer le livreur <span className="font-bold">{deletingLivreur?.name}</span> ?
            </p>
            <p className="text-sm text-red-600 mt-3">
              ⚠️ Cette action est irréversible. Le livreur perdra immédiatement l'accès à son compte.
            </p>
            <p className="text-xs text-stone-500 mt-2">
              Note: Les commandes historiques associées à ce livreur seront conservées.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog(false)} disabled={saving} className="min-h-[48px]">
              Annuler
            </Button>
            <Button onClick={confirmDelete} disabled={saving} className="min-h-[48px] bg-red-600 hover:bg-red-700 text-white">
              {saving ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
