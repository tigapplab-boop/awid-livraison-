# Prompt à donner à ton agent codeur — persistance de connexion

Copie-colle tout ce bloc à ton agent (Claude Code / OpenClaw). Il a accès au dépôt réel, donc les instructions sont écrites pour qu'il retrouve et modifie lui-même le code exact.

---

## PROMPT À COPIER-COLLER

```
Deux problèmes liés à la connexion à corriger dans le repo
tigapplab-boop/awid-livraison- :

PROBLÈME A : Un admin ou un livreur qui reste connecté, mais ferme
complètement l'application puis la rouvre, se retrouve déconnecté alors que
sa session (le cookie auth_token, valable 7 jours côté serveur) est encore
valide.

PROBLÈME B : Sur la page /login, dès que la page s'affiche, une redirection
automatique et silencieuse a lieu vers le tableau de bord si une ancienne
donnée de connexion traîne encore dans le stockage local du navigateur —
sans vérification réelle auprès du serveur, et sans aucune action de la part
de l'utilisateur.

CAUSE COMMUNE AUX DEUX PROBLÈMES :
L'application vérifie "suis-je connecté" en lisant uniquement une copie
locale stockée dans le navigateur (localStorage, clés "bm_token" et
"bm_user"), jamais en interrogeant le serveur pour vérifier si le vrai cookie
de session (httpOnly, "auth_token") est toujours valide. Ces deux
informations peuvent devenir incohérentes entre elles (le cookie survit,
la copie locale peut disparaître selon le comportement de stockage du
téléphone/navigateur, ou l'inverse) — d'où les deux comportements buggés.

CORRECTION À APPLIQUER : remplacer la vérification "localStorage only" par
une vérification réelle basée sur le cookie de session, et supprimer toute
redirection automatique non désirée sur la page de connexion.

=======================================================================
ÉTAPE 1 — Créer un point de vérification de session basé sur le cookie
Nouveau fichier : src/app/api/auth/session/route.ts
=======================================================================

Ce endpoint doit lire le cookie auth_token (pas le header Authorization),
vérifier sa validité, et renvoyer les informations de l'utilisateur si le
cookie est valide, ou une réponse indiquant qu'il n'y a pas de session sinon.

Inspire-toi de la logique déjà utilisée dans src/bm/lib/auth.ts (vérification
et décodage du JWT), mais lis le token depuis le cookie plutôt que depuis le
header Authorization. Utilise `cookies()` de `next/headers` pour lire
`auth_token`. Si le cookie est absent ou invalide, renvoie
`NextResponse.json({ authenticated: false }, { status: 200 })` (pas une
erreur 401 — ce n'est pas une erreur, juste une réponse informative). Si
valide, renvoie `NextResponse.json({ authenticated: true, user: { id, name,
phone, role } })` avec les informations décodées du token.

=======================================================================
ÉTAPE 2 — Page de connexion : ne plus jamais rediriger automatiquement
Fichier : src/app/login/page.tsx
=======================================================================

Trouve le useEffect qui s'exécute au montage de la page et qui lit
localStorage ("bm_token", "bm_user") pour rediriger automatiquement vers
/admin/dashboard ou /livreur/dashboard.

Remplace ce comportement : au lieu de rediriger automatiquement, ce
useEffect doit appeler GET /api/auth/session (le nouveau endpoint de l'étape
1). Si la réponse indique authenticated: true, afficher un petit bandeau ou
bouton du type "Vous êtes déjà connecté en tant que [nom] — Continuer vers
le tableau de bord →", que l'utilisateur doit cliquer explicitement pour
être redirigé. NE PAS rediriger automatiquement, dans aucun cas, sans ce
clic. Si authenticated: false, ne rien afficher de spécial, la page de
connexion normale s'affiche.

Le cas "kicked=1" dans l'URL (qui vide le stockage local après avoir été
éjecté d'une page protégée) doit continuer de fonctionner comme avant.

=======================================================================
ÉTAPE 3 — Dashboard admin : vérifier la session réelle avant de se croire
déconnecté
Fichier : src/app/admin/layout.tsx
=======================================================================

Actuellement, la variable isAuthed est calculée uniquement à partir de
localStorage (user et token lus directement dedans), et si isAuthed est
faux, une redirection immédiate vers /login a lieu.

Modifie ce comportement : avant de conclure "non authentifié" et de
rediriger, si localStorage ne contient rien (ou des données invalides),
appelle d'abord GET /api/auth/session pour vérifier s'il existe malgré tout
une session valide côté serveur (le cookie). Si oui, restaure "bm_user" et
si possible "bm_token" dans localStorage à partir de la réponse, et laisse
l'utilisateur sur la page normalement (pas de redirection). Seulement si
/api/auth/session répond aussi authenticated: false, alors rediriger vers
/login comme avant.

Ajoute un état de chargement pendant cette vérification (par exemple ne
rien afficher ou un indicateur de chargement bref) pour éviter un flash de
la page de connexion pendant que la vérification est en cours.

=======================================================================
ÉTAPE 4 — Dashboard livreur : même correction
Fichier : src/app/livreur/dashboard/page.tsx
=======================================================================

Trouve le useEffect au montage qui appelle getStoredUser() et redirige vers
/login si rien n'est trouvé. Applique exactement la même logique qu'à
l'étape 3 : si getStoredUser() ne renvoie rien, vérifier via GET
/api/auth/session avant de conclure à une vraie déconnexion, et restaurer
les données locales si le serveur confirme que la session est toujours
valide.

=======================================================================
VÉRIFICATION ET PUBLICATION
=======================================================================

1. Crée une nouvelle branche à partir de main, nommée : fix/session-persistence

2. Applique les 4 étapes ci-dessus.

3. Vérifie que tout compile :
   - npm install
   - npx tsc --noEmit    → doit renvoyer 0 erreur
   - npm run build       → doit se terminer sans erreur

4. Si une vérification échoue, corrige avant de continuer.

5. Commit avec un message clair, par exemple :
   "fix: la session ne doit plus se perdre à la fermeture de l'app, et la
   page de connexion ne doit plus jamais reconnecter automatiquement sans
   action de l'utilisateur"

6. Pousse la branche fix/session-persistence sur GitHub et ouvre une Pull
   Request vers main, avec une description qui explique les 2 problèmes
   corrigés et pourquoi (copie le résumé au début de ce prompt).

7. Ne merge PAS la Pull Request automatiquement — laisse-la ouverte pour
   relecture.

Ne touche à aucun autre fichier que ceux mentionnés dans ce prompt.
```

---

## Ce que ça va changer concrètement, une fois déployé

- Fermer complètement l'app puis la rouvrir → tu restes connecté tant que ton cookie de 7 jours est valide, peu importe ce qui arrive à la copie locale sur le téléphone.
- Sur la page de connexion, plus aucune redirection automatique et silencieuse — seulement un bouton optionnel "Continuer en tant que..." si une session existe déjà, que tu dois toi-même cliquer.
- Se déconnecter manuellement (avec le vrai bouton "Déconnexion", déjà corrigé lors d'une session précédente) reste le seul moyen de couper la session pour de bon.

À tester après déploiement : reste connecté en admin, ferme l'app plusieurs minutes, rouvre-la → tu dois arriver directement sur le tableau de bord, pas sur la page de connexion.
