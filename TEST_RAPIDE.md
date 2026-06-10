# ✅ TESTS RAPIDES APRÈS DÉPLOIEMENT

## ⏱️ Attendre 2-3 minutes que Coolify termine

---

## 1️⃣ TEST HORAIRES (LE PLUS IMPORTANT)

### Étape 1: Hard Refresh
```
1. Ouvrir: https://burgerminute.giize.com
2. Appuyer: Ctrl + Shift + R (Windows) ou Cmd + Shift + R (Mac)
3. OU: Fermer TOUS les onglets et rouvrir
```

### Étape 2: Login Admin
```
Phone: 0550000000
Password: admin123
```

### Étape 3: Vérifier Sidebar
```
✅ Dans la sidebar à gauche, vous DEVEZ voir:
   - Dashboard
   - POS / Caisse
   - Produits
   - Promos
   - ⏰ Horaires  ← NOUVEAU! Doit être là
   - Zones
   - Livreurs
   - etc.
```

### Étape 4: Cliquer sur Horaires
```
✅ La page doit charger
✅ Vous voyez:
   - Toggle "Activer la vérification"
   - Liste des jours (Lundi à Dimanche)
   - Inputs avec heures (09:00 - 23:00)
   - Bouton jaune "Sauvegarder" en bas
```

### Étape 5: Tester
```
1. Modifier Lundi: 10:00 - 22:00
2. Cliquer "Sauvegarder les horaires"
3. Message vert "Horaires mis à jour ✓" doit apparaître
4. Recharger la page (F5)
5. Les horaires doivent être sauvegardés
```

---

## 2️⃣ TEST LOGOUT

### Admin Logout:
```
1. Cliquer bouton rouge "Déconnexion" en bas de sidebar
2. URL doit devenir: /menu (PAS /login ou /admin/login)
3. Vous voyez la page menu client
```

### Livreur Logout:
```
1. Login livreur: 0561111111 / livreur123
2. Dashboard livreur apparaît
3. Cliquer icône rouge logout en haut
4. URL doit devenir: /menu (PAS /livreur/login)
```

---

## 3️⃣ TEST PHOTO COUVERTURE

### Accéder:
```
1. Login admin
2. Sidebar → Cliquer "Promos"
3. En haut → Onglet "Photo de Couverture"
```

### Vérifier:
```
✅ L'onglet charge SANS erreur JSON
✅ Vous voyez:
   - Zone de upload (cliquer pour uploader)
   - Toggle "Afficher la couverture"
   - Pas de message d'erreur rouge
```

### Upload:
```
1. Cliquer zone upload
2. Sélectionner une image (max 5MB)
3. Attendre...
4. Message vert "Photo de couverture uploadée ✓"
5. Image apparaît en prévisualisation
```

### Vérifier sur menu:
```
1. Ouvrir: https://burgerminute.giize.com/menu
2. L'image DOIT apparaître en haut
```

---

## 🐛 SI PROBLÈME PERSISTE

### "Horaires" toujours pas visible:

**Solution 1: Clear cache complet**
```
1. Navigateur → Paramètres
2. Confidentialité → Effacer les données
3. Cocher: Cache, Cookies
4. Période: Tout
5. Effacer
6. Redémarrer navigateur
7. Recharger l'app
```

**Solution 2: Mode Incognito**
```
1. Ouvrir fenêtre privée/incognito
2. Aller sur l'app
3. Login admin
4. Si "Horaires" apparaît → c'est un problème de cache
5. Revenir en mode normal et clear cache
```

**Solution 3: Autre navigateur**
```
1. Essayer avec Chrome si vous êtes sur Firefox
2. Ou vice versa
3. Si ça marche → c'est le cache de l'ancien navigateur
```

### Erreur JSON cover persiste:

**Vérifier API directement**:
```bash
curl https://burgerminute.giize.com/api/settings/cover
```

**Doit retourner**:
```json
{"coverImage":null,"enabled":false}
```

**Si retourne HTML ou 404**: Rebuild pas encore terminé, attendre 1-2 min

### Logout va toujours vers /login:

**Clear localStorage**:
```
1. Console (F12)
2. Taper: localStorage.clear()
3. Enter
4. Recharger la page
5. Tester logout à nouveau
```

---

## ✅ SUCCÈS = TOUS CES POINTS:

- [x] "Horaires" visible dans sidebar admin
- [x] Page /admin/hours charge correctement
- [x] Horaires modifiables et sauvegardables
- [x] Logout admin → /menu
- [x] Logout livreur → /menu
- [x] Onglet cover charge sans erreur
- [x] Upload cover fonctionne
- [x] Image cover affichée sur /menu

---

## 📊 BONUS: Tester Countdown

### Setup:
```
1. Admin → Horaires
2. Activer "Vérification des horaires"
3. Mettre fermeture à: MAINTENANT - 1 heure
   (ex: il est 15:00, mettre fermeture 14:00)
4. Sauvegarder
```

### Test Client:
```
1. Ouvrir mode incognito
2. Aller: https://burgerminute.giize.com/checkout
3. Modal doit apparaître avec:
   - Message "Fermé"
   - Countdown qui se met à jour
   - Prochaine ouverture affichée
```

---

## 🎯 RÉSUMÉ

**Build ID actuel**: `opening-hours-20260610-v2`

**3 Fixes critiques**:
1. ✅ Horaires ajouté dans sidebar
2. ✅ Logout redirige vers /menu
3. ✅ Cover API parsing simplifié

**Après déploiement**:
- Hard refresh OBLIGATOIRE
- Cache bust se fait automatiquement
- Nouvelle sidebar avec Horaires
- Logout correct
- Cover sans erreur JSON

**Si ça ne marche pas**:
- Attendre 5 minutes (build peut prendre du temps)
- Effacer cache navigateur complet
- Tester en mode incognito
- Essayer autre navigateur
- Check logs Coolify

---

🚀 **Le déploiement est en cours! Dans 2-3 minutes tout doit être OK!**
