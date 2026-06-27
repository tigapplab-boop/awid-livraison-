# 🎯 PROMPT AGENT CODEUR — Améliorations Burger Minute App

> À donner tel quel à l'agent codeur (Claude Code ou autre) **dans le repo `awid-livraison-`**.
> Basé sur un audit réel du code (pas une supposition) — chaque section indique l'état actuel exact avant de spécifier le travail à faire.

---

## ⚠️ Règles générales pour l'agent

- Respecter les conventions déjà en place : `@/lib/db` pour Prisma, `@/bm/lib/auth` (`authenticateRequest`, `requireRole`), `@/bm/lib/rate-limit`, montants en **centimes**, clés flexibles dans `SystemSettings` (JSON stringifié).
- Toute nouvelle route sensible (admin, client, livreur) doit suivre le pattern auth + rate-limit déjà utilisé dans `src/app/api/auth/route.ts`.
- Ne rien casser dans le flux de commande existant (Redis `OrderTemp` → `validate` → `Order` PostgreSQL → Socket.IO).
- Avant chaque migration : `npx prisma db push` en local/staging, puis `migrate dev` pour générer le fichier de migration versionné.
- Mettre à jour `TODO.md` et `CHANGELOG.md` après chaque feature, comme le fait le reste du projet.
- Tester chaque feature isolément avant de passer à la suivante.

---

## 1. Page Menu — Contact, localisation, bouton Google Maps

**Audit :** `src/app/menu/page.tsx` ne contient aucune info de contact ni d'adresse actuellement. La page `admin/contacts` existante concerne les **livreurs**, pas le restaurant — ne pas confondre.

**À faire :**
1. Nouvelle clé `SystemSettings` : `RESTAURANT_INFO` → JSON `{ phone, address, lat, lng, mapsUrl }`, sur le même modèle que `COVER_IMAGE`.
2. Route API `GET/PATCH /api/settings/restaurant-info` (PATCH protégé `requireRole('ADMIN')`).
3. Onglet admin pour éditer ces infos (ajouter dans `admin/promo` ou nouvelle page `admin/settings`).
4. Section dans `src/app/menu/page.tsx` (footer ou sous le header) avec : numéro de tél cliquable (`tel:`), adresse texte, bouton **"Voir sur Google Maps"** :
   ```
   https://www.google.com/maps/search/?api=1&query={lat},{lng}
   ```
   (ou `&query=Burger+Minute+Tigzirt` si pas de coordonnées exactes encore).
5. Mehdi doit fournir les coordonnées GPS exactes du local (Grande Plage de Tigzirt) — mettre une valeur par défaut éditable depuis l'admin en attendant.

---

## 2. Notifications Push — Activation complète

**Audit :** Le backend existe déjà à ~80% : modèle `PushSubscription`, route `POST/DELETE /api/notifications/subscribe`, route `POST /api/notifications/send` (protégée ADMIN/LIVREUR), `sendPushToUser()` appelé dans `api/orders/[id]` et `api/orders-temp/[token]/validate`, et le service worker (`public/sw.js`) gère déjà les événements `push` et `notificationclick`.
**Le problème : aucun composant frontend n'appelle jamais `/api/notifications/subscribe`.** Le système est câblé mais jamais déclenché — c'est pour ça qu'il semble "désactivé".

**À faire :**
1. Vérifier les variables d'env sur Coolify : `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
2. Créer un hook `usePushNotifications()` qui demande la permission, appelle `registration.pushManager.subscribe()` avec la clé VAPID, puis poste le résultat à `/api/notifications/subscribe`.
3. Appeler ce hook :
   - Côté **livreur/admin** au login (déjà un `userId` disponible).
   - Côté **client** : étendre `PushSubscription` avec un champ optionnel `clientId` (relation vers `Client`), afficher une bannière sur `/menu` ou après une commande ("Activer les notifications pour suivre ta commande").
4. Étendre `sendPushToUser` (ou créer `sendPushToClient`) pour notifier le client sur les changements de statut (confirmée, en préparation, prête, livrée, refusée) — actuellement ça ne notifie que livreur/admin.
5. Tester sur un vrai mobile (Android/iOS PWA) — les push iOS nécessitent l'ajout au home screen.

---

## 3. Sécurité — Connexion / Déconnexion + Réinitialisation des données (Admin)

**Audit :** `POST /api/auth` existe avec rate-limit (10/min) et JWT en cookie httpOnly. **Aucune route de logout côté serveur n'existe** — la déconnexion actuelle (si elle existe côté front) ne fait probablement que vider le `localStorage`, sans invalider le cookie `auth_token`. Aucun bouton "réinitialiser les données" n'existe ; un script SQL manuel `prisma/reset-orders-only.sql` existe déjà mais n'est pas exposé dans l'app.

**À faire :**
1. `POST /api/auth/logout` : supprime le cookie `auth_token` (`response.cookies.delete` ou `maxAge: 0`).
2. Frontend : bouton déconnexion → appelle `/api/auth/logout` **et** vide `localStorage` (`bm_token`, `bm_user`).
3. Durcir le flag `secure` du cookie : actuellement conditionné à `x-forwarded-proto === 'https'` — vérifier que Traefik transmet bien ce header en prod, sinon forcer `secure: true` en prod.
4. Nouvelle route `POST /api/admin/reset-data` (`requireRole('ADMIN')` + re-saisie du mot de passe admin dans le body) qui exécute en transaction Prisma l'équivalent de `reset-orders-only.sql` (vide commandes/stats, garde produits/users/clients). Logger qui a fait l'action et quand (table `SystemSettings` ou nouvelle table `AuditLog` simple).
5. Bouton "Réinitialiser les données" dans l'admin avec double confirmation (ex : taper "RESET" pour valider) — action destructive, pas de retour en arrière.

---

## 4. Client — Voir ses commandes par téléphone

**Audit — ⚠️ Faille de confidentialité actuelle :** `GET /api/clients/[phone]` existe déjà et renvoie **adresses + 10 dernières commandes** d'un client... **sans aucune authentification**. N'importe qui connaissant un numéro de téléphone peut consulter l'historique de commandes de ce client. Il faut sécuriser avant d'exposer ça côté UI client.

**À faire (recommandé, sans coût SMS) :**
1. Le modèle `ClientToken` existe déjà (token anonyme posé après une commande). Utiliser ce token comme preuve d'identité plutôt que le numéro seul.
2. Nouvelle route `GET /api/clients/me` qui lit le `ClientToken` (cookie ou header), vérifie qu'il correspond bien à un `Client`, et ne renvoie QUE ses propres commandes.
3. Modifier/restreindre `GET /api/clients/[phone]` pour qu'il exige soit ce token, soit un rôle ADMIN — ne jamais le laisser public.
4. Page `/mes-commandes` (ou onglet dans `/menu`) qui utilise `/api/clients/me`.
5. *Option future plus robuste* : vérification par code OTP SMS avant affichage — nécessite un fournisseur SMS algérien, à valider avec Mehdi (coût récurrent).

---

## 5. Avis clients (burgers + service)

**Audit :** Aucun modèle d'avis/note n'existe dans le schéma actuel.

**À faire :**
1. Nouveau modèle Prisma :
   ```prisma
   model Review {
     id        String   @id @default(uuid())
     clientId  String
     client    Client   @relation(fields: [clientId], references: [id])
     orderId   String?
     productId String?
     type      String   // PRODUCT | SERVICE
     rating    Int      // 1-5
     comment   String?
     isPublished Boolean @default(false)
     createdAt DateTime @default(now())
     @@map("reviews")
   }
   ```
2. `POST /api/reviews` (client) — n'autoriser un avis que si la commande liée existe, appartient au client (via `ClientToken`, cf. section 4) et a le statut `DELIVERED`, pour éviter le spam/faux avis.
3. `GET /api/reviews` public, filtré `isPublished=true`, pour affichage des notes sur le menu.
4. Page admin `admin/reviews` pour modérer (publier/masquer/supprimer).
5. UI client : invite à laisser un avis après livraison (sur `order/[id]` ou via la notif push de la section 2).
6. V2 optionnelle : note moyenne affichée sur chaque `ProductCard`.

---

## 6. Mode Maintenance (Admin)

**Audit :** Aucun système de maintenance n'existe.

**À faire :**
1. Clé `SystemSettings` : `MAINTENANCE_MODE` → `{ enabled: bool, message: string }`.
2. Dans `src/middleware.ts` (déjà existant — vérifier son contenu actuel avant d'éditer) : si activé, rediriger `/menu`, `/cart`, `/checkout`, `/order/*` vers une page `/maintenance`, **sauf** `/admin/*` et `/api/admin/*` pour que l'admin puisse toujours désactiver le mode.
3. Toggle + champ message dans l'admin (nouvel onglet ou page `admin/settings`).
4. `GET /api/settings/maintenance` public (juste le statut + message), `PATCH` réservé ADMIN.

---

## 7. Livreur — Refuser / Supprimer une commande (bug rapporté)

**Audit du "Refuser" :** Le flux complet existe et semble correct dans le code : auth (`LIVREUR`/`ADMIN`), route `PATCH /api/orders-temp/[token]/reject`, mise à jour Redis, émission socket `order:rejected`. **Pistes à investiguer en priorité** puisque le code paraît correct mais ne fonctionne pas en prod :
- Le micro-service socket (`mini-services/socket-service`) est-il bien up et joignable depuis le conteneur Next.js sur Coolify/Traefik ? L'échec d'`emitToRoom` est actuellement catché silencieusement (`console.warn`) — donc même si le rejet réussit en base, le dashboard livreur peut ne jamais se rafraîchir si tout repose sur le socket.
- Le dashboard livreur refait-il un `fetch` de la liste après l'action, ou dépend-il uniquement de l'event socket pour se mettre à jour ? → ajouter un refetch explicite après chaque action en plus du socket, en filet de sécurité.
- Vérifier les logs Coolify au moment réel du clic pour confirmer où ça échoue.

**Audit du "Supprimer" :** **Aucune route ni bouton "supprimer" n'existe** actuellement dans le code (ni pour les commandes temporaires, ni pour les définitives). Ce n'est donc pas un bug mais une fonctionnalité à créer.
- À clarifier avec Mehdi : "supprimer" veut-il dire *annuler* une commande déjà en cours (passer en `CANCELLED`, le champ `cancelReason` existe déjà dans le schéma) ou une vraie suppression DB ? Recommandation : privilégier `CANCELLED` pour la traçabilité, réserver une vraie `DELETE` aux erreurs de saisie POS et uniquement à l'ADMIN.

**À faire :**
1. Investiguer et corriger le flux "Refuser" selon les pistes ci-dessus.
2. Ajouter un bouton "Annuler la commande" côté livreur (commandes assignées), avec raison obligatoire → `PATCH /api/orders/[id]` avec `status: 'CANCELLED'`.
3. Si suppression physique vraiment nécessaire (POS, erreur de saisie) : `DELETE /api/orders/[id]`, réservée `requireRole('ADMIN')` uniquement.

---

## 📌 Ordre d'exécution recommandé

1. **Sécurité** (logout + verrouillage de `/api/clients/[phone]`) — prioritaire, faille de confidentialité active dès maintenant.
2. **Notifications push** — le plus gros est déjà fait, gain rapide.
3. **Contact + localisation menu** — rapide, faible risque.
4. **Historique commandes client** — dépend de la sécurisation faite en #1.
5. **Mode maintenance**.
6. **Bug refus/suppression livreur** — investigation + fix.
7. **Avis clients** — le plus gros morceau (nouveau modèle + modération).
