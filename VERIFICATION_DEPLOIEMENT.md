# ✅ VÉRIFICATION APRÈS DÉPLOIEMENT

## 🎯 Checklist Rapide

### 1. Cache Bust Fonctionnel ✅

**Ouvrir**: https://burgerminute.giize.com

**Console navigateur (F12)** doit montrer:
```
[Cache Bust] New deployment detected, clearing cache...
[Cache Bust] Cache cleared, reloading page...
```

**Ensuite la page reload automatiquement**

Si vous ne voyez pas ce message:
- Hard refresh: `Ctrl + Shift + R` (Windows) ou `Cmd + Shift + R` (Mac)
- Ou: Fermer TOUS les onglets de l'app et rouvrir

---

### 2. Horaires d'Ouverture ⏰

**Étape 1: Accéder à la page**
```
1. Login admin: 0550000000 / admin123
2. Regarder la barre de navigation en haut
3. Chercher le bouton "Horaires" avec icône horloge 🕐
4. Cliquer dessus
```

**Si vous NE VOYEZ PAS "Horaires"**:
- Hard refresh (Ctrl+Shift+R)
- Vérifier console: erreurs JavaScript?
- Déconnexion/Reconnexion

**Étape 2: Configurer**
```
1. Sur la page Horaires
2. Toggle "Activer la vérification" → ON
3. Modifier un horaire (ex: Lundi 10:00-22:00)
4. Cliquer "Sauvegarder les horaires" (bouton jaune en bas)
```

**Étape 3: Tester**
```
1. Mettre l'heure de fermeture à MAINTENANT - 1h
   (ex: il est 15:00, mettre fermeture à 14:00)
2. Sauvegarder
3. Ouvrir dans un AUTRE navigateur (ou mode incognito)
4. Aller sur: https://burgerminute.giize.com/checkout
5. Un modal avec countdown DOIT apparaître
```

---

### 3. Photo de Couverture 📸

**Étape 1: Accéder**
```
1. Login admin
2. Cliquer "Promos" dans la navigation
3. Cliquer sur l'onglet "Photo de Couverture" (en haut)
```

**Étape 2: Upload**
```
1. Cliquer dans la zone de upload
2. Sélectionner une image (max 5MB)
3. Attendre l'upload
4. Toggle "Afficher la couverture" → ON
```

**Si erreur JSON**:
- Vérifier console navigateur (F12)
- Chercher: `/api/settings/cover` dans Network tab
- Si 404 ou erreur: Le build n'inclut pas la route

**Étape 3: Vérifier affichage**
```
1. Ouvrir: https://burgerminute.giize.com/menu
2. L'image DOIT apparaître en haut du menu
```

---

### 4. Logout Redirect 🚪

**Test Admin**:
```
1. Login admin
2. Cliquer le bouton rouge "Logout" (icône en haut à droite)
3. DOIT rediriger vers: /menu (pas /login ou /admin/login)
```

**Test Livreur**:
```
1. Login livreur (0561111111 / livreur123)
2. Dashboard livreur apparaît
3. Cliquer "Logout" (icône rouge en haut)
4. DOIT rediriger vers: /menu (pas /livreur/login)
```

**Si ne redirige PAS vers /menu**:
- Vérifier URL dans barre d'adresse après logout
- Hard refresh après logout
- Clear cache navigateur complètement

---

## 🔧 Diagnostic API

### Test Health Check
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

### Test Hours API
```bash
curl https://burgerminute.giize.com/api/settings/hours
```

**Réponse attendue**:
```json
{
  "enabled": true,
  "monday": { "open": "09:00", "close": "23:00", "closed": false },
  ...
}
```

### Test Cover API
```bash
curl https://burgerminute.giize.com/api/settings/cover
```

**Réponse attendue**:
```json
{
  "coverImage": null,
  "enabled": false
}
```

**Si erreur 404**: La route n'est pas déployée. Vérifier logs Coolify.

---

## 🐛 Solutions aux Problèmes Courants

### Problème: "Je ne vois pas Horaires dans le menu"

**Solution 1: Cache navigateur**
```
1. Ctrl + Shift + R (hard refresh)
2. Ou: Ctrl + Shift + Delete → Clear cache
3. Ou: Mode incognito
```

**Solution 2: Vérifier le build**
```
1. Console (F12) → chercher erreurs
2. Network tab → chercher admin/hours
3. Si 404: Le build n'a pas inclu la page
```

**Solution 3: Déconnexion/Reconnexion**
```
1. Logout
2. Fermer TOUS les onglets
3. Rouvrir nouveau tab
4. Login à nouveau
```

---

### Problème: "Erreur JSON photo de couverture"

**Solution 1: Vérifier API directement**
```bash
curl -I https://burgerminute.giize.com/api/settings/cover
```

Si retourne 404 ou HTML:
```
→ La route API n'est pas déployée
→ Vérifier logs Coolify
→ Vérifier que le fichier existe dans le build
```

**Solution 2: Check logs Coolify**
```
1. Aller dans Coolify
2. Votre app → Logs
3. Chercher: "GET /api/settings/cover"
4. Doit montrer: [GET /api/settings/cover] Fetching...
```

**Solution 3: Rebuild complet**
```
Dans Coolify:
1. Rebuild with --no-cache
2. Attendre 3-5 minutes
3. Tester à nouveau
```

---

### Problème: "Logout ne redirige pas vers /menu"

**Solution 1: Vérifier la redirection**
```
1. Ouvrir DevTools (F12)
2. Onglet Network
3. Cliquer Logout
4. Regarder les requêtes
5. Chercher window.location.href = '/menu'
```

**Solution 2: JavaScript bloqué?**
```
1. Console (F12) → chercher erreurs
2. Si erreur "window is not defined": Problème SSR
3. Vérifier que typeof window !== 'undefined'
```

**Solution 3: Token non cleared**
```
1. Console: localStorage.clear()
2. Reload la page
3. Tester logout à nouveau
```

---

## 📊 Vérification Complète

### Checklist TOUT doit être ✅

- [ ] Page `/admin/hours` accessible
- [ ] Horaires configurables et sauvegardés
- [ ] Modal countdown apparaît quand fermé
- [ ] Photo couverture uploadable
- [ ] Photo couverture affichée sur /menu
- [ ] Logout admin → /menu
- [ ] Logout livreur → /menu
- [ ] `/api/health` retourne OK
- [ ] `/api/settings/hours` retourne JSON
- [ ] `/api/settings/cover` retourne JSON
- [ ] Cache bust fonctionne (console log)
- [ ] Pas d'erreur JavaScript en console
- [ ] Navigation admin complète visible
- [ ] Countdown se met à jour chaque seconde

---

## 🔥 Si RIEN ne fonctionne

### Rebuild Complet Force

**Dans Coolify**:
```
1. Stop l'application
2. Clear all caches
3. Rebuild from scratch
4. Attendre le déploiement complet
5. Test avec mode incognito
```

**En local (pour tester)**:
```bash
# Clean
rm -rf .next
rm -rf node_modules
npm cache clean --force

# Reinstall
npm install

# Build
npm run build

# Start
npm start
```

---

## 📞 Support Debug

**Build ID actuel**: `opening-hours-20260610-v2`

**Commandes debug utiles**:
```bash
# Check si les routes existent
curl -I https://burgerminute.giize.com/api/settings/hours
curl -I https://burgerminute.giize.com/api/settings/cover
curl -I https://burgerminute.giize.com/api/health

# Check page admin
curl -I https://burgerminute.giize.com/admin/hours
```

**Logs à chercher dans Coolify**:
```
✓ Compiled successfully
✓ .next/standalone created
[GET /api/settings/hours] ...
[GET /api/settings/cover] Fetching cover image...
```

---

## ✅ Résumé Actions

**Après déploiement**:

1. ✅ Hard refresh (Ctrl+Shift+R)
2. ✅ Vérifier console: cache bust message
3. ✅ Login admin
4. ✅ Chercher "Horaires" dans navigation
5. ✅ Si pas là: Déconnexion/Reconnexion + hard refresh
6. ✅ Tester logout → doit aller /menu
7. ✅ Tester upload cover dans Promo
8. ✅ Vérifier APIs avec curl

**Si problèmes persistent**:
- Mode incognito test
- Logs Coolify
- Rebuild complet
- Test en local d'abord

---

🎯 **L'essentiel**: Si vous ne voyez pas "Horaires", c'est un problème de cache navigateur. Hard refresh résout 90% des cas!
