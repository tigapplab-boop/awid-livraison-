'use client'

import { useState } from 'react'
import { Warehouse } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProductsTab from '@/components/admin/inventory/ProductsTab'
import PurchasesTab from '@/components/admin/inventory/PurchasesTab'
import DebtsTab from '@/components/admin/inventory/DebtsTab'
import ReportsTab from '@/components/admin/inventory/ReportsTab'

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('products')

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-stone-900 flex items-center gap-3">
          <Warehouse className="h-8 w-8 text-bm-primary" />
          Inventaire & Achats
        </h1>
        <p className="text-stone-500 mt-1">
          Gestion complète des produits d'achat, stocks et fournisseurs
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="products">Produits</TabsTrigger>
          <TabsTrigger value="purchases">Achats</TabsTrigger>
          <TabsTrigger value="debts">Dettes</TabsTrigger>
          <TabsTrigger value="reports">Rapports</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <ProductsTab />
        </TabsContent>

        <TabsContent value="purchases">
          <PurchasesTab />
        </TabsContent>

        <TabsContent value="debts">
          <DebtsTab />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
