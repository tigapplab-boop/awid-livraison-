'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, GripVertical, Droplet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface Sauce {
  id: string
  name: string
  nameAr: string | null
  isAvailable: boolean
  sortOrder: number
}

export default function SaucesPage() {
  const [sauces, setSauces] = useState<Sauce[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSauce, setEditingSauce] = useState<Sauce | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    isAvailable: true,
  })

  // Jeton de connexion à joindre sur chaque requête qui modifie une sauce
  const getAuthHeaders = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('bm_token') : null
    return token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : { 'Content-Type': 'application/json' }
  }

  useEffect(() => {
    fetchSauces()
  }, [])

  const fetchSauces = async () => {
    try {
      const res = await fetch('/api/sauces')
      const data = await res.json()
      setSauces(data)
    } catch (error) {
      console.error('Failed to fetch sauces:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingSauce(null)
    setFormData({ name: '', nameAr: '', isAvailable: true })
    setDialogOpen(true)
  }

  const handleEdit = (sauce: Sauce) => {
    setEditingSauce(sauce)
    setFormData({
      name: sauce.name,
      nameAr: sauce.nameAr || '',
      isAvailable: sauce.isAvailable,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      const res = editingSauce
        ? await fetch(`/api/sauces/${editingSauce.id}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData),
          })
        : await fetch('/api/sauces', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData),
          })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || `Erreur lors de la sauvegarde (${res.status})`)
        return
      }

      setDialogOpen(false)
      fetchSauces()
    } catch (error) {
      console.error('Failed to save sauce:', error)
      alert('Erreur réseau lors de la sauvegarde')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette sauce ?')) return

    try {
      const res = await fetch(`/api/sauces/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || `Erreur lors de la suppression (${res.status})`)
        return
      }
      fetchSauces()
    } catch (error) {
      console.error('Failed to delete sauce:', error)
      alert('Erreur réseau lors de la suppression')
    }
  }

  const handleToggleAvailability = async (sauce: Sauce) => {
    try {
      const res = await fetch(`/api/sauces/${sauce.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isAvailable: !sauce.isAvailable }),
      })
      if (!res.ok) {
        console.error('Failed to toggle availability:', res.status)
        return
      }
      fetchSauces()
    } catch (error) {
      console.error('Failed to toggle availability:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-stone-900 flex items-center gap-3">
              <Droplet className="h-8 w-8 text-bm-primary" />
              Gestion des Sauces
            </h1>
            <p className="text-stone-500 mt-1">
              Gérer les sauces disponibles pour les burgers
            </p>
          </div>
          <Button
            onClick={handleCreate}
            className="bg-bm-primary hover:bg-bm-primary/90 text-stone-900 font-bold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une sauce
          </Button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-sm text-blue-900">
          ℹ️ <strong>Sauces gratuites :</strong> Les sauces sont offertes gratuitement
          et ne sont pas affichées sur la facture. Les clients peuvent en choisir
          plusieurs.
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Nom (FR)</TableHead>
              <TableHead>Nom (AR)</TableHead>
              <TableHead>Disponible</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sauces.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-stone-500">
                  Aucune sauce. Cliquez sur "Ajouter une sauce" pour commencer.
                </TableCell>
              </TableRow>
            ) : (
              sauces.map((sauce) => (
                <TableRow key={sauce.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-stone-400" />
                  </TableCell>
                  <TableCell className="font-medium">{sauce.name}</TableCell>
                  <TableCell>
                    <span className="text-stone-600" dir="rtl">
                      {sauce.nameAr || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={sauce.isAvailable ? 'default' : 'secondary'}
                      className={
                        sauce.isAvailable
                          ? 'bg-green-100 text-green-700'
                          : 'bg-stone-200 text-stone-600'
                      }
                    >
                      {sauce.isAvailable ? 'Disponible' : 'Indisponible'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleAvailability(sauce)}
                      >
                        <Switch checked={sauce.isAvailable} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(sauce)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(sauce.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSauce ? 'Modifier la sauce' : 'Ajouter une sauce'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Nom (Français) *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Sauce Algérienne"
              />
            </div>
            <div>
              <Label htmlFor="nameAr">Nom (Arabe)</Label>
              <Input
                id="nameAr"
                value={formData.nameAr}
                onChange={(e) =>
                  setFormData({ ...formData, nameAr: e.target.value })
                }
                placeholder="Ex: صلصة جزائرية"
                dir="rtl"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isAvailable}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isAvailable: checked })
                }
              />
              <Label>Disponible</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name}
              className="bg-bm-primary hover:bg-bm-primary/90 text-stone-900"
            >
              {editingSauce ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
