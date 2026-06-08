# 🍔 AWID / BURGER MINUTE

**Système de commande et livraison internal pour fast-food en Algérie**

Application web complète de gestion de commandes et de livraison pour un restaurant fast-food, avec trois interfaces dédiées et un flux de commande optimisé pour le marché algérien.

---

## 📋 Table des matières

- [Architecture](#-architecture)
- [Interfaces](#-interfaces)
- [Flux de commande](#-flux-de-commande)
- [Stack technique](#-stack-technique)
- [Prérequis](#-prérequis)
- [Installation rapide](#-installation-rapide)
- [Variables d'environnement](#-variables-denvironnement)
- [Commandes utiles](#-commandes-utiles)
- [Comptes de test](#-comptes-de-test)
- [Structure du projet](#-structure-du-projet)
- [Génération des clés VAPID](#-génération-des-clés-vapid)
- [URLs par défaut](#-urls-par-défaut)
- [Déploiement Docker](#-déploiement-docker)

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Caddy (Reverse Proxy)                  │
│                    Port 80 / 443                          │
└──────────┬──────────────────────────────┬────────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────┐      ┌─────────────────────────┐
│   Next.js 16 App    │      │   Socket.IO Service      │
│   (Monolith)        │◄────►│   (Bun Mini-Service)     │
│   Port 3000         │ HTTP │   Port 3003 (WebSocket)  │
│                     │ :3004│   Port 3004 (Emit API)   │
└─────────┬───────────┘      └─────────────────────────┘
          │
          ▼
┌─────────────────────┐
│   Base de données    │
│   SQLite (dev)       │
│   PostgreSQL (prod)  │
└─────────────────────┘
```

**Monolith Next.js 16** + **Socket.IO mini-service** + **SQLite/PostgreSQL**

L'application est conçue comme un monolith Next.js avec un mini-service Socket.IO séparé pour les communications temps réel. En développement, SQLite est utilisé pour la simplicité ; en production, PostgreSQL est recommandé.

> **Note (Architecture) :** Architecture monolithique — séparation des bundles prévue en V2. Pour le moment, l'accès aux interfaces protégées est sécurisé via le middleware Next.js.

---

## 🖥 Interfaces

### 1. Client PWA (`/`)
Interface grand public accessible via QR code ou URL directe :
- Consultation du menu par catégories
- Panier et passage de commande
- Suivi en temps réel de la commande
- Notifications push (Web Push VAPID)
- Fonctionne comme une PWA installable

### 2. Livreur PWA (`/livreur`)
Interface dédiée aux livreurs :
- Authentification par téléphone + mot de passe
- Réception des nouvelles commandes en temps réel
- Validation ou refus des commandes temporaires
- Mise à jour du statut de livraison
- Gestion des incidents de paiement

### 3. Admin Dashboard (`/admin`)
Interface d'administration complète :
- Tableau de bord avec statistiques en temps réel
- Gestion des produits et catégories
- Gestion des livreurs et zones de livraison
- Point de vente (POS) pour commandes sur place
- Saisie directe des commandes téléphoniques
- Rapports financiers

---

## 🔄 Flux de commande

### Flux En Ligne (QR → Menu → Commande)

```
Client scanne QR
    → Consulte le menu (/menu)
    → Ajoute au panier (/cart)
    → Passe commande → Commande temporaire créée
    → En attente de validation (/waiting)
    
Livreur reçoit notification Socket.IO
    → Valide ou refuse la commande
    → Si validée → Client créé, Commande persistée
    → Client reçoit notification temps réel

Livreur suit le workflow :
    CONFIRMED → PREPARING → READY → DELIVERED
```

### Flux Téléphone (Admin → Commande directe)

```
Admin reçoit appel téléphonique
    → Saisit la commande dans l'interface admin
    → Commande créée directement en statut CONFIRMED
    → Assignée à un livreur disponible
    → Workflow standard de livraison
```

---

## 🛠 Stack technique

| Composant | Technologie |
|-----------|-------------|
| **Framework** | Next.js 16 (App Router) |
| **Frontend** | React 19 |
| **Langage** | TypeScript 5 |
| **Style** | Tailwind CSS 4 + shadcn/ui |
| **Base de données** | Prisma ORM (SQLite dev / PostgreSQL prod) |
| **Temps réel** | Socket.IO |
| **Runtime Socket** | Bun |
| **Authentification** | JWT (jose) + bcrypt |
| **Notifications** | Web Push (VAPID) |
| **Reverse Proxy** | Caddy |
| **Conteneurisation** | Docker + Docker Compose |
| **State Management** | Zustand + TanStack Query |

---

## 📦 Prérequis

- **Node.js** 20+ (LTS recommandé)
- **Bun** (pour le mini-service Socket.IO)
- **Docker** & **Docker Compose** (pour le déploiement conteneurisé, optionnel)
- **npm** ou **bun** (gestionnaire de paquets)

---

## 🚀 Installation rapide

### Sans Docker (Développement)

```bash
# 1. Cloner le dépôt
git clone <repo-url>
cd my-project

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# 4. Initialiser la base de données
npx prisma db push
npx prisma db seed

# 5. Générer les clés VAPID (pour les notifications push)
npx web-push generate-vapid-keys
# Copier les clés dans .env

# 6. Démarrer l'application Next.js
npm run dev

# 7. Dans un autre terminal, démarrer le service Socket.IO
cd mini-services/socket-service
bun install
bun run dev
```

### Avec Docker (Production)

```bash
# 1. Cloner le dépôt
git clone <repo-url>
cd my-project

# 2. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env — IMPORTANT : changer DATABASE_URL pour PostgreSQL
# DATABASE_URL=postgresql://burger:burger_secret@db:5432/burger_minute

# 3. Construire et démarrer tous les services
docker compose up -d --build

# 4. Initialiser la base de données (premier lancement uniquement)
docker compose exec app npx prisma db push
docker compose exec app npx prisma db seed

# 5. Vérifier que tous les services sont actifs
docker compose ps
```

---

## ⚙️ Variables d'environnement

Copier `.env.example` vers `.env` et remplir les valeurs :

```env
# ========================================
# Base de données
# ========================================
# Développement (SQLite)
DATABASE_URL=file:./db/custom.db

# Production (PostgreSQL via Docker)
# DATABASE_URL=postgresql://burger:burger_secret@db:5432/burger_minute

# ========================================
# Authentification JWT
# ========================================
# Clé secrète pour la signature des tokens (min 32 caractères aléatoires)
# Générez-en une avec: openssl rand -base64 48
JWT_SECRET=[GENERATE_WITH_OPENSSL]

# ========================================
# Notifications Web Push (VAPID)
# ========================================
# Générer avec : npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@awid-burger.dz

# ========================================
# Variables publiques Next.js
# ========================================
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
NEXT_PUBLIC_SOCKET_PORT=3003

# ========================================
# Ports des services
# ========================================
PORT=3000
SOCKET_PORT=3003
EMIT_PORT=3004
```

---

## 📝 Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarrer le serveur de développement Next.js (port 3000) |
| `npm run build` | Build de production + copie des assets standalone |
| `npm run start` | Démarrer le serveur de production |
| `npm run lint` | Vérification ESLint |
| `npx prisma db push` | Pousser le schéma vers la base de données |
| `npx prisma db seed` | Remplir la base avec les données de test |
| `npx prisma generate` | Régénérer le client Prisma |
| `npx prisma studio` | Ouvrir l'interface d'administration de la base |
| `npx prisma migrate dev` | Créer et appliquer une migration (PostgreSQL) |
| `npx prisma migrate reset` | Réinitialiser la base de données |

### Mini-service Socket.IO

```bash
cd mini-services/socket-service
bun install          # Installer les dépendances
bun run dev          # Démarrer en mode développement (hot reload)
```

### Docker

```bash
docker compose up -d --build    # Construire et démarrer
docker compose down             # Arrêter tous les services
docker compose logs -f app      # Voir les logs de l'application
docker compose logs -f socket   # Voir les logs du service Socket.IO
docker compose restart app      # Redémarrer l'application
docker compose exec app sh      # Accéder au shell du conteneur
```

---

## 🔑 Comptes de test

Après avoir exécuté `npx prisma db seed`, les comptes suivants sont disponibles :

| Rôle | Nom | Téléphone | Mot de passe |
|------|-----|-----------|--------------|
| **Admin** | Admin Burger Minute | `0550000000` | `admin123` |
| **Livreur** | Karim | `0551111111` | `livreur123` |
| **Livreur** | Yacine | `0552222222` | `livreur123` |

> ⚠️ **Sécurité** : Changez ces mots de passe en production !

---

## 📁 Structure du projet

```
my-project/
├── prisma/
│   ├── schema.prisma          # Schéma de la base de données
│   └── seed.ts                # Données de test initiales
├── db/
│   └── custom.db              # Base SQLite (développement)
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service Worker
│   ├── icon-192.png           # Icône PWA
│   ├── icon-512.png
│   ├── icon-1024.png
│   └── logo.svg               # Logo du restaurant
├── upload/                    # Images uploadées (produits, etc.)
├── src/
│   ├── app/
│   │   ├── page.tsx           # Page d'accueil client (scan QR)
│   │   ├── layout.tsx         # Layout racine
│   │   ├── globals.css        # Styles globaux
│   │   ├── menu/              # Menu client
│   │   ├── cart/              # Panier client
│   │   ├── checkout/          # Finalisation commande
│   │   ├── waiting/           # Attente validation
│   │   ├── modify/            # Modification commande
│   │   ├── order/[id]/        # Suivi commande
│   │   ├── livreur/           # Interface livreur
│   │   │   ├── login/         # Connexion livreur
│   │   │   └── dashboard/     # Tableau de bord livreur
│   │   ├── admin/             # Interface admin
│   │   │   ├── login/         # Connexion admin
│   │   │   ├── dashboard/     # Tableau de bord
│   │   │   ├── products/      # Gestion produits
│   │   │   ├── livreurs/      # Gestion livreurs
│   │   │   ├── zones/         # Zones de livraison
│   │   │   ├── pos/           # Point de vente
│   │   │   ├── finance/       # Rapports financiers
│   │   │   └── stats/         # Statistiques
│   │   └── api/               # Routes API REST
│   │       ├── auth/          # Authentification JWT
│   │       ├── products/      # CRUD produits
│   │       ├── categories/    # CRUD catégories
│   │       ├── orders/        # Commandes définitives
│   │       ├── orders-temp/   # Commandes temporaires
│   │       ├── clients/       # Gestion clients
│   │       ├── livreurs/      # Gestion livreurs
│   │       ├── zones/         # Zones de livraison
│   │       ├── finance/       # Données financières
│   │       ├── stats/         # Statistiques
│   │       └── notifications/ # Notifications push
│   ├── bm/
│   │   ├── types/             # Types TypeScript métier
│   │   └── lib/               # Logique métier
│   │       ├── auth.ts        # JWT (jose)
│   │       ├── socket.ts      # Client Socket.IO
│   │       ├── cart.tsx       # Gestion panier
│   │       ├── api.ts         # Client API
│   │       ├── livreur-api.ts # API livreur
│   │       ├── push-notifications.ts  # Web Push
│   │       ├── push-send.ts   # Envoi notifications
│   │       ├── order-temp-store.ts    # Store commandes temporaires
│   │       ├── order-number.ts        # Génération numéros
│   │       └── rate-limit.ts  # Limitation de débit
│   ├── components/
│   │   └── ui/                # Composants shadcn/ui
│   ├── hooks/                 # Hooks React personnalisés
│   └── lib/
│       ├── db.ts              # Client Prisma
│       └── utils.ts           # Utilitaires (cn, etc.)
├── mini-services/
│   └── socket-service/
│       ├── index.ts           # Serveur Socket.IO
│       ├── package.json
│       ├── bun.lock
│       └── Dockerfile         # Dockerfile dédié
├── Dockerfile                 # Dockerfile multi-stage Next.js
├── docker-compose.yml         # Orchestration des services
├── Caddyfile                  # Configuration Caddy reverse proxy
├── .env.example               # Variables d'environnement (modèle)
├── next.config.ts             # Configuration Next.js
├── tailwind.config.ts         # Configuration Tailwind CSS
├── tsconfig.json              # Configuration TypeScript
└── package.json               # Dépendances et scripts
```

---

## 🔐 Génération des clés VAPID

Les clés VAPID sont nécessaires pour les notifications push Web Push.

```bash
# Installer web-push globalement (si nécessaire)
npm install -g web-push

# Générer les clés
npx web-push generate-vapid-keys
```

Copier les clés générées dans le fichier `.env` :

```env
VAPID_PUBLIC_KEY=BDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> **Note** : `VAPID_PUBLIC_KEY` et `NEXT_PUBLIC_VAPID_PUBLIC_KEY` doivent avoir la même valeur. La variable `NEXT_PUBLIC_` est exposée côté client.

---

## 🌐 URLs par défaut

### Développement local

| Service | URL |
|---------|-----|
| **Application (Client)** | http://localhost:3000 |
| **Admin Dashboard** | http://localhost:3000/admin |
| **Livreur Dashboard** | http://localhost:3000/livreur |
| **Socket.IO** | ws://localhost:3003 |
| **Emit API (interne)** | http://localhost:3004/emit |
| **Caddy Proxy** | http://localhost:81 |

### Production (Docker)

| Service | URL |
|---------|-----|
| **Application** | http://localhost (via Caddy, port 80) |
| **Admin Dashboard** | http://localhost/admin |
| **Livreur Dashboard** | http://localhost/livreur |
| **Socket.IO** | ws://localhost/?XTransformPort=3003 |
| **PostgreSQL** | localhost:5432 |

### API Routes principales

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/auth` | Authentification (login) |
| `GET` | `/api/products` | Liste des produits |
| `GET` | `/api/categories` | Liste des catégories |
| `POST` | `/api/orders-temp` | Créer une commande temporaire |
| `POST` | `/api/orders-temp/[token]/validate` | Valider une commande temporaire |
| `POST` | `/api/orders-temp/[token]/reject` | Refuser une commande temporaire |
| `GET` | `/api/orders` | Liste des commandes |
| `GET` | `/api/orders/[id]` | Détail d'une commande |
| `PATCH` | `/api/orders/[id]` | Mettre à jour le statut |
| `GET` | `/api/livreurs` | Liste des livreurs |
| `GET` | `/api/zones` | Zones de livraison |
| `POST` | `/api/zones/calculate-fee` | Calculer les frais de livraison |
| `GET` | `/api/finance` | Données financières |
| `GET` | `/api/stats` | Statistiques |
| `POST` | `/api/notifications/subscribe` | Souscrire aux notifications push |
| `POST` | `/api/notifications/send` | Envoyer une notification |

---

## 🐳 Déploiement Docker

### Architecture des conteneurs

```
┌──────────────────────────────────────────────┐
│              Docker Network                   │
│              burger-network                   │
│                                              │
│  ┌────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ Caddy  │  │ Next.js  │  │ Socket.IO   │ │
│  │ :80    │─►│ :3000    │◄►│ :3003/:3004 │ │
│  │ :443   │  │          │  │             │ │
│  └────────┘  └────┬─────┘  └─────────────┘ │
│                   │                          │
│              ┌────▼─────┐                   │
│              │PostgreSQL│                   │
│              │ :5432    │                   │
│              └──────────┘                   │
└──────────────────────────────────────────────┘
```

### Commandes de déploiement

```bash
# Construction et démarrage
docker compose up -d --build

# Vérifier les logs
docker compose logs -f

# Redémarrer un service spécifique
docker compose restart app

# Arrêter tous les services
docker compose down

# Arrêter et supprimer les volumes (⚠️ perte de données)
docker compose down -v

# Reconstruire après modification du code
docker compose up -d --build app
```

### Migration vers PostgreSQL en production

Pour passer de SQLite à PostgreSQL avec Docker :

1. Modifiez `prisma/schema.prisma` :
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Modifiez `.env` :
   ```env
   DATABASE_URL=postgresql://burger:burger_secret@db:5432/burger_minute
   ```

3. Reconstruisez et redémarrez :
   ```bash
   docker compose up -d --build
   docker compose exec app npx prisma db push
   docker compose exec app npx prisma db seed
   ```

---

## 📄 Licence

Projet privé — AWID / BURGER MINUTE © 2025
