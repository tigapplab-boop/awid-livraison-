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
- [x] Gestion produits: champs isNew et sortOrder ajoutés
- [x] Badge "NOUVEAU" affiché sur produits (admin + client)
- [x] Tri produits par sortOrder
- [x] Suppression produits (déjà existait, vérifié)
- [x] Ticket cuisine amélioré pour imprimante 80mm thermique

## 🟡 PRIORITÉ MOYENNE - Fonctionnalités restantes

### 6. Rapports journaliers avec export PDF
- [ ] Créer page `/admin/reports`
- [ ] Filtres: date, livreur, type commande (ONLINE/PHONE/POS)
- [ ] Stats groupées: nombre commandes, revenus, par source, par livreur
- [ ] Installer jsPDF: `npm install jspdf`
- [ ] Bouton "Export PDF" avec tables formatées
- [ ] Affichage des résultats avant export

## 📝 NOTES

### Complété dans cette session:
1. **Livreur indisponible** ✅
   - Push notifications filtrées par `isAvailable = true`
   - Dashboard vide pour livreurs indisponibles
   
2. **Delete livreur** ✅
   - Bouton suppression avec confirmation
   - API DELETE /api/livreurs/[id]
   - Perte d'accès immédiate
   
3. **Delete produit** ✅
   - Déjà existait dans le code
   - API DELETE /api/products/[id]
   - Confirmation avant suppression
   
4. **Gestion produits avancée** ✅
   - Champs `isNew` et `sortOrder` ajoutés
   - Migration: `20240609_add_product_organization`
   - Badge "NOUVEAU/جديد" visible client + admin
   - Tri par `sortOrder` au lieu de `name`
   
5. **Ticket cuisine** ✅
   - Texte 2-4x plus grand
   - Numéro commande en très gros avec fond noir
   - Quantités dans des boîtes noires 4xl
   - Noms produits en UPPERCASE, text-2xl, bold
   - Notes spéciales sur fond jaune
   - Optimisé pour lire de loin

### Prochaine étape:
- **Rapports journaliers avec PDF** (tâche 6)
- Tester toutes les modifications sur Coolify

### Identifiants de test:
- Admin: `0550000000` / `admin123`
- Livreur: `livreur` / `livreur`
