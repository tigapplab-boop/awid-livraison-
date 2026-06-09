# 📋 TODO - Burger Minute

## ✅ TERMINÉ
- [x] Déploiement Coolify fonctionnel
- [x] Fix sécurité (JWT_SECRET, REDIS_PASSWORD, EMIT_SECRET)
- [x] Promo banner cache si désactivée
- [x] Panier persisté dans localStorage
- [x] Migrations DB correctes
- [x] Livreur indisponible ne reçoit PAS de notifications push (filtre `isAvailable`)
- [x] Livreur indisponible ne voit PAS les commandes dans dashboard
- [x] Bouton supprimer livreur avec confirmation
- [x] Page statistiques - meilleure gestion d'erreur

## 🔴 PRIORITÉ HAUTE - Bugs critiques

### ~~1. Livreur indisponible (isAvailable = false)~~ ✅
- [x] Ne doit PAS recevoir de notifications push
- [x] Ne doit PAS voir les nouvelles commandes dans son dashboard
- [x] Modifier `src/bm/lib/push-send.ts` pour filtrer par `isAvailable`

### ~~2. Bouton supprimer livreur~~ ✅
- [x] Ajouter bouton "Supprimer" dans `src/app/admin/livreurs/page.tsx`
- [x] Créer API `DELETE /api/livreurs/[id]`
- [x] Confirmation avant suppression

### ~~3. Page statistiques admin - Erreur~~ ✅
- [x] Debugger `src/app/admin/statistics/page.tsx`
- [x] Vérifier API `/api/stats/advanced`
- [x] Gérer les cas où il n'y a pas de données

## 🟡 PRIORITÉ MOYENNE - Fonctionnalités

### 4. Gestion produits avancée
- [ ] Ajouter champ `isNew` dans le modèle Product (migration)
- [ ] Ajouter champ `sortOrder` dans le modèle Product
- [ ] Badge "NEW" sur les produits (activable/désactivable)
- [ ] Tri par prix / date dans page admin produits

### 5. Améliorer ticket cuisine POS
- [ ] Augmenter taille police dans `src/components/pos/KitchenTicket.tsx`
- [ ] Optimiser pour imprimante thermique 80mm
- [ ] Rendre plus lisible (gras, espacements)

### 6. Rapports journaliers
- [ ] Créer page `/admin/reports`
- [ ] Filtres: date, livreur, type commande
- [ ] Export PDF avec bibliothèque jsPDF
- [ ] Afficher stats groupées

## 🟢 PRIORITÉ BASSE - Améliorations

### 7. Livreurs disponibles par défaut
- [x] Modifier seed pour `isAvailable: true` par défaut ✅ (déjà fait)
- [x] Vérifier création nouveau livreur

### 8. Commande acceptée disparaît
- [x] Déjà implémenté via WebSocket `order:accepted`
- [x] Vérifier que ça fonctionne correctement

## 📝 NOTES
- **Prochaine étape**: Tester sur Coolify
  1. Commit les changements
  2. Push vers GitHub
  3. Tester notifications push avec livreur indisponible
  4. Tester suppression livreur
  5. Vérifier page statistiques
- Identifiants: Admin `0550000000` / `admin123`, Livreur `livreur` / `livreur`
