'use client'

import { useState, useEffect } from 'react'
import { Droplet } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface Sauce {
  id: string
  name: string
  nameAr: string | null
  isAvailable: boolean
  sortOrder: number
}

interface SauceSelectorProps {
  selectedSauces: string[]
  onSelectionChange: (sauceIds: string[]) => void
  language: 'fr' | 'ar'
}

export default function SauceSelector({
  selectedSauces,
  onSelectionChange,
  language,
}: SauceSelectorProps) {
  const [sauces, setSauces] = useState<Sauce[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSauces()
  }, [])

  const fetchSauces = async () => {
    try {
      const res = await fetch('/api/sauces?available=true')
      const data = await res.json()
      setSauces(data)
    } catch (error) {
      console.error('Failed to fetch sauces:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (sauceId: string) => {
    if (selectedSauces.includes(sauceId)) {
      onSelectionChange(selectedSauces.filter((id) => id !== sauceId))
    } else {
      onSelectionChange([...selectedSauces, sauceId])
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-stone-200 rounded w-32 mb-2"></div>
        <div className="space-y-2">
          <div className="h-8 bg-stone-100 rounded"></div>
          <div className="h-8 bg-stone-100 rounded"></div>
        </div>
      </div>
    )
  }

  if (sauces.length === 0) {
    return null
  }

  return (
    <div>
      <label
        className="block text-sm font-medium text-stone-700 mb-3 flex items-center gap-2"
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        <Droplet className="h-4 w-4 text-bm-primary" />
        {language === 'ar' ? 'اختر الصلصات (اختياري)' : 'Choisir vos sauces (optionnel)'}
      </label>

      <div className="space-y-3">
        {sauces.map((sauce) => {
          const sauceName = language === 'ar' && sauce.nameAr ? sauce.nameAr : sauce.name
          const isChecked = selectedSauces.includes(sauce.id)

          return (
            <div
              key={sauce.id}
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${
                isChecked
                  ? 'border-bm-primary bg-bm-primary/5'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
              onClick={() => handleToggle(sauce.id)}
              dir={language === 'ar' ? 'rtl' : 'ltr'}
            >
              <Checkbox
                id={sauce.id}
                checked={isChecked}
                onCheckedChange={() => handleToggle(sauce.id)}
              />
              <Label
                htmlFor={sauce.id}
                className="flex-1 cursor-pointer font-medium text-stone-900"
              >
                {sauceName}
              </Label>
            </div>
          )
        })}
      </div>

      {selectedSauces.length > 0 && (
        <p
          className="text-xs text-stone-500 mt-3"
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          {language === 'ar'
            ? `✓ ${selectedSauces.length} صلصة محددة (مجانية)`
            : `✓ ${selectedSauces.length} sauce(s) sélectionnée(s) (gratuite)`}
        </p>
      )}
    </div>
  )
}
