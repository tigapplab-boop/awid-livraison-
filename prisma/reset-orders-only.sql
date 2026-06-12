-- ============================================
-- NETTOYAGE COMMANDES UNIQUEMENT
-- Pour l'ouverture de Burger Minute
-- ============================================
-- Ce script supprime SEULEMENT les commandes de test
-- GARDE: Produits, Catégories, Users, Zones, Sauces, Inventaire

-- 1. Supprimer les sauces des items de commandes
DELETE FROM "order_item_sauces";

-- 2. Supprimer les items de commandes
DELETE FROM "order_items";

-- 3. Supprimer les commandes
DELETE FROM "orders";

-- 4. Supprimer les adresses clients (optionnel - décommente si tu veux)
-- DELETE FROM "client_addresses";

-- 5. Supprimer les tokens clients (optionnel)
-- DELETE FROM "client_tokens";

-- 6. Supprimer les clients (optionnel - décommente si tu veux tout recommencer)
-- DELETE FROM "clients";

-- 7. Reset les stats journalières (optionnel)
DELETE FROM "daily_stats";

-- 8. Afficher le résultat
SELECT 
  (SELECT COUNT(*) FROM orders) as commandes_restantes,
  (SELECT COUNT(*) FROM clients) as clients_restants,
  (SELECT COUNT(*) FROM products) as produits_restants,
  (SELECT COUNT(*) FROM sauces) as sauces_restantes;

-- ============================================
-- TERMINÉ !
-- Les commandes de test sont supprimées.
-- Tu peux commencer avec une base propre.
-- ============================================
