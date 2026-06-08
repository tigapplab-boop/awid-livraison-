# 🚀 PROMET DE PUSH POST-CORRECTION — AWID / BURGER MINUTE
## À exécuter APRÈS que toutes les corrections soient terminées et validées

---

## ⚠️ PRÉREQUIS ABSOLUS AVANT DE PUSHER

Tu ne dois PAS pusher si une seule de ces conditions n'est pas remplie :

- [ ] Les 8 problèmes CRITIQUES sont corrigés
- [ ] Les 12 problèmes MAJEURS sont corrigés
- [ ] Les 14 problèmes MINEURS sont corrigés (ou documentés si reportés)
- [ ] `npm run build` passe sans erreur
- [ ] `docker-compose up -d --build` démarre tous les services
- [ ] Les 7 scénarios de test du CDC passent (commande online, anti-saturation, rejet, téléphone, problème encaissement, persistance, stats)
- [ ] Aucun `console.log` en production (remplacé par logger structuré)
- [ ] Aucun `any` TypeScript
- [ ] Aucun `TODO` / `FIXME` / placeholder

---

## 📋 ÉTAPES DE PUSH

### ÉTAPE 1 : Vérification finale locale

```bash
# 1. Vérifier le statut git
git status

# 2. Vérifier qu'on est sur la bonne branche
git branch
# Doit être sur main ou une branche de correction

# 3. Build sans erreur
npm run build

# 4. Docker build
 docker-compose up -d --build

# 5. Vérifier les services
 docker-compose ps
# Tous les services doivent être "Up"

# 6. Test rapide des endpoints critiques
curl http://localhost/api/health
curl http://localhost/api/products
curl -X POST http://localhost/api/auth -H "Content-Type: application/json" -d '{"phone":"0550000000","password":"admin123"}'
```

---

### ÉTAPE 2 : Préparation du commit

```bash
# 1. Vérifier les fichiers modifiés
git status

# 2. Review des changements (obligatoire)
git diff --stat
# Vérifier que seuls les fichiers pertinents sont modifiés

# 3. Ajouter les fichiers corrigés
# NE PAS faire `git add .` aveuglément
# Ajouter fichier par fichier ou par groupe logique

git add prisma/schema.prisma
git add prisma/migrations/
git add src/bm/lib/auth.ts
git add src/bm/lib/order-temp-store.ts
git add src/bm/lib/order-number.ts
git add src/bm/lib/redis.ts
git add src/bm/lib/push-send.ts
git add src/bm/lib/push-notifications.ts
git add src/app/api/orders/\[id\]/route.ts
git add src/app/api/orders-temp/route.ts
git add src/app/api/health/route.ts
git add mini-services/socket-service/index.ts
git add docker-compose.yml
git add .env.example
git add README.md

# 4. Vérifier le staging
git diff --cached --stat
```

---

### ÉTAPE 3 : Rédaction du commit message

Le message doit être structuré et explicite :

```bash
git commit -m "fix(security): resolve all audit findings - AWID Burger Minute

CRITICAL FIXES:
- JWT secret: remove hardcoded fallback, enforce 32+ chars validation
- Auth: protect GET /api/orders/[id] with JWT or clientToken
- Race conditions: add pendingAccepts guard + retry loop on order numbers
- Socket.IO: add JWT authentication middleware + room authorization
- Emit endpoint: add EMIT_SECRET header validation
- Pricing: server-side price calculation, never trust client input

MAJOR FIXES:
- Add Redis service to docker-compose + migrate order-temp-store to ioredis
- Add socket-service to docker-compose with healthcheck
- Add VAPID env variables to .env.example
- Force password change on first admin login (mustChangePassword flag)
- Remove hardcoded VAPID public key fallback
- Add rate limiting to all public endpoints
- Restrict Socket.IO CORS to allowed origins
- Add cleanup for expired temp orders (>1h)
- Add pagination to GET /api/orders
- Persist livreur availability status to database
- Add Jest tests for critical flows (order-temp)
- Remove public PostgreSQL port exposure

MINOR FIXES:
- Convert String roles to Prisma enums (UserRole, OrderStatus, etc.)
- Add database indexes on frequent query columns
- Remove obsolete 'Adapted for SQLite' comment
- Fix memory leak in waiting page useEffect dependencies
- Use PwaInstallPrompt component in layout
- Align OrderSource enum between Prisma and frontend types
- Remove unused OrderSource import in livreur-api
- Add EMIT_SERVICE_URL to .env
- Add Redis adapter for Socket.IO multi-instance
- Add disconnect logging for Socket.IO rooms
- Throw explicit error when VAPID missing in production
- Batch push notifications with Promise.allSettled
- Add /api/health endpoint for monitoring

IMPROVEMENTS:
- Batch create OrderItems with createMany
- Add retry logic with exponential backoff for Socket emits
- Add structured JSON logging
- Add Content-Security-Policy headers in Caddyfile
- Add notification sound for new orders (livreur)
- Add ISR cache headers for /api/products

BREAKING CHANGES:
- Requires Redis service (docker-compose up -d redis)
- Requires EMIT_SECRET env variable
- Requires VAPID keys configuration

Closes: audit-report-2026-06-08"
```

---

### ÉTAPE 4 : Push vers le repository distant

```bash
# 1. Vérifier le remote
git remote -v
# Doit afficher : origin  https://github.com/tigapplab-boop/awid-livraison-.git (fetch/push)

# 2. Pull avant push (éviter les conflits)
git pull origin main --rebase

# 3. Si conflits, les résoudre manuellement
# git status pour voir les fichiers en conflit
# Éditer, git add, git rebase --continue

# 4. Push
git push origin main

# 5. Vérifier le push
git log --oneline -5
# Le commit doit apparaître en haut
```

---

### ÉTAPE 5 : Vérification post-push

```bash
# 1. Vérifier sur GitHub que le commit est bien arrivé
# Ouvrir : https://github.com/tigapplab-boop/awid-livraison-/commits/main

# 2. Vérifier que les fichiers sont bien sur le repo
# Ouvrir : https://github.com/tigapplab-boop/awid-livraison-/blob/main/prisma/schema.prisma

# 3. Vérifier que .env n'est PAS sur le repo (doit être dans .gitignore)
git ls-files | grep "\.env$"
# Ne doit rien retourner (sauf .env.example)
```

---

## 🔒 VÉRIFICATIONS DE SÉCURITÉ AVANT PUSH

### Vérifier que ces fichiers sensibles ne sont PAS commités :

```bash
# Vérifier que .env n'est pas dans git
git ls-files | grep "^\.env$"
# Résultat attendu : RIEN (vide)

# Vérifier que les clés VAPID ne sont pas hardcodées
grep -r "VAPID_PRIVATE_KEY" src/ --include="*.ts" --include="*.tsx"
# Résultat attendu : uniquement des références à process.env

# Vérifier que le JWT secret n'est pas hardcodé
grep -r "burger-minute-secret" src/ --include="*.ts"
# Résultat attendu : RIEN

# Vérifier que les mots de passe ne sont pas en clair
grep -r "password.*=.*"" src/ --include="*.ts" | grep -v "hashSync"
# Résultat attendu : RIEN
```

### Vérifier le .gitignore :

```bash
cat .gitignore
# Doit contenir au minimum :
# .env
# .env.local
# node_modules/
# .next/
# db/*.db
# upload/
```

---

## 📝 CHANGELOG À CRÉER/METTRE À JOUR

Créer ou mettre à jour `CHANGELOG.md` :

```markdown
# Changelog

## [1.1.0] - 2026-06-08

### 🔒 Security
- JWT secret validation enforced (≥32 chars, no fallback)
- Protected GET /api/orders/[id] with authentication
- Added JWT authentication to Socket.IO connections
- Secured internal emit endpoint with EMIT_SECRET
- Server-side price validation (no client trust)
- Restricted CORS origins for Socket.IO
- Removed public PostgreSQL port exposure

### 🐛 Bug Fixes
- Fixed race condition on order acceptance
- Fixed race condition on order number generation
- Fixed memory leak in waiting page polling
- Fixed order source enum inconsistency

### ✨ Features
- Added Redis support for temporary order storage
- Added Redis to Docker Compose
- Added socket-service to Docker Compose
- Added /api/health monitoring endpoint
- Added database indexes for performance
- Added pagination to order listings
- Added livreur availability persistence
- Added structured JSON logging
- Added notification sound for new orders
- Added ISR cache for products API

### 🧪 Testing
- Added Jest tests for order-temp critical flows

### 🏗 Infrastructure
- Added Redis service (docker-compose)
- Added Redis adapter for Socket.IO
- Added rate limiting to all public endpoints
- Added Content-Security-Policy headers

### ⚠️ Breaking Changes
- Requires Redis service running
- Requires EMIT_SECRET environment variable
- Requires VAPID keys configuration
- Admin password must be changed on first login
```

---

## 🎯 CHECKLIST FINALE DE PUSH

- [ ] Toutes les corrections terminées et testées
- [ ] `npm run build` passe sans erreur
- [ ] `docker-compose up -d --build` fonctionne
- [ ] Les 7 scénarios CDC passent
- [ ] `git status` montre uniquement les fichiers attendus
- [ ] `git diff --cached` reviewée et validée
- [ ] Commit message structuré et complet
- [ ] `.env` n'est PAS dans les fichiers trackés
- [ ] Aucun secret hardcodé dans le code
- [ ] `git push origin main` réussi
- [ ] Commit visible sur GitHub
- [ ] `CHANGELOG.md` mis à jour

---

## 🚨 EN CAS D'ERREUR DE PUSH

### Si le push est refusé (non-fast-forward) :
```bash
git pull origin main --rebase
# Résoudre les conflits si nécessaire
git push origin main
```

### Si des secrets ont été commités par erreur :
```bash
# 1. IMMÉDIATEMENT révoquer les secrets exposés
# 2. Changer les clés/mots de passe
# 3. Utiliser git-filter-repo ou BFG pour nettoyer l'historique
# 4. Force push (attention, modifie l'historique)
git push origin main --force
```

### Si le build échoue après push :
```bash
# Ne PAS laisser le repo dans un état cassé
git revert HEAD  # Annuler le dernier commit
git push origin main
# Corriger localement, puis recommiter
```

---

**NE PAS PUSHER SI LA CHECKLIST N'EST PAS COMPLÈTE À 100%.**
