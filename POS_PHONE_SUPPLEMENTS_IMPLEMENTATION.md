# Implémentation Sélection Suppléments/Sauces pour POS et Téléphone

**Date**: 27 juin 2026  
**Statut**: ✅ Complété  
**Priorité**: HAUTE (Ouverture demain)

---

## 🎯 Objectif

Permettre la sélection de suppléments et sauces avec affiliation au burger dans:
- ✅ POS (Point de Vente sur place)
- ✅ Vente par téléphone

Comme dans le système client, les suppléments et sauces doivent être attachés à un burger spécifique quand il y en a plusieurs dans le panier.

---

## 📋 Modifications Effectuées

### 1. Base de données (Prisma Schema)

**Fichier**: `prisma/schema.prisma`

Ajout du champ `attachedToProductId` au modèle `OrderItem`:

```prisma
model OrderItem {
  // ...
  attachedToProductId String? // Pour les suppléments/sauces : à quel produit cet item est attaché
  // ...
}
```

**Migration SQL**: `prisma/migrations/add_attached_to_product_id.sql`

---

### 2. Page POS (`src/app/admin/pos/page.tsx`)

#### Changements majeurs:

1. **Interface CartItem mise à jour**:
   ```typescript
   interface CartItem {
     product: Product
     quantity: number
     attachedToProductId?: string
   }
   ```

2. **Fonctions de détection ajoutées**:
   - `isSupplement()` - Détecte si produit est un supplément
   - `isSauce()` - Détecte si produit est une sauce
   - `isBurger()` - Détecte si produit est un burger

3. **Nouvelles states pour pickers**:
   - `supplementPickerOpen` / `pendingSupplement`
   - `saucePickerOpen` / `pendingSauce`

4. **Logique d'ajout au panier refactorisée**:
   - `addToCart()` - Route vers supplement/sauce/produit normal
   - `handleAddSupplement()` - Gère l'ajout de suppléments
   - `handleAddSauce()` - Gère l'ajout de sauces
   - Détection automatique du nombre de burgers
   - Affiche picker si plusieurs burgers
   - Ajout automatique si 1 seul burger
   - Ajout standalone si 0 burger

5. **Affichage cart amélioré**:
   - Produits principaux affichés normalement
   - Suppléments/sauces attachés affichés en sous-items avec:
     - Indentation visuelle (ml-6)
     - Bordure gauche orange
     - Background bm-primary-50
     - Préfixe "+"
     - Contrôles de quantité indépendants

6. **Gestion suppression cascade**:
   - Supprimer un burger supprime ses suppléments/sauces attachés
   - Réduire quantité à 0 déclenche suppression cascade

7. **Intégration des composants**:
   - `<SupplementPicker>` - Modal de sélection burger pour supplément
   - `<SaucePicker>` - Modal de sélection burger pour sauce

---

### 3. API Routes

#### `/api/orders/pos/route.ts`

**Modifications**:
- Type d'item mis à jour: `{ productId: string; quantity: number; attachedToProductId?: string }`
- Mapping orderItems inclut `attachedToProductId`
- Création OrderItem avec `attachedToProductId: item.attachedToProductId`

#### `/api/orders/phone/route.ts`

**Modifications identiques**:
- Support du champ `attachedToProductId` dans les items
- Sauvegarde en base de données

---

## 🔧 Détection des Catégories

Les catégories sont détectées par leur nom:

```typescript
const SUPPLEMENT_CATEGORY_NAMES = ['Suppléments', 'Supplements', 'suppléments', 'supplements']
const SAUCE_CATEGORY_NAMES = ['Sauces', 'sauces', 'Sauce', 'sauce', 'صلصة', 'صلصات']
```

**Burgers**: Catégories contenant "burger" ou "sandwich" (insensible à la casse)

---

## 🎨 Expérience Utilisateur (POS)

### Scénario 1: Aucun burger dans le panier
- Clic sur supplément/sauce → Ajout direct standalone

### Scénario 2: Un seul burger dans le panier
- Clic sur supplément/sauce → Attachement automatique au burger

### Scénario 3: Plusieurs burgers dans le panier
- Clic sur supplément/sauce → Modal de sélection
- Options:
  - Sélectionner un burger spécifique (avec images, quantités)
  - Bouton "Ajouter sans préciser" (standalone)
  - Bouton "Annuler"

---

## 📱 Affichage Panier POS

### Burger principal
```
┌────────────────────────────────────────┐
│ 🍔 Burger Classic                      │
│ 450 DA × 2                             │
│ [-] 2 [+]                  900 DA   [🗑]│
└────────────────────────────────────────┘
```

### Suppléments/Sauces attachés
```
    ├────────────────────────────────────┐
    │ + Fromage                          │
    │ [-] 1 [+]             100 DA    [🗑]│
    └────────────────────────────────────┘
    ├────────────────────────────────────┐
    │ + Sauce Algérienne                 │
    │ [-] 1 [+]              50 DA    [🗑]│
    └────────────────────────────────────┘
```

---

## 🚀 Déploiement Production

### Étapes requises:

1. **Appliquer migration SQL**:
   ```bash
   psql $DATABASE_URL -f prisma/migrations/add_attached_to_product_id.sql
   ```

2. **Push code sur GitHub**:
   ```bash
   git add .
   git commit -m "feat: POS/Phone supplements/sauces selection with burger affiliation"
   git push origin main
   ```

3. **Redéploiement Coolify**:
   - Le webhook déclenche auto-deploy
   - Build + restart containers
   - Prisma Client regenerated automatiquement

---

## ✅ Checklist Validation

- [x] Schema Prisma mis à jour
- [x] Migration SQL créée
- [x] Prisma Client regénéré localement
- [x] Page POS refactorisée
- [x] API POS mise à jour
- [x] API Phone mise à jour
- [x] TypeScript compile sans erreurs
- [x] Interfaces CartItem harmonisées
- [x] Composants SupplementPicker/SaucePicker intégrés
- [x] Affichage cascade dans panier
- [x] Suppression cascade fonctionnelle
- [ ] Migration SQL appliquée en production
- [ ] Tests en production (après déploiement)

---

## 🔍 Points de Test Requis (Production)

1. **POS - Aucun burger**:
   - Ajouter sauce → doit être standalone
   
2. **POS - Un burger**:
   - Ajouter supplément → doit s'attacher automatiquement
   
3. **POS - Plusieurs burgers**:
   - Ajouter sauce → modal s'ouvre
   - Sélectionner burger → attachement correct
   - "Ajouter sans préciser" → standalone
   
4. **POS - Suppression burger**:
   - Supprimer burger → suppléments attachés disparaissent
   
5. **Téléphone - Mêmes scénarios**

6. **Impression ticket**:
   - Vérifier que suppléments/sauces apparaissent correctement

---

## 📝 Notes Techniques

- **Compatibilité arrière**: Le champ `attachedToProductId` est nullable, donc les anciennes commandes restent valides
- **Performance**: Index ajouté sur `attachedToProductId` pour requêtes optimisées
- **Pattern matching**: Suit exactement le pattern du menu client (`src/app/menu/page.tsx`)
- **Composants réutilisés**: `SupplementPicker` et `SaucePicker` sont les mêmes que pour le client

---

## 🎉 Résultat

Le système POS et vente par téléphone offrent maintenant la même expérience que le système client:
- Suppléments/sauces peuvent être liés à des burgers spécifiques
- Affichage clair de la hiérarchie produit → suppléments
- Workflow intuitif selon nombre de burgers
- Prêt pour l'ouverture demain! 🚀
