# 📋 TODO - Burger Minute

## ✅ SESSION PRÉCÉDENTE COMPLÉTÉE

1. Livreur indisponible (push notifications + dashboard)
2. Suppression livreur et produits
3. Badge NOUVEAU sur produits (isNew + sortOrder)
4. Ticket cuisine amélioré (80mm thermal)
5. Rapports journaliers avec export PDF

## 🔴 NOUVELLES DEMANDES - EN COURS

### 1. Photos produits dans POS et commandes téléphone
- [ ] Ajouter images dans la grille de sélection POS
- [ ] Ajouter images dans mode téléphone
- [ ] Même affichage que menu client avec photos

### 2. Panier vidé après commande ✅ (DÉJÀ FAIT)
- [x] `clearCart()` déjà appelé dans checkout après création
- [x] Panier vidé dans `handleCancelAndCreate()`
- Note: Le panier SE VIDE déjà automatiquement

### 3. Déconnexion et redirection
- [ ] Admin/Livreur déconnecté → redirection vers `/menu` (pas login)
- [ ] Forcer réauthentification après déconnexion
- [ ] Modifier les boutons logout dans AdminNav et LivreurNav

### 4. Responsive admin/livreur - PRIORITÉ HAUTE ⚠️
- [ ] Bouton supprimer produit non visible sur certains écrans
- [ ] Vérifier tous les tableaux admin (produits, livreurs, etc.)
- [ ] S'assurer que TOUS les boutons/actions sont visibles
- [ ] Tester sur écrans moyens (laptops 13-15 pouces)
- [ ] Adapter les largeurs de colonnes des tables

### 5. Organisation ordre produits ✅ (DÉJÀ FAIT)
- [x] Champ `sortOrder` existe déjà
- [x] Admin peut définir l'ordre
- [x] Produits triés par sortOrder dans API

## 📝 NOTES TECHNIQUES

### Fichiers à modifier:

**Pour déconnexion:**
- `src/components/admin/AdminNav.tsx` (bouton logout)
- `src/app/livreur/layout.tsx` ou nav livreur (bouton logout)

**Pour responsive:**
- `src/app/admin/products/page.tsx` (table produits)
- `src/app/admin/livreurs/page.tsx` (vérifier responsive)
- Utiliser approche: mobile cards + desktop table

**Pour photos POS:**
- `src/app/admin/pos/page.tsx` (ajouter images produits)
- Réutiliser composant ou style similaire au menu client

## 🎯 PRIORITÉ IMMÉDIATE

1. **RESPONSIVE ADMIN** - Très important
   - Boutons d'action cachés = problème bloquant
   - Doit fonctionner sur tous les écrans

2. **Déconnexion vers menu** - Important
   - Meilleure UX
   - Pas de page login vide après logout

3. **Photos POS** - Moyen
   - Améliore l'UX mais pas bloquant
