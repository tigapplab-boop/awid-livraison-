# Corrections appliquées — awid-livraison-corrige.zip

Toutes les corrections ci-dessous ont été écrites, puis **vérifiées par une vraie compilation** :
`npx tsc --noEmit` → 0 erreur sur tout le projet (30 400 lignes).
`npm run build` → la compilation Next.js se déroule normalement ; le seul échec rencontré vient de mon environnement de test qui n'a pas accès à Google Fonts (aucun rapport avec les changements).

Je n'ai **pas** pu tester le comportement réel dans un navigateur connecté à ta vraie base de données — ça, il faut le faire chez toi avant de déployer en prod. Détail de chaque changement ci-dessous, avec ce qu'il faut vérifier.

---

## 1. Profil livreur (disponibilité + horaires) — le bug que tu as signalé

**Fichiers modifiés :**
- `src/app/api/livreurs/[id]/availability/route.ts` → ajout d'un `GET` (avant, seul un `PUT` existait ; impossible de relire ce qu'on venait d'enregistrer)
- `src/bm/lib/livreur-api.ts` → ajout de la fonction `getAvailability(userId)`
- `src/app/livreur/dashboard/page.tsx` → au chargement de la page, on appelle maintenant ce `GET` pour remplacer l'instantané périmé (stocké sur le téléphone à la connexion) par les vraies valeurs de la base

**À vérifier chez toi** : connecte-toi en livreur, règle un horaire personnalisé, ferme complètement l'app (ou déconnecte-toi/reconnecte-toi), rouvre-la → l'horaire doit maintenant apparaître correctement au lieu de revenir à la valeur par défaut (lundi-vendredi 9h-18h).

---

## 2. Routes API sans protection (données sensibles exposées publiquement)

**Fichiers modifiés** (ajout de la vérification `requireRole(req, 'ADMIN')`, sur le modèle déjà utilisé par `src/app/api/finance/route.ts`) :
- `src/app/api/inventory/products/route.ts` (GET + POST)
- `src/app/api/inventory/reports/profits/route.ts`
- `src/app/api/inventory/reports/debts/route.ts`
- `src/app/api/inventory/reports/stock/route.ts`
- `src/app/api/inventory/reports/summary/route.ts`
- `src/app/api/sauces/[id]/route.ts` (PATCH + DELETE)
- `src/app/api/products/[id]/stock/route.ts` (PATCH)

**Conséquence importante à vérifier** : maintenant que ces routes exigent un token ADMIN valide, si ton panneau d'administration appelle certaines de ces routes sans envoyer le header `Authorization: Bearer <token>`, elles vont renvoyer une erreur 401/403 au lieu de fonctionner silencieusement comme avant. Teste chaque écran concerné (gestion de l'inventaire, rapports de profits/dettes/stock, gestion des sauces, ajustement manuel de stock) en étant connecté en tant qu'admin, pour confirmer que tout s'affiche normalement.

---

## 3. `/api/revalidate` — le secret n'était pas réellement vérifié

**Fichier modifié** : `src/app/api/revalidate/route.ts`

Avant : si on n'envoyait pas de paramètre `secret` dans l'URL, la vérification était sautée entièrement. Maintenant, le secret est **obligatoire** et doit correspondre exactement à la variable d'environnement `REVALIDATE_SECRET`.

**⚠️ Action nécessaire côté serveur** : si `REVALIDATE_SECRET` n'est pas déjà définie dans les variables d'environnement de ton déploiement Coolify, ce endpoint refusera désormais **toutes** les requêtes (y compris les tiennes). Vérifie qu'elle est bien définie, et que tout appel à `/api/revalidate` dans ton code (webhooks, scripts) envoie bien `?secret=<la_valeur>`.

---

## 4. Mode maintenance — corrigé pour qu'il s'exécute réellement

**Fichier modifié** : `src/middleware.ts`

Le filtre (`matcher`) qui limitait l'exécution du middleware à `/admin/*` et `/livreur/*` a été élargi à toutes les pages (sauf les routes API, les fichiers internes Next.js et les favicons). Le code qui vérifie le mode maintenance pour les clients peut maintenant s'exécuter réellement — avant, il ne s'exécutait jamais.

**⚠️ Point de vigilance (compromis assumé, pas un bug)** : ce code fait un appel réseau interne (`fetch` vers `/api/settings/maintenance`) à **chaque** chargement de page cliente désormais, alors qu'avant il ne le faisait jamais. C'est le comportement voulu à l'origine par le code, mais ça ajoute une petite latence à chaque page vue. Si tu remarques un ralentissement après déploiement, la solution serait de mettre ce statut en cache (Redis, quelques secondes) plutôt que de re-interroger la base à chaque clic — dis-le-moi si tu veux que je fasse cette optimisation.

**À vérifier chez toi** : active le mode maintenance depuis l'admin, vérifie qu'un client qui visite le site est bien redirigé vers `/maintenance`, puis désactive-le et vérifie que tout redevient normal.

---

## 5. Nettoyage — composant mort supprimé

**Fichier supprimé** : `src/components/admin/AdminNav.tsx`

Vérifié par recherche exhaustive (`grep`) qu'il n'était importé nulle part avant suppression. La vraie navigation admin (`src/app/admin/layout.tsx`) n'est pas touchée et continue de fonctionner normalement.

---

## 6. NOUVEAU — La vraie cause du "mode maintenance qui ne s'affiche pas" (et 2 autres pages touchées)

**Ce que tu as signalé** : le mode maintenance que tu as réglé dans les paramètres admin ne prenait pas effet.

**Ce que j'ai trouvé en creusant** : le bouton "Enregistrer" de la page `src/app/admin/settings/page.tsx` — pour le mode maintenance **et** pour les infos du restaurant — n'envoyait **jamais** le jeton de connexion (`Authorization: Bearer ...`) avec la requête. Or, la route `/api/settings/maintenance` exige ce jeton pour accepter une modification (à juste titre, c'est une donnée sensible). Résultat concret : quand tu actives le mode maintenance et cliques "Enregistrer", le serveur refuse silencieusement la modification (erreur 401 en coulisses), et l'application ne montre **aucune erreur à l'écran** — donc ça donnait l'impression que rien ne se passait, alors qu'en fait rien n'était sauvegardé du tout.

**Fichiers corrigés :**
- `src/app/admin/settings/page.tsx` — les deux boutons "Enregistrer" (infos restaurant + mode maintenance) envoient maintenant le bon jeton, et **un message d'erreur rouge s'affiche désormais si la sauvegarde échoue** au lieu d'échouer en silence.

**En vérifiant ce même problème ailleurs, j'ai trouvé 2 autres pages admin touchées par exactement la même chose** (elles ne sont pas dans ta demande d'origine, mais autant les régler pendant que j'y suis) :

- **`src/app/admin/sauces/page.tsx`** (gestion des sauces) : créer, modifier, supprimer ou activer/désactiver une sauce ne fonctionnait pas non plus, pour la même raison. Corrigé. J'en ai profité pour protéger aussi `POST /api/sauces` (création), qui n'avait aucune vérification — oubli de ma précédente correction.
- **`src/app/admin/reviews/page.tsx`** (avis clients) : celle-ci était encore plus touchée — même le **chargement de la liste des avis** échouait dès l'ouverture de la page (pas seulement les actions de publication/suppression), car la route qui liste les avis exige aussi ce jeton. Corrigé.

**À vérifier chez toi en priorité** : ouvre la page "Avis clients" dans l'admin — avant cette correction, elle devait probablement s'afficher vide ou bloquée en chargement. Vérifie qu'elle affiche maintenant bien la liste des avis.

---

## 7. NOUVEAU — Upload direct de photos (galerie) au lieu d'un champ URL

**Ce que tu as demandé** : pouvoir charger une photo directement depuis ton téléphone/ordinateur, pas taper une adresse d'image.

**Fichiers ajoutés/modifiés :**
- `src/app/api/settings/restaurant-info/gallery-upload/route.ts` **(nouveau)** — reçoit un fichier image, vérifie que c'est bien une image (max 5 Mo), l'enregistre sur le serveur, renvoie son adresse. Protégé par le même contrôle ADMIN que le reste.
- `src/app/admin/settings/page.tsx` — le champ texte "URL de l'image" a été remplacé par un vrai bouton "Choisir une photo depuis votre appareil". Un message rouge s'affiche si le fichier est trop lourd ou n'est pas une image.

Ce mécanisme reprend exactement celui déjà utilisé (et qui fonctionne bien) pour la photo de couverture du menu — donc rien de nouveau à apprendre côté serveur, juste étendu à la galerie.

**À vérifier chez toi** : dans Paramètres, ajoute une photo depuis ton téléphone → elle doit apparaître immédiatement dans l'aperçu de la galerie, puis clique "Enregistrer" pour la rendre visible aux clients.

---

## 8. NOUVEAU — Regroupement du menu admin par thème

**Fichier modifié** : `src/app/admin/layout.tsx`

La liste plate de 14 entrées est maintenant organisée en 4 groupes avec un titre au-dessus de chacun :
- **Opérations du jour** : Dashboard, POS/Caisse, Livreurs
- **Catalogue** : Produits, Sauces, Promos, Inventaire
- **Réglages du commerce** : Zones, Horaires, Contacts, Paramètres, Avis clients
- **Chiffres** : Statistiques, Stats Simple, Finance

**Bonus découvert en le faisant** : les pages "Paramètres" et "Avis clients" n'étaient reliées à **aucun** lien dans le menu — elles existaient et fonctionnaient (une fois les corrections ci-dessus faites), mais il fallait taper l'adresse à la main pour y accéder. Elles sont maintenant dans le menu, sous "Réglages du commerce".

Aucune route n'a changé (les adresses des pages restent identiques), donc c'est un changement purement visuel, sans risque.

---

## Ce qui n'a PAS été touché dans ce lot (volontairement, décisions qui te reviennent)

- La rotation des vrais secrets (`JWT_SECRET`, mot de passe PostgreSQL/Redis) — à faire toi-même dans Coolify, je n'ai pas accès à ton serveur.
- La fusion des pages Statistiques/Stats/Finance/Rapports — décision de contenu, on en parle quand tu veux.
- Le double stockage du token (cookie + localStorage) — plus gros chantier, je préfère qu'on le fasse en isolation une fois que ces correctifs-ci sont validés en prod.
- Le découpage du dashboard livreur (1452 lignes) en sous-composants — refactorisation de confort, sans urgence.

## Avant de déployer

1. Teste chaque point "à vérifier" ci-dessus sur une copie de test si possible, sinon directement en prod aux heures creuses.
2. Confirme que `REVALIDATE_SECRET` est bien définie dans tes variables d'environnement Coolify.
3. Une fois validé, remplace le contenu de ton dépôt par celui de ce zip (ou applique les mêmes changements via git pour garder ton historique).
