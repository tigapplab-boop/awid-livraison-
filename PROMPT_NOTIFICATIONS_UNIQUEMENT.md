# Prompt à donner à ton agent codeur — uniquement le problème des notifications

Copie-colle tout ce bloc tel quel à ton agent (Claude Code / OpenClaw). Il a accès à ton dépôt réel, donc toutes les instructions ci-dessous sont écrites pour qu'il fasse les modifications lui-même, directement dans le code.

---

## PROMPT À COPIER-COLLER

```
Les notifications push ne fonctionnent pas dans l'application (repo
tigapplab-boop/awid-livraison-). J'ai identifié 3 causes précises à corriger.
Applique ces 3 corrections exactement comme décrit, vérifie que tout compile,
puis pousse le résultat sur GitHub via une Pull Request (pas directement sur
main).

=======================================================================
CORRECTION 1 — Mauvais format de clé envoyé au navigateur
Fichier : src/hooks/usePushNotifications.ts
=======================================================================

Le navigateur exige que la clé VAPID passée à `pushManager.subscribe()` soit
un tableau d'octets bruts (Uint8Array), pas une chaîne de texte. Actuellement
le code envoie directement `process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY` (une
string) — le navigateur rejette silencieusement l'abonnement à chaque fois
(l'erreur est capturée par un try/catch et seulement loguée en console, donc
invisible pour l'utilisateur).

Remplace tout le contenu du fichier src/hooks/usePushNotifications.ts par
ceci :

---DÉBUT DU FICHIER---
import { useState, useEffect } from 'react'

interface UsePushNotificationsReturn {
  isSupported: boolean
  permission: NotificationPermission
  isSubscribed: boolean
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

// Le navigateur exige que la clé VAPID soit passée sous forme d'octets bruts
// (Uint8Array), pas sous forme de texte — c'est une exigence standard de
// l'API Push (voir la documentation MDN sur PushManager.subscribe). Avant ce
// correctif, la clé texte était envoyée telle quelle, ce qui fait échouer
// l'abonnement à chaque fois, silencieusement (capturé par le try/catch plus
// bas) : aucune notification ne pouvait donc jamais être reçue.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window)
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const subscribe = async () => {
    if (!isSupported) {
      console.warn('Push notifications not supported')
      return
    }

    try {
      // Demander la permission
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== 'granted') {
        console.warn('Notification permission denied')
        return
      }

      // Récupérer le service worker
      const registration = await navigator.serviceWorker.ready

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        console.error(
          '[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY est manquante — impossible de s\'abonner. ' +
          'Cette variable doit être définie AU MOMENT DE LA COMPILATION (build), pas seulement à l\'exécution.'
        )
        return
      }

      // S'abonner aux push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      })

      // Envoyer l'abonnement au serveur
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
            auth: arrayBufferToBase64(subscription.getKey('auth')),
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to subscribe')
      }

      setIsSubscribed(true)
      console.log('Push subscription successful')
    } catch (error) {
      console.error('Push subscription error:', error)
    }
  }

  const unsubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()

        // Notifier le serveur
        await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })

        setIsSubscribed(false)
        console.log('Push unsubscription successful')
      }
    } catch (error) {
      console.error('Push unsubscription error:', error)
    }
  }

  return {
    isSupported,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
---FIN DU FICHIER---

=======================================================================
CORRECTION 2 — La clé publique VAPID n'est jamais transmise à Docker au
moment de la construction de l'image
Fichiers : Dockerfile, docker-compose.yml, docker-compose.coolify.yml
=======================================================================

Les variables commençant par NEXT_PUBLIC_ sont figées "en dur" dans le code
JavaScript envoyé au navigateur AU MOMENT DE LA COMPILATION (npm run build),
pas lues au démarrage du serveur. L'avoir définie comme simple variable
d'environnement dans Coolify ne suffit pas : il faut aussi la déclarer comme
argument de build Docker (ARG) et la transmettre explicitement comme "build
arg" dans docker-compose. Sans ça, elle vaut "undefined" pour toujours dans
le navigateur, même si sa vraie valeur existe bien dans Coolify.

Dans Dockerfile, trouve la section "Stage 2: Builder" — juste après la ligne
`COPY . .` qui s'y trouve (et avant la ligne `ENV NEXT_TELEMETRY_DISABLED=1`
si elle existe déjà), ajoute ces deux lignes :

    ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
    ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY

Dans docker-compose.yml ET dans docker-compose.coolify.yml, trouve la
section "build:" du service principal de l'application (celui qui construit
l'image Next.js, pas le socket-service). Si elle a déjà une sous-section
"args:", ajoute la ligne suivante dedans. Si elle n'a pas encore de
sous-section "args:", crée-la. Exemple de ce que ça doit donner :

    build:
      context: .
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}

(Adapte au format exact déjà présent dans chaque fichier — le principe est
d'ajouter cette ligne dans args: sous build:, sans changer le reste.)

=======================================================================
CORRECTION 3 — La connexion temps réel (Socket.IO) cherche un jeton qui
n'existe nulle part
Fichier : src/bm/lib/socket.ts
=======================================================================

Cherche dans ce fichier une ligne qui ressemble à ceci (récupération du
jeton de connexion pour authentifier la connexion Socket.IO) :

    const token = typeof window !== 'undefined' ? localStorage.getItem('bm_livreur_token') || localStorage.getItem('bm_admin_token') : null;

Les clés "bm_livreur_token" et "bm_admin_token" ne sont écrites nulle part
ailleurs dans le code — seule la clé "bm_token" est utilisée partout
(notamment dans src/app/login/page.tsx au moment de la connexion). Ce jeton
était donc toujours vide, et la connexion Socket.IO ne s'authentifiait
jamais correctement pour les livreurs ni pour l'admin — ce qui empêche
aussi certaines alertes en temps réel de fonctionner.

Remplace cette ligne par :

    // Correction : le jeton de connexion est toujours stocké sous la clé
    // "bm_token" (voir login/page.tsx) — les anciennes clés "bm_livreur_token"
    // et "bm_admin_token" ne sont écrites nulle part dans le code, donc ce
    // token était toujours vide et la connexion Socket.IO ne s'authentifiait
    // jamais correctement.
    const token = typeof window !== 'undefined' ? localStorage.getItem('bm_token') : null;

Si la ligne exacte trouvée dans le fichier diffère légèrement de celle
montrée ci-dessus, applique quand même le principe : la récupération du
jeton doit se faire uniquement via localStorage.getItem('bm_token'), pas via
'bm_livreur_token' ni 'bm_admin_token'.

=======================================================================
VÉRIFICATION ET PUBLICATION
=======================================================================

1. Crée une nouvelle branche à partir de main, nommée : fix/push-notifications

2. Applique les 3 corrections ci-dessus.

3. Vérifie que tout compile :
   - npm install
   - npx tsc --noEmit    → doit renvoyer 0 erreur
   - npm run build       → doit se terminer sans erreur

4. Si une vérification échoue, corrige l'erreur avant de continuer — ne pousse
   rien de cassé.

5. Commit avec un message clair, par exemple :
   "fix: notifications push (clé VAPID mal formatée + non transmise au build + jeton socket incorrect)"

6. Pousse la branche fix/push-notifications sur GitHub et ouvre une Pull
   Request vers main, avec une description qui résume les 3 corrections
   ci-dessus.

7. Ne merge PAS la Pull Request automatiquement — laisse-la ouverte pour
   relecture.

Ne touche à aucun autre fichier que ceux mentionnés dans ce prompt.
```

---

## Une action qui te revient, après le déploiement de cette Pull Request

Une fois cette Pull Request fusionnée et déployée, il faut un **redéploiement complet** dans Coolify (pas un simple redémarrage) — sinon la variable `NEXT_PUBLIC_VAPID_PUBLIC_KEY` ne sera pas réellement recompilée dans le code envoyé aux navigateurs, même si tout le reste est correct.

Ensuite, pour tester : connecte-toi en tant que livreur sur ton téléphone, autorise les notifications quand la demande apparaît, puis fais créer une commande test depuis un autre appareil (ou demande à quelqu'un de commander) — une notification doit apparaître sur le téléphone du livreur.
