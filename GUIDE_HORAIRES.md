# 🕐 GUIDE - Horaires d'Ouverture

## 📋 Vue d'ensemble

Cette fonctionnalité permet à l'admin de définir les heures d'ouverture et de fermeture du restaurant pour chaque jour de la semaine. Quand le restaurant est fermé, les clients voient un modal avec un compte à rebours jusqu'à la prochaine ouverture.

---

## 🎯 Fonctionnalités

### Pour l'Admin:

✅ **Page de gestion complète** dans Admin → Horaires
✅ **Activer/Désactiver** la vérification des horaires
✅ **Horaires par jour** (Lundi à Dimanche)
✅ **Marquer des jours fermés** (ex: Dimanche fermé)
✅ **Copier les horaires** à tous les jours d'un clic
✅ **Format 24h** avec sélecteurs de temps intuitifs

### Pour le Client:

✅ **Vérification automatique** à l'ouverture de la page commande
✅ **Modal élégant** avec icône et message clair
✅ **Compte à rebours en temps réel** jusqu'à l'ouverture
✅ **Messages bilingues** (Français + Arabe)
✅ **Calcul intelligent** de la prochaine ouverture
✅ **Actualisation automatique** quand le restaurant ouvre
✅ **Browsing du menu autorisé** (mais pas de commande)

---

## 🚀 Utilisation Admin

### Accéder à la page:

1. Se connecter en tant qu'admin
2. Cliquer sur **"Horaires"** dans la navigation
3. La page affiche les horaires actuels

### Configuration de base:

**1. Activer le système**
```
Toggle: "Activer la vérification des horaires" → ON
```

**2. Définir les horaires**
```
Lundi:    Ouverture: 09:00  |  Fermeture: 23:00
Mardi:    Ouverture: 09:00  |  Fermeture: 23:00
...
Dimanche: Ouverture: 09:00  |  Fermeture: 23:00
```

**3. Marquer un jour fermé**
```
Dimanche: Toggle → OFF (apparaît "Fermé toute la journée")
```

**4. Copier à tous les jours**
```
Cliquer "Copier à tous" sur Lundi pour appliquer les mêmes horaires partout
```

**5. Sauvegarder**
```
Bouton jaune en bas: "Sauvegarder les horaires"
```

---

## 📱 Expérience Client

### Scénario 1: Restaurant Ouvert

Client accède à `/checkout`:
- ✅ Aucun modal
- ✅ Peut passer commande normalement
- ✅ Message subtil: "Ouvert jusqu'à 23:00" (optionnel)

### Scénario 2: Restaurant Fermé

Client accède à `/checkout`:
- 🚫 Modal apparaît immédiatement
- 📅 Message: "Fermé. Ouverture demain à 09:00"
- ⏱️ Compte à rebours: "14h 35min 12s"
- 👀 Peut fermer le modal et voir le menu
- 🚫 Ne peut pas valider de commande
- 🔄 Le compte à rebours se met à jour chaque seconde

### Scénario 3: Ouverture Imminente

Client voit:
```
Temps restant avant ouverture
       4min 23s
```

Quand le compte arrive à 0:
- ✅ Page se recharge automatiquement
- ✅ Client peut maintenant commander

---

## 🔧 Exemples de Configuration

### Exemple 1: Restaurant Standard
```javascript
Lundi-Vendredi:  09:00 - 23:00  (Ouvert)
Samedi:          10:00 - 00:00  (Ouvert)
Dimanche:        Fermé
```

### Exemple 2: Fast-Food 7/7
```javascript
Tous les jours:  08:00 - 01:00  (Ouvert)
```

### Exemple 3: Horaires Variables
```javascript
Lundi:          09:00 - 22:00
Mardi:          09:00 - 22:00
Mercredi:       Fermé (jour de repos)
Jeudi:          09:00 - 22:00
Vendredi:       09:00 - 00:00  (service prolongé)
Samedi:         10:00 - 00:00
Dimanche:       10:00 - 22:00
```

### Exemple 4: Service de Nuit
```javascript
Tous les jours:  18:00 - 06:00  (service nocturne)
Note: Le système gère automatiquement le passage de minuit
```

---

## 💡 Logique de Calcul

### Détermination de la prochaine ouverture:

1. **Aujourd'hui avant l'heure d'ouverture?**
   → Prochaine ouverture = aujourd'hui à HH:MM

2. **Aujourd'hui après l'heure de fermeture?**
   → Cherche le prochain jour ouvert

3. **Aujourd'hui = Fermé?**
   → Cherche le prochain jour ouvert

4. **Tous les jours fermés?**
   → Affiche "prochainement" (sans countdown)

### Exemples de Messages:

**Français:**
- "Fermé. Ouverture aujourd'hui à 09:00"
- "Fermé. Ouverture demain à 09:00"
- "Fermé. Ouverture Lundi à 09:00"
- "Fermé aujourd'hui. Ouverture demain à 10:00"

**Arabe:**
- "مغلق. سيفتح اليوم في 09:00"
- "مغلق. سيفتح غداً في 09:00"
- "مغلق. سيفتح الإثنين في 09:00"

---

## 🎨 Design du Modal

### Composition:
```
┌─────────────────────────────┐
│  🔴  NOUS SOMMES FERMÉS    │  ← Header orange
├─────────────────────────────┤
│                             │
│  Fermé. Ouverture demain   │  ← Message
│       à 09:00               │
│                             │
│  ┌───────────────────────┐ │
│  │ Temps restant avant   │ │  ← Box compte à rebours
│  │     ouverture         │ │
│  │                       │ │
│  │      14h 35min       │ │  ← Countdown
│  └───────────────────────┘ │
│                             │
│  💡 Vous pouvez consulter  │  ← Info box
│     le menu maintenant      │
│                             │
│  [Voir le menu] [Actualiser]│  ← Actions
└─────────────────────────────┘
```

### Couleurs:
- Header: Dégradé Rouge → Orange
- Countdown Box: Jaune dégradé (#FFD700)
- Texte: Noir stone-900
- Fond: Blanc avec backdrop blur

---

## 🧪 Tests

### Test 1: Activation/Désactivation
```
1. Admin → Horaires
2. Désactiver "Activer la vérification"
3. Sauvegarder
4. Client → /checkout
5. ✅ Devrait pouvoir commander même hors heures
```

### Test 2: Jour Fermé
```
1. Admin → Horaires
2. Marquer Dimanche comme fermé
3. Sauvegarder
4. Client → /checkout (Dimanche)
5. ✅ Modal apparaît avec "Fermé aujourd'hui"
6. ✅ Compte à rebours jusqu'à Lundi
```

### Test 3: Heure d'Ouverture Imminente
```
1. Admin → Horaires → Ouverture 09:00
2. Attendre 08:58
3. Client → /checkout
4. ✅ Modal avec "2min 15s"
5. ✅ Attendre que countdown atteigne 0
6. ✅ Page se recharge automatiquement
7. ✅ Client peut maintenant commander
```

### Test 4: Copier à Tous
```
1. Admin → Horaires
2. Lundi: 10:00 - 22:00
3. Cliquer "Copier à tous"
4. ✅ Tous les jours ont maintenant 10:00 - 22:00
5. Sauvegarder
```

### Test 5: Navigation Multilingue
```
1. Client FR → /checkout (fermé)
2. ✅ Messages en français
3. Changer langue → AR
4. ✅ Messages en arabe avec RTL
5. ✅ Countdown reste identique
```

---

## 🐛 Dépannage

### Problème: Modal ne s'affiche pas

**Cause possible**: Feature désactivée
```
Solution:
1. Admin → Horaires
2. Vérifier que "Activer la vérification" est ON
3. Sauvegarder
```

**Cause possible**: Horaires mal configurés
```
Solution:
1. Vérifier format HH:MM (24h)
2. Vérifier que Fermeture > Ouverture
3. Re-sauvegarder
```

### Problème: Countdown ne s'actualise pas

**Cause**: JavaScript bloqué
```
Solution:
1. Hard refresh: Ctrl+Shift+R
2. Vérifier console pour erreurs
3. Vérifier que le script cache-bust.js est chargé
```

### Problème: Mauvais calcul de prochaine ouverture

**Cause**: Timezone incorrecte
```
Vérification:
- Le système utilise l'heure du navigateur client
- Vérifier que l'heure système est correcte
- Le serveur utilise UTC, conversion automatique
```

---

## 📊 API Endpoints

### GET `/api/settings/hours`
**Public** - Récupère les horaires

**Response**:
```json
{
  "enabled": true,
  "monday": { "open": "09:00", "close": "23:00", "closed": false },
  "tuesday": { "open": "09:00", "close": "23:00", "closed": false },
  "wednesday": { "open": "09:00", "close": "23:00", "closed": false },
  "thursday": { "open": "09:00", "close": "23:00", "closed": false },
  "friday": { "open": "09:00", "close": "23:00", "closed": false },
  "saturday": { "open": "09:00", "close": "23:00", "closed": false },
  "sunday": { "open": "09:00", "close": "23:00", "closed": true }
}
```

### PUT `/api/settings/hours`
**Admin uniquement** - Met à jour les horaires

**Request**:
```json
{
  "enabled": true,
  "monday": { "open": "10:00", "close": "22:00", "closed": false },
  ...
}
```

**Headers**:
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

---

## 🔐 Sécurité

### Vérifications:

✅ **Côté serveur**: L'API vérifie que seuls les admins peuvent modifier
✅ **Côté client**: Le modal empêche la soumission du formulaire
✅ **Double vérification**: Même si le client bypass le modal, le serveur pourrait ajouter une vérification supplémentaire (optionnel)

### Recommandation Future:

Ajouter vérification serveur dans `/api/orders/temp`:
```typescript
// Optionnel: vérifier côté serveur aussi
const hours = await getOpeningHours();
const status = isRestaurantOpen(hours);
if (!status.isOpen && hours.enabled) {
  return NextResponse.json(
    { error: 'Restaurant fermé' },
    { status: 400 }
  );
}
```

---

## 📈 Statistiques & Analytics

### Métriques Utiles (à implémenter):

1. **Nombre de tentatives de commande hors horaires**
2. **Taux de rebond sur modal fermé**
3. **Temps moyen passé sur le modal**
4. **Commandes passées immédiatement après ouverture**

### Tracking Recommandé:

```javascript
// Quand modal apparaît
analytics.track('restaurant_closed_modal_shown', {
  nextOpening: restaurantStatus.nextOpening,
  currentTime: new Date(),
});

// Quand client ferme le modal
analytics.track('restaurant_closed_modal_dismissed');

// Quand countdown atteint 0
analytics.track('restaurant_opened_countdown_complete');
```

---

## ✅ Checklist de Déploiement

Après déploiement, vérifier:

- [ ] Admin peut accéder à `/admin/hours`
- [ ] Horaires par défaut chargent correctement
- [ ] Sauvegarde fonctionne (vérifier la DB)
- [ ] Modal s'affiche quand fermé
- [ ] Countdown fonctionne et se met à jour
- [ ] Messages FR/AR s'affichent correctement
- [ ] Boutons du modal fonctionnent
- [ ] Page se recharge au bout du countdown
- [ ] Client peut toujours voir le menu
- [ ] Client ne peut pas commander quand fermé
- [ ] "Copier à tous" fonctionne
- [ ] Toggle jour fermé fonctionne
- [ ] Animation du modal est fluide
- [ ] Mobile responsive (iPhone/Android)
- [ ] RTL fonctionne en arabe

---

## 🎉 Conclusion

Cette fonctionnalité permet une gestion flexible et professionnelle des horaires d'ouverture avec une excellente expérience utilisateur. Le compte à rebours en temps réel maintient l'engagement du client et l'informe précisément de quand il pourra commander.

**Avantages:**
- ✅ Réduit les commandes impossibles à traiter
- ✅ Informe clairement les clients
- ✅ Maintien de l'engagement avec le countdown
- ✅ Flexibilité totale pour l'admin
- ✅ Support multilingue complet
- ✅ Design moderne et professionnel

**Utilisation typique:**
1. Admin configure une fois les horaires
2. Système fonctionne automatiquement
3. Clients voient le modal uniquement quand nécessaire
4. Pas d'intervention manuelle requise

---

📞 **Questions ou problèmes?** Vérifiez les logs Coolify ou testez en local d'abord!
