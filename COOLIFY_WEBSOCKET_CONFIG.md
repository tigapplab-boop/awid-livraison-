# Configuration WebSocket/Notifications sur Coolify

**Date**: 27 juin 2026  
**Priorité**: CRITIQUE (Notifications temps réel)  
**Statut**: ✅ Configuré

---

## 🔌 Problème

Les notifications en temps réel (WebSocket/Socket.IO) ne fonctionnent pas car Coolify doit être configuré pour:
1. **Autoriser les connexions WebSocket**
2. **Exposer le bon domaine pour Socket.IO**
3. **Configurer les variables d'environnement**

---

## ✅ Configuration Coolify

### 1. Domaines pour Socket Service

Dans Coolify → Votre Application → **Configuration** → **Domains**:

✅ **Domaine principal** (déjà configuré):
```
burgerminute.giize.com
```

✅ **Domaine Socket** (AJOUTÉ - en bleu dans ta capture):
```
burgerminute.giize.net
```

**Pourquoi 2 domaines ?**
- `burgerminute.giize.com` → Application Next.js (HTTP/HTTPS)
- `burgerminute.giize.net` → Service Socket (WebSocket)

---

### 2. Variables d'Environnement

Dans Coolify → Votre Application → **Environment Variables**:

#### Variables Socket.IO

```bash
# Socket.IO Configuration
SOCKET_URL=https://burgerminute.giize.net
SOCKET_PATH=/socket.io
SOCKET_TRANSPORTS=websocket,polling
SOCKET_CORS_ORIGIN=https://burgerminute.giize.com

# Next.js Public Variables (accessibles côté client)
NEXT_PUBLIC_SOCKET_URL=https://burgerminute.giize.net
NEXT_PUBLIC_SOCKET_PATH=/socket.io
```

#### Variables Base de Données (déjà configurées)

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

#### Variables Notifications Push (VAPID)

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@burgerminute.com
```

---

### 3. Docker Compose Coolify

Votre `docker-compose.coolify.yml` doit exposer **2 services**:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - SOCKET_URL=${SOCKET_URL}
      - NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}
    labels:
      - "coolify.managed=true"
      - "coolify.domain=burgerminute.giize.com"
      - "coolify.type=application"

  socket-service:
    build: ./mini-services/socket-service
    ports:
      - "3001:3001"
    environment:
      - REDIS_URL=${REDIS_URL}
      - PORT=3001
      - CORS_ORIGIN=https://burgerminute.giize.com
    labels:
      - "coolify.managed=true"
      - "coolify.domain=burgerminute.giize.net"
      - "coolify.type=application"
```

---

### 4. Coolify Proxy (Caddy) Configuration

Coolify utilise **Caddy** comme reverse proxy. Il doit être configuré pour:

#### Pour l'application Next.js (burgerminute.giize.com)
```
burgerminute.giize.com {
    reverse_proxy app:3000
}
```

#### Pour le service Socket (burgerminute.giize.net)
```
burgerminute.giize.net {
    reverse_proxy socket-service:3001 {
        # WebSocket upgrade headers
        header_up Upgrade {http.request.header.Upgrade}
        header_up Connection {http.request.header.Connection}
    }
}
```

**Note**: Coolify génère automatiquement ces configurations, mais vérifie dans **Logs** → **Proxy Logs** que les règles sont bien créées.

---

## 🔧 Vérification Étape par Étape

### Étape 1: Vérifier les Domaines

Dans Coolify:
1. Aller dans **Configuration**
2. Section **Domains**
3. Vérifier que les 2 domaines sont listés:
   - ✅ `burgerminute.giize.com`
   - ✅ `burgerminute.giize.net`

### Étape 2: Variables d'Environnement

1. Aller dans **Environment Variables**
2. Vérifier:
   ```bash
   NEXT_PUBLIC_SOCKET_URL=https://burgerminute.giize.net
   SOCKET_URL=https://burgerminute.giize.net
   ```

### Étape 3: Rebuild & Redeploy

```bash
# Dans Coolify UI
1. Cliquer sur "Redeploy"
2. Attendre le build
3. Vérifier les logs de déploiement
```

### Étape 4: Test WebSocket Connection

Ouvrir la console navigateur (F12) et vérifier:

```javascript
// Dans la console
socket.connected // devrait retourner true
socket.id // devrait afficher un ID
```

Si erreur:
```
WebSocket connection to 'wss://burgerminute.giize.net/socket.io/?EIO=4&transport=websocket' failed
```

→ Problème de configuration proxy Caddy

---

## 🧪 Tests de Notifications

### Test 1: Nouvelle Commande (Client → Livreurs)

1. **Client**: Passer une commande sur `/menu`
2. **Vérifier**: Tous les livreurs disponibles reçoivent une notification
3. **Console**: `[Socket] New order notification received`

### Test 2: Acceptation Commande (Livreur → Admin)

1. **Livreur**: Accepter une commande
2. **Vérifier**: Admin reçoit notification "Commande acceptée"
3. **Console**: `[Socket] Order accepted notification`

### Test 3: Commande Confirmée (Admin → Livreur)

1. **Admin**: Confirmer la commande
2. **Vérifier**: Livreur assigné reçoit notification
3. **Console**: `[Socket] Order confirmed notification`

### Test 4: Statut Mis à Jour (Cuisine → Livreur)

1. **Cuisine**: Marquer commande "Prête"
2. **Vérifier**: Livreur reçoit notification "Commande prête"
3. **Console**: `[Socket] Order ready notification`

---

## 🚨 Dépannage

### Erreur: "WebSocket connection failed"

**Cause**: Caddy ne route pas correctement les WebSockets

**Solution**:
1. Vérifier dans Coolify → **Proxy Logs**:
   ```
   ERROR: WebSocket upgrade failed
   ```

2. Vérifier que le domaine `burgerminute.giize.net` est bien configuré

3. Redéployer le service Socket:
   ```bash
   # Dans Coolify
   Services → socket-service → Redeploy
   ```

### Erreur: "CORS policy blocked"

**Cause**: CORS mal configuré pour WebSocket

**Solution**:
1. Vérifier variable d'env:
   ```bash
   SOCKET_CORS_ORIGIN=https://burgerminute.giize.com
   ```

2. Dans `mini-services/socket-service/index.ts`:
   ```typescript
   const io = new Server(server, {
     cors: {
       origin: process.env.CORS_ORIGIN || 'https://burgerminute.giize.com',
       methods: ['GET', 'POST'],
       credentials: true,
     },
   })
   ```

### Notifications Push ne fonctionnent pas

**Cause**: VAPID keys manquantes

**Solution**:
1. Générer des VAPID keys:
   ```bash
   npx web-push generate-vapid-keys
   ```

2. Ajouter dans Coolify Environment Variables:
   ```bash
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=BKx...
   VAPID_PRIVATE_KEY=tY9...
   VAPID_SUBJECT=mailto:admin@burgerminute.com
   ```

3. Redéployer

---

## 📋 Checklist Finale

Avant l'ouverture, vérifier:

### Configuration Coolify
- [x] 2 domaines configurés (`.com` et `.net`)
- [x] Variables d'environnement Socket définies
- [x] Docker Compose avec 2 services
- [x] Caddy proxy configuré pour WebSocket
- [ ] VAPID keys pour push notifications

### Tests Fonctionnels
- [ ] Client peut passer commande
- [ ] Livreurs reçoivent notification nouvelle commande
- [ ] Admin reçoit notification commande acceptée
- [ ] Livreur reçoit notification commande confirmée
- [ ] Cuisine peut changer statut
- [ ] Statuts mis à jour en temps réel
- [ ] Historique commandes client fonctionne

### Logs à Surveiller
```bash
# Dans Coolify → Logs → Application Logs
[Socket] Connected clients: 5
[Socket] Client connected: {socketId}
[Socket] Emitting to room: admin
[Push] Notification sent to user: {userId}
```

---

## 🎯 Configuration Recommandée (Production)

```bash
# Coolify Environment Variables (PRODUCTION)

# Database
DATABASE_URL=postgresql://user:pass@db:5432/burgerminute
REDIS_URL=redis://redis:6379

# Socket.IO
SOCKET_URL=https://burgerminute.giize.net
SOCKET_PATH=/socket.io
SOCKET_TRANSPORTS=websocket,polling
SOCKET_CORS_ORIGIN=https://burgerminute.giize.com
NEXT_PUBLIC_SOCKET_URL=https://burgerminute.giize.net
NEXT_PUBLIC_SOCKET_PATH=/socket.io

# Push Notifications (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BKx...
VAPID_PRIVATE_KEY=tY9...
VAPID_SUBJECT=mailto:admin@burgerminute.com

# Next.js
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
PORT=3000
HOSTNAME=0.0.0.0
```

---

## ✅ Résultat Attendu

Après configuration correcte:

1. **Client passe commande** → WebSocket émet événement → **Livreurs notifiés instantanément**
2. **Livreur accepte** → WebSocket émet → **Admin notifié**
3. **Admin confirme** → WebSocket émet → **Livreur notifié**
4. **Cuisine prépare** → Statut change → **Tous notifiés en temps réel**
5. **Historique commandes** → Cookie client enregistré → **Page `/mes-commandes` fonctionne**

🚀 **Système de notifications temps réel opérationnel!**
