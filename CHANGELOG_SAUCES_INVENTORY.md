# 🚀 Sauces & Inventaire - v2.0

## Nouveautés

### ✅ Sauces
- Page admin `/admin/sauces` : CRUD complet
- Client : Sélecteur multi-sauces dans modal produit
- Gratuites, illimitées, bilingue FR/AR

### ✅ Modal Produit
- Description complète avec image
- Sélection sauces (si burger/sandwich)
- Quantité +/-

### ✅ Inventaire `/admin/inventory`
**4 onglets** :
1. **Produits** : Prix achat/vente, bénéfice, stock
2. **Achats** : Enregistrement, auto-incrémente stock
3. **Dettes** : Par fournisseur, paiement multiple
4. **Rapports** : KPIs, bénéfices, alertes stock

### ✅ Stock Auto (Boissons)
- Déduction automatique à la confirmation
- Alertes stock bas

---

## Déploiement

### 1. Backup DB
```bash
docker exec burger-minute-db pg_dump -U burger burger_minute > backup.sql
```

### 2. Push
```bash
git add .
git commit -m "feat: sauces + inventory system"
git push
```

### 3. Migration SQL
Exécuter `prisma/migrations/20260611_add_sauces_and_inventory.sql` dans la DB

### 4. Générer Prisma
```bash
docker exec -it burger-minute-app npx prisma generate
docker restart burger-minute-app
```

### 5. Seed Sauces (optionnel)
```sql
INSERT INTO "sauces" ("id", "name", "nameAr", "isAvailable", "sortOrder", "createdAt") VALUES
(gen_random_uuid()::text, 'Sauce Algérienne', 'صلصة جزائرية', true, 1, NOW()),
(gen_random_uuid()::text, 'Harissa', 'هريسة', true, 2, NOW()),
(gen_random_uuid()::text, 'Mayonnaise', 'مايونيز', true, 3, NOW()),
(gen_random_uuid()::text, 'Ketchup', 'كاتشب', true, 4, NOW()),
(gen_random_uuid()::text, 'Moutarde', 'خردل', true, 5, NOW());
```

### 6. Hard Refresh Navigateur
`Ctrl + Shift + R` pour éviter cache Server Actions

---

## Rollback si problème
```bash
docker exec -i burger-minute-db psql -U burger -d burger_minute < backup.sql
git revert HEAD && git push
```
