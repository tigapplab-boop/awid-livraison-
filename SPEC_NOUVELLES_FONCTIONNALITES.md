# 📋 SPÉCIFICATION COMPLÈTE - Nouvelles Fonctionnalités

## ✅ CLARIFICATIONS VALIDÉES

### Sauces:
- ✅ **Gratuites** (pas de prix)
- ✅ **Pas de limitation** (client peut choisir plusieurs)
- ✅ **Pas de mention sur facture/commande** (invisible côté prix)
- ✅ **Juste pour préférence client**

### Stock:
- ✅ **Déduction automatique UNIQUEMENT pour boissons**
- ✅ Inventaire boissons = Identique aux produits boissons affichés client
- ✅ Quand commande validée → stock boisson -= quantité

### Permissions:
- ✅ **Admin uniquement** pour tout (sauces, inventaire, achats)

---

## 🗂️ BASE DE DONNÉES (Schema Prisma)

### Nouveau Modèle: Sauces
```prisma
model Sauce {
  id          String   @id @default(uuid())
  name        String   // Ex: "Sauce Algérienne"
  nameAr      String?  // Ex: "صلصة جزائرية"
  isAvailable Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  
  // Relation avec commandes
  orderItemSauces OrderItemSauce[]
  
  @@map("sauces")
}

// Pivot: Sauces choisies pour un item
model OrderItemSauce {
  id          String    @id @default(uuid())
  orderItemId String
  orderItem   OrderItem @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  sauceId     String
  sauce       Sauce     @relation(fields: [sauceId], references: [id])
  
  @@map("order_item_sauces")
}
```

### Modification Modèle Existant: OrderItem
```prisma
model OrderItem {
  // ... champs existants ...
  sauces OrderItemSauce[] // AJOUT
}
```

### Modification Modèle Existant: Product
```prisma
model Product {
  // ... champs existants ...
  
  // AJOUT pour inventaire boissons
  stockQuantity  Int?     @default(0)  // Stock disponible (NULL si pas boisson)
  minStockAlert  Int?     @default(10) // Alerte si stock < X
  trackStock     Boolean  @default(false) // true = décrémente auto
  unit           String?  @default("unité") // "unité", "bouteille", "canette"
}
```

### Nouveau Modèle: Produits d'Achat (Inventaire)
```prisma
model InventoryProduct {
  id             String   @id @default(uuid())
  name           String   // "Coca Cola 1.5L"
  nameAr         String?
  supplier       String   // "Hamoud Boualem"
  category       String   // "Boissons", "Viandes", "Pain", etc.
  unit           String   // "carton", "kg", "pièce"
  
  // Prix
  purchasePrice  Int      // Prix d'achat unitaire (centimes)
  sellingPrice   Int      // Prix de vente unitaire (centimes)
  
  // Stock
  currentStock   Float    @default(0) // Stock actuel
  minStock       Float    @default(0) // Alerte si < X
  
  // Relation avec produit menu (optionnel)
  linkedProductId String? @unique
  linkedProduct   Product? @relation(fields: [linkedProductId], references: [id])
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  // Relations
  purchases      Purchase[]
  
  @@index([category])
  @@index([supplier])
  @@map("inventory_products")
}

// Relation Product → InventoryProduct
model Product {
  // ... existant ...
  inventoryProduct InventoryProduct?
}
```

### Nouveau Modèle: Achats
```prisma
model Purchase {
  id               String           @id @default(uuid())
  purchaseNumber   String           @unique // ACH-YYMMDD-XXX
  
  productId        String
  product          InventoryProduct @relation(fields: [productId], references: [id])
  
  quantity         Float            // 10 cartons, 5.5 kg, etc.
  unitPrice        Int              // Prix unitaire (centimes)
  totalAmount      Int              // quantity × unitPrice
  
  supplier         String           // Nom grossiste
  
  // Paiement
  isPaid           Boolean          @default(false)
  paidAt           DateTime?
  paymentMethod    String?          // "Espèces", "Virement", "Chèque"
  
  notes            String?
  invoiceNumber    String?
  purchaseDate     DateTime         @default(now())
  createdAt        DateTime         @default(now())
  
  @@index([isPaid])
  @@index([supplier])
  @@index([purchaseDate])
  @@map("purchases")
}
```

---

## 🛣️ API ENDPOINTS

### 1. Sauces (Admin)
```
GET    /api/sauces              - Liste toutes sauces
POST   /api/sauces              - Créer sauce
PATCH  /api/sauces/:id          - Modifier sauce
DELETE /api/sauces/:id          - Supprimer sauce
PATCH  /api/sauces/reorder      - Réorganiser ordre
```

### 2. Inventaire - Produits
```
GET    /api/inventory/products             - Liste produits inventaire
POST   /api/inventory/products             - Créer produit
GET    /api/inventory/products/:id         - Détail produit
PATCH  /api/inventory/products/:id         - Modifier produit
DELETE /api/inventory/products/:id         - Supprimer produit
GET    /api/inventory/products/:id/profit  - Calcul bénéfice
```

### 3. Inventaire - Achats
```
GET    /api/inventory/purchases                - Liste achats (filtres: isPaid, supplier, dates)
POST   /api/inventory/purchases                - Enregistrer achat
GET    /api/inventory/purchases/:id            - Détail achat
PATCH  /api/inventory/purchases/:id            - Modifier achat
DELETE /api/inventory/purchases/:id            - Supprimer achat
POST   /api/inventory/purchases/:id/pay        - Marquer payé
POST   /api/inventory/purchases/pay-multiple   - Payer plusieurs
```

### 4. Inventaire - Rapports
```
GET    /api/inventory/reports/debts      - Dettes par fournisseur
GET    /api/inventory/reports/profits    - Bénéfices par produit
GET    /api/inventory/reports/stock      - État stock avec alertes
GET    /api/inventory/reports/summary    - Résumé global
```

### 5. Produits Menu (Ajout gestion stock)
```
PATCH  /api/products/:id/stock           - Ajuster stock manuellement
GET    /api/products/low-stock           - Produits en alerte stock
```

---

## 🎨 FRONTEND - Pages Admin

### 1. Page: `/admin/sauces`
**Composants**:
- Liste des sauces (table ou cards)
- Bouton "Ajouter sauce"
- Actions: Modifier, Supprimer, Activer/Désactiver
- Drag & drop pour réorganiser

**Features**:
- Nom FR + AR
- Toggle disponible
- Ordre d'affichage

### 2. Page: `/admin/inventory`
**Tabs**:

#### Tab 1: Produits
**Table**: 
| Produit | Catégorie | Fournisseur | Prix Achat | Prix Vente | Bénéfice | Marge% | Stock | Actions |

**Calculs automatiques**:
- Bénéfice = Prix Vente - Prix Achat
- Marge% = (Bénéfice / Prix Achat) × 100

**Features**:
- Filtres par catégorie, fournisseur
- Alerte rouge si stock < minStock
- Modal: Ajouter/Modifier produit
- Lien vers produit menu si applicable

#### Tab 2: Achats
**Table**:
| Date | N° Facture | Produit | Qté | Prix Unit | Total | Fournisseur | Statut | Actions |

**Statut**:
- Badge vert: Payé
- Badge rouge: Impayé

**Features**:
- Filtres: Payé/Impayé, Fournisseur, Plage dates
- Modal: Nouvel achat
- Action rapide: Marquer payé
- Sélection multiple → Payer tout

#### Tab 3: Dettes
**Affichage**:
```
Carte par fournisseur:
┌────────────────────────────────┐
│ 🏪 Hamoud Boualem             │
│ Dette: 125,000 DA              │
│ Achats impayés: 5              │
│                                 │
│ [Voir détails] [Tout payer]   │
└────────────────────────────────┘
```

**Détails expandable**:
- Liste des achats impayés
- Date, produit, montant

#### Tab 4: Rapports
**KPIs**:
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Achats ce mois  │ Dettes totales  │ Bénéfice pot.   │ Alertes stock   │
│ 450,000 DA      │ 125,000 DA      │ 180,000 DA      │ 3 produits      │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

**Graphiques**:
- Achats par fournisseur (pie chart)
- Évolution dettes (line chart)
- Top 10 produits par bénéfice (bar chart)

---

## 🎨 FRONTEND - Client

### Modal: Détail Produit
**Route**: `/menu` (modal overlay) ou `/menu/product/:id`

**Contenu**:
```
┌──────────────────────────────────────┐
│         [Image grande]               │
├──────────────────────────────────────┤
│ Burger Classique                     │
│ برغر كلاسيكي                         │
│                                      │
│ Description détaillée du produit     │
│ avec ingrédients...                  │
│                                      │
│ Prix: 450 DA                         │
│                                      │
│ 🍔 Choisir vos sauces (optionnel):  │
│ ☐ Sauce Algérienne                  │
│ ☐ Sauce Harissa                     │
│ ☐ Mayonnaise                         │
│ ☐ Ketchup                            │
│                                      │
│ Quantité: [- 1 +]                    │
│                                      │
│ [Ajouter au panier - 450 DA]        │
└──────────────────────────────────────┘
```

**Comportement**:
- Sauces affichées SI produit = burger/sandwich
- Sélection multiple
- Pas de prix affiché pour sauces
- Au panier: "Burger + Sauce Algérienne, Harissa"

---

## 🔄 LOGIQUE MÉTIER

### 1. Déduction Stock Automatique

**Trigger**: Quand commande passe de `PENDING` → `CONFIRMED`

```typescript
async function decrementBeverageStock(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { 
      items: { 
        include: { product: true } 
      } 
    }
  })
  
  for (const item of order.items) {
    if (item.product.trackStock) {
      // Décrémenter stock
      await db.product.update({
        where: { id: item.product.id },
        data: {
          stockQuantity: {
            decrement: item.quantity
          }
        }
      })
      
      // Vérifier alerte stock
      const updated = await db.product.findUnique({
        where: { id: item.product.id }
      })
      
      if (updated.stockQuantity <= updated.minStockAlert) {
        // Envoyer notification admin
        sendStockAlert(updated)
      }
    }
  }
}
```

### 2. Calcul Bénéfice

```typescript
function calculateProfit(purchasePrice: number, sellingPrice: number) {
  const profit = sellingPrice - purchasePrice
  const margin = ((profit / purchasePrice) * 100).toFixed(2)
  
  return { profit, margin }
}
```

### 3. Enregistrement Achat

```typescript
async function createPurchase(data) {
  const purchase = await db.purchase.create({
    data: {
      ...data,
      totalAmount: data.quantity * data.unitPrice,
      purchaseNumber: generatePurchaseNumber() // ACH-260610-001
    }
  })
  
  // Incrémenter stock produit
  await db.inventoryProduct.update({
    where: { id: data.productId },
    data: {
      currentStock: {
        increment: data.quantity
      }
    }
  })
  
  // Si lié à un produit menu (boisson), update aussi
  const invProduct = await db.inventoryProduct.findUnique({
    where: { id: data.productId },
    include: { linkedProduct: true }
  })
  
  if (invProduct.linkedProduct) {
    await db.product.update({
      where: { id: invProduct.linkedProduct.id },
      data: {
        stockQuantity: {
          increment: data.quantity
        }
      }
    })
  }
  
  return purchase
}
```

---

## 📊 RAPPORTS & STATISTIQUES

### Rapport Dettes
```typescript
interface DebtReport {
  supplier: string
  totalDebt: number      // Somme totale impayée
  purchaseCount: number  // Nombre d'achats impayés
  purchases: Purchase[]  // Liste détaillée
  oldestPurchase: Date   // Plus ancien impayé
}
```

### Rapport Bénéfices
```typescript
interface ProfitReport {
  productId: string
  productName: string
  purchasePrice: number
  sellingPrice: number
  profit: number
  profitMargin: number
  currentStock: number
  potentialProfit: number // profit × stock
}
```

### Rapport Stock
```typescript
interface StockReport {
  productId: string
  productName: string
  currentStock: number
  minStock: number
  status: 'OK' | 'LOW' | 'OUT' // OK, Alerte, Rupture
  daysUntilEmpty: number // Estimation basée sur ventes
}
```

---

## 🎯 NAVIGATION MISE À JOUR

### Admin Sidebar (layout.tsx):
```typescript
const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/pos', label: 'POS / Caisse', icon: ShoppingCart },
  { href: '/admin/products', label: 'Produits', icon: Package },
  { href: '/admin/promo', label: 'Promos', icon: Megaphone },
  { href: '/admin/hours', label: 'Horaires', icon: Clock },
  { href: '/admin/sauces', label: 'Sauces', icon: Droplet }, // NOUVEAU
  { href: '/admin/inventory', label: 'Inventaire', icon: Warehouse }, // NOUVEAU
  { href: '/admin/zones', label: 'Zones', icon: MapPin },
  { href: '/admin/livreurs', label: 'Livreurs', icon: Bike },
  { href: '/admin/contacts', label: 'Contacts', icon: Phone },
  { href: '/admin/statistics', label: 'Statistiques', icon: BarChart3 },
  { href: '/admin/finance', label: 'Finance', icon: DollarSign },
]
```

---

## 📦 STRUCTURE FICHIERS

```
src/
├── app/
│   ├── admin/
│   │   ├── sauces/
│   │   │   └── page.tsx                    # Gestion sauces
│   │   └── inventory/
│   │       └── page.tsx                    # Inventaire complet (4 tabs)
│   ├── api/
│   │   ├── sauces/
│   │   │   ├── route.ts                    # GET, POST
│   │   │   ├── [id]/
│   │   │   │   └── route.ts                # PATCH, DELETE
│   │   │   └── reorder/
│   │   │       └── route.ts                # PATCH
│   │   ├── inventory/
│   │   │   ├── products/
│   │   │   │   ├── route.ts                # GET, POST
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts            # GET, PATCH, DELETE
│   │   │   │       └── profit/route.ts     # GET
│   │   │   ├── purchases/
│   │   │   │   ├── route.ts                # GET, POST
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── route.ts            # GET, PATCH, DELETE
│   │   │   │   │   └── pay/route.ts        # POST
│   │   │   │   └── pay-multiple/route.ts   # POST
│   │   │   └── reports/
│   │   │       ├── debts/route.ts
│   │   │       ├── profits/route.ts
│   │   │       ├── stock/route.ts
│   │   │       └── summary/route.ts
│   │   └── products/
│   │       └── [id]/
│   │           └── stock/route.ts          # PATCH (ajuster stock)
│   └── menu/
│       └── product/
│           └── [id]/
│               └── page.tsx                # Détail produit client (optionnel)
├── components/
│   ├── menu/
│   │   ├── ProductDetailModal.tsx          # Modal détail produit
│   │   └── SauceSelector.tsx               # Sélecteur sauces
│   ├── admin/
│   │   ├── sauces/
│   │   │   ├── SauceList.tsx
│   │   │   └── SauceForm.tsx
│   │   └── inventory/
│   │       ├── ProductsTab.tsx             # Tab 1
│   │       ├── PurchasesTab.tsx            # Tab 2
│   │       ├── DebtsTab.tsx                # Tab 3
│   │       ├── ReportsTab.tsx              # Tab 4
│   │       ├── ProductForm.tsx
│   │       ├── PurchaseForm.tsx
│   │       └── DebtCard.tsx
│   └── ui/
│       └── (shadcn components)
├── lib/
│   └── inventory/
│       ├── calculations.ts                 # Calculs bénéfices, marges
│       └── stock-manager.ts                # Gestion stock automatique
└── prisma/
    ├── schema.prisma                       # Modèles mis à jour
    └── migrations/
        └── YYYYMMDD_add_sauces_and_inventory/
            └── migration.sql
```

---

## 🔧 MIGRATIONS PRISMA

### Ordre d'exécution:
```bash
1. Modifier prisma/schema.prisma avec nouveaux modèles
2. npx prisma migrate dev --name add_sauces_and_inventory
3. npx prisma generate
4. Seed sauces par défaut + catégories inventaire
```

### Seed Initial:
```typescript
// Sauces par défaut
const sauces = [
  { name: 'Sauce Algérienne', nameAr: 'صلصة جزائرية', sortOrder: 1 },
  { name: 'Harissa', nameAr: 'هريسة', sortOrder: 2 },
  { name: 'Mayonnaise', nameAr: 'مايونيز', sortOrder: 3 },
  { name: 'Ketchup', nameAr: 'كاتشب', sortOrder: 4 },
  { name: 'Moutarde', nameAr: 'خردل', sortOrder: 5 },
]

// Catégories inventaire
const categories = ['Boissons', 'Viandes', 'Pain', 'Légumes', 'Sauces', 'Emballages', 'Divers']
```

---

## ⚙️ CONFIGURATION

### Variables d'environnement (optionnel):
```env
# Alerte email stock bas
STOCK_ALERT_EMAIL=admin@burgerminute.dz

# Seuil alerte générale
DEFAULT_MIN_STOCK=10

# Auto-décrémentation
AUTO_TRACK_BEVERAGES=true
```

---

## 🎨 UI/UX DESIGN

### Couleurs Sémantiques:
- **Payé**: `bg-green-100 text-green-700`
- **Impayé**: `bg-red-100 text-red-700`
- **Alerte Stock**: `bg-orange-100 text-orange-700`
- **Bénéfice Positif**: `text-green-600`
- **Marge élevée** (>30%): `text-emerald-600 font-bold`

### Icons:
- Inventaire: `Warehouse`
- Sauces: `Droplet`
- Achat: `ShoppingBag`
- Dette: `AlertTriangle`
- Bénéfice: `TrendingUp`
- Stock OK: `CheckCircle`
- Stock Bas: `AlertCircle`

---

## ✅ CHECKLIST IMPLÉMENTATION

### Phase 1: Base de données
- [ ] Ajouter modèles Sauce, OrderItemSauce
- [ ] Ajouter modèles InventoryProduct, Purchase
- [ ] Modifier Product (stockQuantity, trackStock)
- [ ] Modifier OrderItem (relation sauces)
- [ ] Migration Prisma
- [ ] Seed initial

### Phase 2: Backend API
- [ ] API Sauces (CRUD complet)
- [ ] API Inventory Products (CRUD)
- [ ] API Purchases (CRUD + paiement)
- [ ] API Reports (4 endpoints)
- [ ] Logic: Stock auto-decrement
- [ ] Logic: Calculs bénéfices

### Phase 3: Frontend Admin
- [ ] Page /admin/sauces
- [ ] Page /admin/inventory (4 tabs)
- [ ] Navigation sidebar update
- [ ] Composants réutilisables

### Phase 4: Frontend Client
- [ ] Modal ProductDetail
- [ ] SauceSelector component
- [ ] Intégration au panier
- [ ] Affichage commande avec sauces

### Phase 5: Tests & Polish
- [ ] Test déduction stock boissons
- [ ] Test calcul bénéfices
- [ ] Test rapports dettes
- [ ] Responsive mobile
- [ ] Documentation

---

## 📊 ESTIMATION

- **Temps total**: 8-10 heures
- **Phase 1** (DB): 1h
- **Phase 2** (API): 3h
- **Phase 3** (Admin UI): 3h
- **Phase 4** (Client UI): 1h
- **Phase 5** (Tests): 2h

---

## 🚀 DÉPLOIEMENT

1. Commit all changes
2. Push to GitHub
3. Coolify auto-deploy
4. Run migrations en production
5. Seed sauces initiales
6. Test complet

---

**Prêt à commencer l'implémentation?** 🚀
