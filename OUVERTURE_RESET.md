# 🎉 PRÉPARATION OUVERTURE - Reset Commandes

## Option 1 : Via Coolify UI (Recommandé)

1. **Aller dans Coolify** → Ton application → Database
2. **Cliquer "Execute Query"**
3. **Copier-coller** le contenu de `prisma/reset-orders-only.sql`
4. **Cliquer "Execute"**
5. ✅ **Fait !** Commandes supprimées, tout le reste intact

---

## Option 2 : Via Terminal SSH

```bash
# Se connecter au container
docker exec -it burger-minute-db psql -U burger -d burger_minute

# Copier-coller les commandes SQL :
DELETE FROM "order_item_sauces";
DELETE FROM "order_items";
DELETE FROM "orders";
DELETE FROM "daily_stats";

# Vérifier
SELECT COUNT(*) FROM orders;
-- Doit afficher 0

\q
```

---

## Option 3 : Depuis le fichier SQL

```bash
# Sur le serveur
cat prisma/reset-orders-only.sql | docker exec -i burger-minute-db psql -U burger -d burger_minute
```

---

## Ce qui est SUPPRIMÉ ✅
- ✅ Toutes les commandes (`orders`)
- ✅ Items de commandes (`order_items`)
- ✅ Sauces des commandes (`order_item_sauces`)
- ✅ Stats journalières (`daily_stats`)

## Ce qui est GARDÉ ✅
- ✅ Produits et catégories
- ✅ Admin et livreurs
- ✅ Zones de livraison
- ✅ Sauces (liste)
- ✅ Inventaire et achats
- ✅ Clients (si tu veux les garder)

---

## Si tu veux AUSSI supprimer les clients de test

Ajoute ces lignes dans le SQL :
```sql
DELETE FROM "client_addresses";
DELETE FROM "client_tokens";
DELETE FROM "clients";
```

---

## Vérification finale

Après le reset, vérifie :
```sql
SELECT 
  (SELECT COUNT(*) FROM orders) as commandes,
  (SELECT COUNT(*) FROM clients) as clients,
  (SELECT COUNT(*) FROM products) as produits,
  (SELECT COUNT(*) FROM users) as users;
```

---

## 🚀 Prêt pour l'ouverture !

Après le reset :
1. ✅ Base de données propre
2. ✅ Menu intact
3. ✅ Système inventaire prêt
4. ✅ Zéro commande de test
5. ✅ Statistiques à zéro

**Bonne ouverture ! 🍔🎉**
