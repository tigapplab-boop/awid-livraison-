# 🔧 FIX: Server Actions Cache Error

## ❌ Problème Identifié

**Erreur dans les logs**:
```
Error: Failed to find Server Action "751f09b1d99b9e8f3452f920029bc7652e869e39"
This request might be from an older or newer deployment.
```

**Cause racine**: 
- Le navigateur cache les anciens Server Action IDs de Next.js
- Le nouveau déploiement génère de nouveaux IDs
- Les IDs ne correspondent plus → erreur "Failed to find Server Action"
- L'API retourne HTML (page d'erreur) au lieu de JSON

---

## ✅ Solutions Appliquées

### 1. **Force Rebuild Complet**
- ✅ Nouveau `NEXT_BUILD_ID=prod-ready-20260610` dans Dockerfile
- ✅ Clear du cache `.next` avant build
- ✅ Nouveau build ID dans `.env.production`

### 2. **Cache Bust Automatique Client**
Script `/public/cache-bust.js` qui:
- ✅ Détecte nouveau déploiement
- ✅ Clear localStorage (préserve auth tokens)
- ✅ Clear sessionStorage
- ✅ Unregister service workers
- ✅ Clear browser caches
- ✅ Reload automatique de la page (1 fois)

### 3. **API Revalidation**
Nouveau endpoint `/api/revalidate` pour forcer le clear du cache serveur

---

## 📋 Instructions Post-Déploiement

### Pour l'Admin (Vous):

**1. Attendez que Coolify finisse le déploiement**

**2. Ouvrez l'application**:
```
https://burgerminute.giize.com
```

**3. Le cache bust devrait se faire automatiquement**
- Vérifiez la console du navigateur: `[Cache Bust] New deployment detected`
- La page devrait reload automatiquement

**4. Si le problème persiste**:

#### Option A: Hard Refresh (Recommandé)
- **Windows**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`
- **Mobile**: Vider le cache du navigateur

#### Option B: Clear Cache Complet
1. Ouvrir les DevTools (F12)
2. Onglet "Application" / "Storage"
3. Cliquer "Clear site data"
4. Reload la page

#### Option C: Mode Privé / Incognito
- Tester dans une fenêtre privée pour confirmer que c'est un problème de cache

---

## 🧪 Tests de Vérification

### Test 1: Health Check
```bash
curl https://burgerminute.giize.com/api/health
```

**Réponse attendue**:
```json
{
  "status": "ok",
  "timestamp": "2026-06-10T...",
  "env": "production"
}
```

### Test 2: Build ID Check
```bash
curl https://burgerminute.giize.com/api/revalidate
```

**Réponse attendue**:
```json
{
  "message": "Use POST to revalidate cache",
  "buildId": "prod-ready-20260610"
}
```

### Test 3: Cover API
1. Aller dans Admin → Promo → Photo de Couverture
2. L'onglet doit charger sans erreur JSON
3. Upload devrait fonctionner

### Test 4: Logout
1. Logout admin → doit rediriger vers `/menu`
2. Logout livreur → doit rediriger vers `/menu`

---

## 🔄 Si Le Problème Persiste Encore

### Vérification Logs Coolify:

**1. Vérifier que le build a réussi**:
```
✓ Compiled successfully
✓ .next/standalone created
```

**2. Chercher le nouveau Build ID**:
```
NEXT_BUILD_ID=prod-ready-20260610
```

**3. Vérifier Prisma**:
```
prisma:query SELECT ... FROM "public"."system_settings" ...
```

**4. Pas de "Failed to find Server Action"**:
- Si cette erreur apparaît encore, c'est que le cache navigateur n'est pas vidé

---

### Force Revalidation Serveur:

```bash
curl -X POST https://burgerminute.giize.com/api/revalidate
```

**Réponse**:
```json
{
  "revalidated": true,
  "timestamp": "2026-06-10T..."
}
```

---

### Debugging Avancé:

**1. Vérifier que cache-bust.js est chargé**:
- Ouvrir DevTools → Network
- Chercher `cache-bust.js`
- Doit être 200 OK

**2. Vérifier localStorage**:
```javascript
// Dans la console navigateur
console.log(localStorage.getItem('bm_build_id'))
// Doit afficher: "prod-ready-20260610"
```

**3. Vérifier si Service Worker est actif**:
```javascript
// Dans la console
navigator.serviceWorker.getRegistrations().then(r => console.log(r))
// Doit être vide [] après cache bust
```

---

## 🎯 Pourquoi Ça Marchera Maintenant

### Avant:
1. ❌ Navigateur garde cache avec anciens Server Action IDs
2. ❌ Serveur a nouveaux IDs
3. ❌ Mismatch → "Failed to find Server Action"
4. ❌ API retourne HTML d'erreur au lieu de JSON
5. ❌ Page admin affiche "Unexpected token '<'"

### Après:
1. ✅ Build ID unique force nouveau build complet
2. ✅ Cache `.next` cleared avant build
3. ✅ Script cache-bust détecte nouveau build
4. ✅ Clear automatique du cache navigateur
5. ✅ Reload automatique → nouveaux Server Actions chargés
6. ✅ API retourne JSON correctement
7. ✅ Plus d'erreur "Failed to find Server Action"

---

## 📊 Monitoring Continue

### Endpoints à surveiller:

**Health Check** (ping chaque minute):
```
GET /api/health
```

**Build Status**:
```
GET /api/revalidate
```

**Cover API** (admin uniquement):
```
GET /api/settings/cover
Authorization: Bearer <token>
```

---

## 🚨 En Cas d'Urgence

Si après tout ça, le problème persiste:

### Plan B: Force Clean Deploy

**1. Dans Coolify, aller dans votre app**

**2. Cliquer "Rebuild" avec option "Clean build"**

**3. Ou via CLI**:
```bash
# Dans le serveur Coolify
docker system prune -a -f
docker-compose down -v
docker-compose up -d --build --force-recreate
```

⚠️ **Attention**: Ceci supprime les volumes, la DB sera reseeded!

---

## ✅ Checklist Finale

Après déploiement, vérifier:

- [ ] `/api/health` retourne `{"status":"ok"}`
- [ ] `/api/revalidate` retourne le bon `buildId`
- [ ] Console navigateur montre `[Cache Bust] New deployment detected`
- [ ] Admin → Promo → Photo de Couverture charge sans erreur
- [ ] Pas d'erreur "Failed to find Server Action" dans les logs
- [ ] Upload photo de couverture fonctionne
- [ ] Logout admin → `/menu`
- [ ] Logout livreur → `/menu`
- [ ] Commandes en ligne fonctionnent
- [ ] Socket.io connecté (icône temps réel)

---

## 📞 Support Technique

**Si problème persiste après 3 déploiements**:
- Vérifier que le problème n'est pas côté Coolify (cache Docker)
- Tester en mode incognito pour isoler le cache navigateur
- Vérifier les logs PostgreSQL pour erreurs de connexion
- Vérifier la variable `DATABASE_URL` dans Coolify

**Commit actuel**: `4f45d82`  
**Build ID**: `prod-ready-20260610`  
**Date**: 2026-06-10

---

🚀 **Le déploiement est en cours sur Coolify. Attendez 2-3 minutes puis testez!**
