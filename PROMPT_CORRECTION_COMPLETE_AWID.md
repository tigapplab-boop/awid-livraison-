# 🔧 PROMPT DE CORRECTION COMPLÈTE — AWID / BURGER MINUTE
## Pour l'agent codeur — Basé sur l'audit d'Antigravity

---

## ⚠️ INSTRUCTIONS ABSOLUES

Tu as reçu un **rapport d'audit** avec 8 problèmes CRITIQUES, 12 MAJEURS et 14 MINEURS.

**Règles :**
1. **Tu corriges TOUS les problèmes** — pas de sélection, pas d'excuse
2. **Tu ne simplifies PAS** — chaque correction doit être complète et production-ready
3. **Tu testes CHAQUE correction** — pas de "ça devrait marcher"
4. **Tu documentes** — chaque changement expliqué dans un CHANGELOG
5. **Tu ne passes à la suite QUE quand tout est vert**

**Priorité stricte :** CRITIQUE → MAJEUR → MINEUR → AMÉLIORATION

---

## 🔴 PRIORITÉ 1 : PROBLÈMES CRITIQUES (8)

### CRITIQUE 1 — JWT Secret faible et hardcodé
**Fichiers :** `src/bm/lib/auth.ts`, `.env`, `.env.example`

**Problème :** Fallback hardcodé `'burger-minute-secret-key-change-in-production'` + `.env` contient `JWT_SECRET=burger-minute-jwt-secret-change-me-2024` (prédictible, 32 chars).

**Correction :**
```typescript
// src/bm/lib/auth.ts — REMPLACER la logique actuelle par :

const JWT_SECRET_RAW = process.env.JWT_SECRET

if (!JWT_SECRET_RAW || JWT_SECRET_RAW.length < 32) {
  throw new Error(
    'FATAL: JWT_SECRET must be set in environment and be at least 32 characters. ' +
    'Generate one with: openssl rand -base64 48'
  )
}

const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW)
```

**Actions :**
- [ ] Modifier `auth.ts` — supprimer tout fallback, ajouter validation stricte
- [ ] Modifier `.env.example` — commentaire clair sur la génération
- [ ] Modifier `.env` (si versionnée) — mettre un placeholder `[GENERATE_WITH_OPENSSL]`
- [ ] Ajouter dans README : instruction pour générer le secret

---

### CRITIQUE 2 — GET /api/orders/[id] non authentifié
**Fichiers :** `src/app/api/orders/[id]/route.ts`

**Problème :** N'importe qui avec un UUID peut lire les détails complets d'une commande (nom, téléphone, adresse).

**Correction :**
```typescript
// src/app/api/orders/[id]/route.ts — REMPLACER le GET par :

import { authenticateRequest } from '@/bm/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const clientToken = request.nextUrl.searchParams.get('clientToken')

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      assignedLivreur: { select: { name: true, phone: true } },
    },
  })

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Vérifier auth admin/livreur
  const authResult = await authenticateRequest(request)

  if (authResult instanceof NextResponse) {
    // Pas authentifié → vérifier clientToken
    if (!clientToken || order.clientToken !== clientToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Si clientToken uniquement, masquer les données sensibles
  if (!(authResult instanceof NextResponse) === false && clientToken) {
    const sanitized = {
      ...order,
      clientPhone: undefined, // ou masqué : order.clientPhone.slice(0,4) + '****'
      assignedLivreur: { name: order.assignedLivreur?.name },
    }
    return NextResponse.json(sanitized)
  }

  return NextResponse.json(order)
}
```

---

### CRITIQUE 3 — Race condition sur l'acceptation de commande
**Fichiers :** `src/bm/lib/order-temp-store.ts`

**Problème :** `acceptTempOrder()` lit puis écrit sans verrouillage. En Node.js single-threaded c'est théoriquement safe, mais avec I/O async et potentiellement Redis plus tard, il faut un guard.

**Correction :**
```typescript
// Ajouter au début du fichier :
const pendingAccepts = new Set<string>()

// Modifier acceptTempOrder :
export function acceptTempOrder(token: string, livreurId: string): OrderTempRedis | null {
  // Guard contre accept concurrent
  if (pendingAccepts.has(token)) return null
  pendingAccepts.add(token)

  try {
    const order = orderStore.get(token)
    if (!order) return null
    if (order.status !== 'PENDING') return null
    if (new Date(order.expiresAt) <= new Date()) {
      order.status = 'EXPIRED'
      phoneIndex.delete(order.clientPhone)
      return null
    }

    order.status = 'ACCEPTED'
    order.acceptedByLivreurId = livreurId
    order.livreurId = livreurId
    order.acceptedAt = new Date().toISOString()
    return order
  } finally {
    pendingAccepts.delete(token)
  }
}
```

---

### CRITIQUE 4 — Order number race condition
**Fichiers :** `src/bm/lib/order-number.ts`

**Problème :** Deux validations simultanées peuvent générer le même numéro `BM-YYMMDD-XXX`.

**Correction :**
```typescript
// REMPLACER generateOrderNumber par :

export async function generateOrderNumber(): Promise<string> {
  const todayStr = getDateString()
  const prefix = `BM-${todayStr}`

  // Retry loop pour gérer les race conditions
  for (let attempt = 0; attempt < 5; attempt++) {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const lastOrder = await db.order.findFirst({
      where: {
        orderNumber: { startsWith: prefix },
        createdAt: { gte: todayStart },
      },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    })

    let maxSeq = 0
    if (lastOrder) {
      const match = lastOrder.orderNumber.match(/^BM-\d{6}-(\d+)$/)
      if (match) maxSeq = parseInt(match[1], 10)
    }

    const nextSeq = maxSeq + 1
    const orderNumber = `${prefix}-${String(nextSeq).padStart(3, '0')}`

    // Vérifier unicité avant de retourner
    const exists = await db.order.findUnique({
      where: { orderNumber },
      select: { id: true },
    })

    if (!exists) return orderNumber
    // Si existe, retry avec tentative suivante
  }

  // Fallback : timestamp-based suffix
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`
}
```

---

### CRITIQUE 5 — Socket.IO sans authentification
**Fichiers :** `mini-services/socket-service/index.ts`

**Problème :** N'importe qui peut se connecter au WebSocket et rejoindre n'importe quelle room (admin, livreur, client).

**Correction :**
```typescript
// Dans mini-services/socket-service/index.ts, AJOUTER avant io.on('connection') :

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token

  if (!token) {
    socket.data.role = 'anonymous'
    return next()
  }

  try {
    // Vérifier le token JWT via l'API Next.js
    const res = await fetch(`${process.env.API_URL || 'http://app:3000'}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.ok) {
      const payload = await res.json()
      socket.data.userId = payload.userId
      socket.data.role = payload.role
      return next()
    }
    return next(new Error('Authentication failed'))
  } catch {
    return next(new Error('Authentication error'))
  }
})

// Puis modifier les handlers de room :

socket.on('join:admin', () => {
  if (socket.data.role !== 'ADMIN') {
    socket.emit('error', { message: 'Admin access required' })
    return
  }
  socket.join('admin')
})

socket.on('join:livreur', (livreurId: string) => {
  if (socket.data.role !== 'LIVREUR' && socket.data.role !== 'ADMIN') {
    socket.emit('error', { message: 'Unauthorized' })
    return
  }
  // Vérifier que le livreur ne rejoint que SA room
  if (socket.data.role === 'LIVREUR' && socket.data.userId !== livreurId) {
    socket.emit('error', { message: 'Cannot join another livreur room' })
    return
  }
  socket.join(`livreur:${livreurId}`)
})
```

**Actions :**
- [ ] Ajouter middleware d'auth Socket.IO
- [ ] Protéger les rooms admin et livreur
- [ ] Créer endpoint `/api/auth/verify` dans Next.js si inexistant
- [ ] Modifier le client Socket.IO pour envoyer le token JWT dans `auth`

---

### CRITIQUE 6 — Emit endpoint interne sans authentification
**Fichiers :** `mini-services/socket-service/index.ts`

**Problème :** `POST /emit` sur port 3004 accepte n'importe quelle requête.

**Correction :**
```typescript
// Ajouter un secret partagé dans les headers

const EMIT_SECRET = process.env.EMIT_SECRET
if (!EMIT_SECRET || EMIT_SECRET.length < 32) {
  console.error('FATAL: EMIT_SECRET must be set and >= 32 chars')
  process.exit(1)
}

app.post('/emit', (req, res) => {
  const authHeader = req.headers['x-emit-secret']
  if (authHeader !== EMIT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  // ... reste du code
})
```

**Actions :**
- [ ] Ajouter `EMIT_SECRET` dans `.env` et `.env.example`
- [ ] Modifier `socket.ts` (lib) pour inclure le secret dans les headers
- [ ] Ne PAS exposer le port 3004 dans docker-compose (communication interne uniquement)

---

### CRITIQUE 7 — Prix client non vérifié côté serveur
**Fichiers :** `src/app/api/orders-temp/route.ts`

**Problème :** `item.price || product?.price || 0` — le client peut envoyer price: 0.

**Correction :**
```typescript
// Dans la création de commande temporaire, REMPLACER par :

const enrichedItems = items.map((item) => {
  const product = productMap.get(item.productId)
  if (!product) {
    throw new Error(`Product ${item.productId} not found`)
  }
  if (!product.isAvailable) {
    throw new Error(`Product ${product.name} is not available`)
  }
  return {
    productId: item.productId,
    name: product.name,        // TOUJOURS le nom du serveur
    quantity: Math.min(item.quantity, 20), // Max 20 par item
    price: product.price,      // TOUJOURS le prix du serveur
    notes: item.notes,
  }
})

// Recalculer le subtotal côté serveur
const calculatedSubtotal = enrichedItems.reduce(
  (sum, item) => sum + item.price * item.quantity, 0
)

// Calculer deliveryFee côté serveur
const zone = await db.deliveryZone.findFirst({ where: { name: deliveryZone, isActive: true } })
if (!zone) {
  throw new Error(`Delivery zone ${deliveryZone} not found`)
}
const now = new Date()
const currentHour = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
const isNight = currentHour >= zone.startNight || currentHour <= zone.endNight
const calculatedDeliveryFee = isNight ? zone.nightFee : zone.dayFee

const calculatedTotal = calculatedSubtotal + calculatedDeliveryFee

// Créer la commande temporaire avec les valeurs calculées
const result = createTempOrder({
  clientName,
  clientPhone: normalizedPhone,
  clientAddress,
  deliveryZone,
  items: enrichedItems,
  subtotal: calculatedSubtotal,
  deliveryFee: calculatedDeliveryFee,
  total: calculatedTotal,
})
```

---

### CRITIQUE 8 — Architecture monolithique au lieu de 3 frontends
**Fichiers :** Structure globale du projet

**Problème :** Le CDC exige 3 frontends séparés. Le projet est un monolithe.

**Décision :** Pour cette phase, le monolithe est acceptable SI les routes sont protégées. Mais il faut documenter la limitation et prévoir la refonte V2.

**Actions (non bloquantes mais nécessaires) :**
- [ ] Ajouter middleware Next.js qui bloque `/admin/*` et `/livreur/*` pour les non-authentifiés
- [ ] Ajouter middleware qui bloque `/admin/*` pour les non-admin
- [ ] Documenter dans README : "Architecture monolithique — séparation des bundles prévue en V2"

---

## 🟠 PRIORITÉ 2 : PROBLÈMES MAJEURS (12)

### MAJEUR 1 — Pas de Redis (store in-memory)
**Fichiers :** `src/bm/lib/order-temp-store.ts`, `docker-compose.yml`

**Correction :** Ajouter Redis au docker-compose et migrer le store.

**Étapes :**
1. Ajouter au `docker-compose.yml` :
```yaml
  redis:
    image: redis:7-alpine
    container_name: burger-minute-redis
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    restart: unless-stopped
    networks:
      - burger-network

volumes:
  redis_data:
    driver: local
```

2. Installer `ioredis` : `npm install ioredis`
3. Créer `src/bm/lib/redis.ts` :
```typescript
import Redis from 'ioredis'

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000),
})

redis.on('error', (err) => {
  console.error('Redis error:', err)
})
```

4. Migrer `order-temp-store.ts` vers Redis (SETEX, GET, DEL, pipeline)
5. Ajouter `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` dans `.env`

---

### MAJEUR 2 — Socket.IO service non dans docker-compose
**Fichiers :** `docker-compose.yml`, `mini-services/socket-service/`

**Correction :**
```yaml
  socket-service:
    build:
      context: ./mini-services/socket-service
      dockerfile: Dockerfile
    container_name: burger-minute-socket
    environment:
      - PORT=3003
      - EMIT_PORT=3004
      - API_URL=http://app:3000
      - EMIT_SECRET=${EMIT_SECRET}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
    expose:
      - "3003"
      - "3004"
    # PAS DE ports: — communication interne uniquement
    restart: unless-stopped
    networks:
      - burger-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3004/"]
      interval: 30s
      timeout: 5s
      retries: 3
```

---

### MAJEUR 3 — Variables VAPID absentes du .env
**Fichiers :** `.env`, `.env.example`

**Correction :**
```env
# Web Push VAPID Keys (generate with: npx web-push generate-vapid-keys)
VAPID_SUBJECT=mailto:contact@burgerminute.dz
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
```

---

### MAJEUR 4 — Admin seed avec mot de passe "admin"
**Fichiers :** `prisma/seed.ts`

**Correction :**
```typescript
// Dans seed.ts, ajouter un flag :
const users = [
  {
    name: 'Admin Burger Minute',
    phone: '0550000000',
    role: 'ADMIN',
    password: hashSync('admin123', 10),
    mustChangePassword: true, // AJOUTER
  },
  // ...
]
```

Et dans le login, vérifier ce flag :
```typescript
if (user.mustChangePassword) {
  return NextResponse.json({ 
    error: 'Must change password', 
    mustChangePassword: true 
  }, { status: 403 })
}
```

---

### MAJEUR 5 — Clé VAPID publique hardcodée dans le frontend
**Fichiers :** `src/bm/lib/push-notifications.ts`

**Correction :**
```typescript
// SUPPRIMER le fallback hardcodé :
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

if (!VAPID_PUBLIC_KEY) {
  console.warn('[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not configured')
  // Ne pas tenter de s'inscrire
  return null
}
```

---

### MAJEUR 6 — Rate limiting incomplet
**Fichiers :** Tous les `route.ts`

**Correction :** Ajouter `rateLimit` sur TOUS les endpoints publics :
```typescript
// Créer un helper réutilisable
import { rateLimit } from '@/bm/lib/rate-limit'

export async function GET(request: NextRequest) {
  const limitResult = await rateLimit(request, { max: 100, windowMs: 60000 })
  if (limitResult) return limitResult // 429 response
  // ... suite
}
```

Endpoints à protéger :
- `GET /api/orders` — max 30/min
- `GET /api/orders/[id]` — max 60/min
- `POST /api/notifications/subscribe` — max 10/min
- `GET /api/products` — max 120/min (cache-friendly)

---

### MAJEUR 7 — CORS permissif sur socket service
**Fichiers :** `mini-services/socket-service/index.ts`

**Correction :**
```typescript
cors: {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'https://burgerminute.space-z.ai',
    'http://localhost:3000',
  ],
  methods: ['GET', 'POST'],
}
```

---

### MAJEUR 8 — Pas de nettoyage des commandes expirées en mémoire
**Fichiers :** `src/bm/lib/order-temp-store.ts`

**Correction :**
```typescript
const cleanup = () => {
  const now = new Date()
  for (const [token, order] of orderStore.entries()) {
    if (new Date(order.expiresAt) <= now && 
        (order.status === 'PENDING' || order.status === 'ACCEPTED')) {
      order.status = 'EXPIRED'
      phoneIndex.delete(order.clientPhone)
    }
    // DELETE old orders (expired/validated/rejected for more than 1 hour)
    const age = now.getTime() - new Date(order.createdAt).getTime()
    if (age > 3600_000 && order.status !== 'PENDING' && order.status !== 'ACCEPTED') {
      orderStore.delete(token)
      phoneIndex.delete(order.clientPhone)
    }
  }
}
```

---

### MAJEUR 9 — Pas de pagination sur GET /api/orders
**Fichiers :** `src/app/api/orders/route.ts`

**Correction :**
```typescript
const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1'))
const limit = Math.min(100, parseInt(request.nextUrl.searchParams.get('limit') || '50'))

const orders = await db.order.findMany({
  where,
  include: { /* ... */ },
  orderBy: { createdAt: 'desc' },
  take: limit,
  skip: (page - 1) * limit,
})

const total = await db.order.count({ where })

return NextResponse.json({
  data: orders,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  },
})
```

---

### MAJEUR 10 — Disponibilité livreur non persistée
**Fichiers :** `src/app/livreur/dashboard/page.tsx`, `src/app/api/livreurs/`

**Correction :**
1. Créer endpoint `PATCH /api/livreurs/me/availability`
2. Modifier le toggle dans le dashboard :
```typescript
const toggleAvailability = async () => {
  const newStatus = !isAvailable
  setIsAvailable(newStatus)
  await fetch('/api/livreurs/me/availability', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ isAvailable: newStatus }),
  })
}
```

---

### MAJEUR 11 — Zéro tests
**Fichiers :** Projet entier

**Correction minimale (au moins les flows critiques) :**
```typescript
// __tests__/orders-temp.test.ts
import { createTempOrder, findByPhone, replaceTempOrder } from '@/bm/lib/order-temp-store'

describe('OrderTemp Store', () => {
  it('should create a temp order', () => {
    const order = createTempOrder({
      clientName: 'Test',
      clientPhone: '0550123456',
      // ...
    })
    expect(order.status).toBe('PENDING')
    expect(order.version).toBe(1)
  })

  it('should detect duplicate phone', () => {
    createTempOrder({ clientPhone: '0550123456', /* ... */ })
    const existing = findByPhone('0550123456')
    expect(existing).not.toBeNull()
  })

  it('should replace old order on modify', () => {
    const old = createTempOrder({ clientPhone: '0550123456', /* ... */ })
    const updated = replaceTempOrder(old.tempToken, { /* ... */ })
    expect(updated.version).toBe(2)
    expect(findByPhone('0550123456')?.version).toBe(2)
  })
})
```

---

### MAJEUR 12 — PostgreSQL port 5432 exposé publiquement
**Fichiers :** `docker-compose.yml`

**Correction :**
```yaml
  db:
    # ...
    # SUPPRIMER : ports: - "5432:5432"
    expose:
      - "5432"  # Communication interne uniquement
```

---

## 🟡 PRIORITÉ 3 : PROBLÈMES MINEURS (14)

### MINEUR 1 — Rôle String au lieu d'enum Prisma
**Fichiers :** `prisma/schema.prisma`

**Correction :**
```prisma
enum UserRole {
  LIVREUR
  ADMIN
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PREPARING
  READY
  DELIVERED
  CANCELLED
}

// ... etc pour tous les enums

model User {
  role UserRole @default(LIVREUR)
}
```

**Puis :** `npx prisma migrate dev --name add_enums`

---

### MINEUR 2 — Index manquants
**Fichiers :** `prisma/schema.prisma`

**Correction :**
```prisma
model Order {
  // ... champs ...
  @@index([status])
  @@index([clientPhone])
  @@index([assignedLivreurId])
  @@index([createdAt])
  @@index([status, assignedLivreurId])
  @@map("orders")
}
```

---

### MINEUR 3 — Commentaire "Adapted for SQLite" obsolète
**Fichiers :** `prisma/schema.prisma`

**Correction :** Supprimer le commentaire.

---

### MINEUR 4 — Fuite mémoire dans waiting/page.tsx
**Fichiers :** `src/app/waiting/page.tsx`

**Correction :** Extraire `orderTemp?.clientPhone` des dépendances de useEffect ou utiliser useRef.

---

### MINEUR 5 — Pas de beforeinstallprompt utilisé
**Fichiers :** `src/components/PwaInstallPrompt.tsx`

**Correction :** L'utiliser dans le layout principal ou la page menu.

---

### MINEUR 6 — JWT dans localStorage (livreur)
**Fichiers :** `src/bm/lib/livreur-api.ts`

**Note :** Acceptable pour PWA mobile. Documenter le risque.

---

### MINEUR 7 — OrderSource incohérent
**Fichiers :** `prisma/schema.prisma`, `src/bm/types/index.ts`

**Correction :** Aligner les enums.

---

### MINEUR 8 — Import OrderSource inutilisé
**Fichiers :** `src/bm/lib/livreur-api.ts`

**Correction :** Supprimer l'import inutilisé.

---

### MINEUR 9 — Pas de variable EMIT_SERVICE_URL dans .env
**Fichiers :** `.env`, `src/bm/lib/socket.ts`

**Correction :** Ajouter `EMIT_SERVICE_URL=http://socket-service:3004` dans `.env`.

---

### MINEUR 10 — Pas de Redis Adapter Socket.IO
**Fichiers :** `mini-services/socket-service/index.ts`

**Note :** À faire quand Redis sera ajouté.

---

### MINEUR 11 — Pas de cleanup rooms Socket.IO
**Fichiers :** `mini-services/socket-service/index.ts`

**Note :** Socket.IO nettoie auto, mais ajouter un log serait utile.

---

### MINEUR 12 — VAPID non configuré → push silencieusement désactivé
**Fichiers :** `src/bm/lib/push-send.ts`

**Correction :** Lancer une erreur explicite si VAPID manquant en production :
```typescript
if (process.env.NODE_ENV === 'production' && (!vapidPublicKey || !vapidPrivateKey)) {
  throw new Error('VAPID keys required in production')
}
```

---

### MINEUR 13 — Envoi séquentiel des push
**Fichiers :** `src/bm/lib/push-send.ts`

**Correction :** Utiliser `Promise.allSettled`.

---

### MINEUR 14 — Pas de endpoint /api/health
**Fichiers :** `src/app/api/`

**Correction :**
```typescript
// src/app/api/health/route.ts
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() })
  } catch {
    return NextResponse.json({ status: 'error', db: 'disconnected' }, { status: 503 })
  }
}
```

---

## 🟢 PRIORITÉ 4 : AMÉLIORATIONS (6)

### AMÉLIORATION 1 — Batch Prisma OrderItems
Remplacer `create` un par un par `createMany`.

### AMÉLIORATION 2 — Retry logic Socket
Ajouter retry avec backoff exponentiel sur les appels `emitToRoom`.

### AMÉLIORATION 3 — Logs structurés
Remplacer `console.error` par un logger JSON.

### AMÉLIORATION 4 — Content Security Policy
Ajouter headers CSP dans Caddyfile.

### AMÉLIORATION 5 — Son notification livreur
Ajouter `new Audio('/sounds/new-order.mp3')` dans le dashboard livreur.

### AMÉLIORATION 6 — Cache API products avec ISR
Ajouter `Cache-Control: public, s-maxage=60` sur `/api/products`.

---

## 📋 CHECKLIST DE VALIDATION POST-CORRECTION

Après CHAQUE correction, vérifier :

- [ ] Le code compile sans erreur (`npm run build`)
- [ ] Les tests passent (`npm test` si tests ajoutés)
- [ ] Le docker-compose démarre (`docker-compose up -d`)
- [ ] Les scénarios de test (Section 7 du rapport d'audit) passent
- [ ] Aucun nouveau `console.log` en production
- [ ] Aucun `any` TypeScript ajouté

**Ne déclare PAS le projet terminé tant que les 8 critiques + 12 majeurs ne sont pas corrigés et testés.**
