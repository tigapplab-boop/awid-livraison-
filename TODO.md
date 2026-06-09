# 📋 TODO - Burger Minute

## ✅ COMPLÉTÉ - SESSION ACTUELLE

### Fix build error - Prisma import
- [x] Corrigé import `@/bm/lib/prisma` → `@/lib/db`
- [x] Aligné avec tous les autres routes API
- [x] Build Next.js réussit maintenant
- [x] Redéployé sur Coolify

### Fix icônes dans champs de saisie
- [x] Augmentation du padding left/right de pl-12 à pl-14
- [x] Texte ne chevauche plus les icônes
- [x] Meilleure lisibilité pendant la saisie
- [x] Fix appliqué sur tous les champs (nom, téléphone, adresse, notes)

### Photo de couverture menu client
- [x] Ajout champ `COVER_IMAGE` dans SystemSettings
- [x] API `/api/settings/cover` (GET, POST, PATCH, DELETE)
- [x] Interface admin dans page Promo (onglet "Photo de Couverture")
- [x] Upload/suppression d'image
- [x] Toggle activation/désactivation
- [x] Affichage automatique sur page `/menu` client
- [x] Migration Prisma créée

### Boutons +/- pour quantités produits
- [x] Ajout fonction `decrementItem()` dans cart.tsx
- [x] Modification ProductCard avec boutons + et -
- [x] Affichage quantité entre les boutons
- [x] Logique: si qty > 1 → décrémente, si qty = 1 → supprime
- [x] Feedback haptique sur les deux boutons
- [x] Interface intuitive et tactile

## ✅ SESSION PRÉCÉDENTE COMPLÉTÉE

1. Livreur indisponible (push notifications + dashboard)
2. Suppression livreur et produits
3. Badge NOUVEAU sur produits (isNew + sortOrder)
4. Ticket cuisine amélioré (80mm thermal)
5. Rapports journaliers avec export PDF
6. Responsive fixes (boutons admin visibles)
7. Logout vers /menu au lieu de /login
8. Photos produits dans POS
9. Vérification phase 6 complète

## 📝 NOTES TECHNIQUES - SESSION ACTUELLE

### Fichiers modifiés:

**Cover Image:**
- `prisma/schema.prisma` (commentaire COVER_IMAGE key)
- `src/app/api/settings/cover/route.ts` (NEW - API complète)
- `src/app/admin/promo/page.tsx` (nouvel onglet)
- `src/app/menu/page.tsx` (affichage cover si enabled)
- `prisma/migrations/20240609_add_cover_image_setting/migration.sql`

**Boutons +/-:**
- `src/bm/lib/cart.tsx` (ajout `decrementItem()`)
- `src/components/menu/ProductCard.tsx` (boutons +/- conditionnels)
- `src/app/menu/page.tsx` (handleRemoveProduct avec decrementItem)

### Utilisation Admin:

1. **Upload couverture:**
   - Admin → Gestion des Promos → Onglet "Photo de Couverture"
   - Cliquer zone upload → Sélectionner image (max 5MB)
   - Toggle "Afficher la couverture" pour activer/désactiver
   - Bouton poubelle pour supprimer

2. **Résultat client:**
   - Page `/menu` affiche l'image en haut (si activée)
   - Dimensions recommandées: 1200x400px
   - Responsive automatique

### Comportement boutons +/-:

- **Panier vide**: Bouton `+` uniquement
- **1 item dans panier**: Boutons `-` `1` `+` apparaissent
- **Clic sur `-`**: 
  - Si qty > 1 → Décrémente de 1
  - Si qty = 1 → Supprime du panier (avec suppléments attachés)
- **Clic sur `+`**: Ajoute 1 au panier

## 🎯 PROCHAINES ÉTAPES

1. Tester l'upload de couverture sur Coolify
2. Vérifier comportement boutons +/- sur mobile
3. S'assurer que les images uploadées persistent après redéploiement

## 🚀 DÉPLOIEMENT

**Commandes à exécuter:**
```bash
npx prisma generate
git add .
git commit -m "feat: cover image + quantity buttons +/-"
git push origin main
```

**Après déploiement Coolify:**
- La migration sera appliquée automatiquement (vide, juste documentation)
- Le dossier /uploads est persistant (volume Docker)
- Tester upload d'image depuis admin
- Vérifier affichage sur /menu
