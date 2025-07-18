# Mode Opératoire DegenLadder

## 1. Comment ajouter un utilisateur dans la base de données

- Utiliser le script suivant :
Depuis /backend (cd backend)
  ```bash
  node scripts/addUser.js <adresse_wallet1> <adresse_wallet2> ...
  ```
- Ce script :
  - **Reproduit strictement la logique de la première connexion utilisateur (endpoint `/user/connect`)**
  - Vérifie si l'utilisateur existe déjà dans la table `users`
  - Si l'utilisateur n'existe pas, il l'ajoute à la base avec la date de scan
  - Lance automatiquement le scan complet avec la bonne logique (worker natif)
  - Rafraîchit la vue matérialisée `degen_rank` pour mettre à jour le classement
  - **Aucune action manuelle supplémentaire n'est nécessaire.**
- **Remarque :**
  - Si l'utilisateur existe déjà, aucun scan n'est relancé (pour rafraîchir un utilisateur existant, utiliser le bouton "refresh" ou le script dédié)

---

## 2. Comment rafraîchir toutes les données manuellement depuis la dernière mise à jour

- Utiliser le script dédié :
  ```bash
  node backend/scripts/runManualWorker.js
  ```
- **Ce que fait ce script en détail :**
  - Il lance le worker en mode global (scan de tous les utilisateurs).
  - **Quels utilisateurs sont concernés ?**
    - Tous les wallets présents dans la table `users` de la base de données Supabase (ajoutés via l'app, addUser.js, ou autre).
  - **Quelle période de transactions est scannée ?**
    - Pour chaque utilisateur, seules les transactions depuis la dernière date de scan (`last_scanned_at`) sont analysées.
    - Si c'est la première fois pour un utilisateur, **tout l'historique** est scanné.
  - **Comment la vue `degen_rank` est-elle rafraîchie ?**
    - À la fin du process, la fonction `refreshDegenRank()` est appelée, qui exécute un RPC Supabase :
      ```js
      await supabase.rpc('refresh_degen_rank');
      ```
    - Cela force le rafraîchissement de la vue matérialisée `degen_rank` dans la base.
  - **Résumé du process :**
    1. Récupère tous les utilisateurs de la table `users`.
    2. Pour chaque utilisateur, scanne les transactions depuis la dernière date de scan (ou tout l’historique si c’est la première fois).
    3. Met à jour les scores, PNL, win/loss, etc.
    4. Rafraîchit la vue `degen_rank` pour mettre à jour le classement global.

---

## 3. Ce qui se passe lors de la première connexion d'un utilisateur

### Déclenchement automatique
- **Quand ?** Dès qu'un utilisateur se connecte avec son wallet Solana sur l'application mobile
- **Où ?** Dans `HomeScreen.tsx`, ligne 32-50 : un `useEffect` se déclenche automatiquement quand `userAddress` devient disponible
- **Quoi ?** Le frontend appelle l'endpoint `POST /user/connect` du backend avec l'adresse du wallet

### Processus côté backend (dans `api/index.js`, lignes 330-384)
1. **Vérification d'existence** : Le backend vérifie si l'adresse existe déjà dans la table `users`
2. **Si l'utilisateur existe déjà** :
   - Aucune action n'est effectuée
   - Réponse : `200 - "User already exists. Welcome back!"`
3. **Si l'utilisateur est nouveau** :
   - L'utilisateur est ajouté à la table `users` avec `last_scanned_at` = maintenant
   - Le worker est lancé en arrière-plan avec `runWorker(userAddress)` (mode scan complet)
   - Réponse immédiate : `201 - "User created successfully. Scan initiated."`

### Scan en arrière-plan
- **Mode** : Scan complet (`getFullHistory`) - analyse tout l'historique des transactions
- **Plateformes** : Pump.fun ET Bonk.fun sont analysées en série
- **Durée** : Variable selon le nombre de transactions (peut prendre plusieurs minutes)
- **Non-bloquant** : Le frontend ne bloque pas, l'utilisateur peut continuer à utiliser l'app
- **Rafraîchissement automatique** : La vue matérialisée `degen_rank` est rafraîchie à la fin du scan

### Résultat final
- L'utilisateur apparaît dans le classement avec ses données de trading
- Son `last_scanned_at` est mis à jour dans la base
- Le `last_global_update_at` n'est PAS modifié (seulement pour les scans globaux)

**Résumé :**
- L'ajout d'un utilisateur ou une connexion déclenche toujours un scan complet et une mise à jour du classement, sans intervention manuelle. 

---

## 4. Comment vérifier les résultats de l'ajout d'un utilisateur (addUser)

- Utiliser le script suivant :
Depuis le dossier backend (cd backend)
  ```bash
  node scripts/checkUser.js <adresse_wallet>
  ```
- Ce script :
  - Interroge la base Supabase pour afficher toutes les données liées à l'utilisateur (table `users`, `trades_pump`, `trades_bonk`)
  - Affiche le score, le PNL, le nombre de trades, les tokens traités, les dates de scan, etc.
  - Permet de vérifier que l'utilisateur a bien été ajouté, que le scan a été effectué et que les données sont cohérentes
- **Astuce** :
  - Pour vérifier le classement, consulter la vue matérialisée `degen_rank` (via Supabase ou via l'API/leaderboard)
  - Pour un contrôle avancé, utiliser aussi le script d'analyse détaillée (`testToken.js`) pour comparer le PNL calculé avec celui en base 

---

## 5. Comment connaitre le PNL d'un wallet sur un token donné ?

- `testToken.js` permet d’analyser en détail toutes les transactions d’un wallet pour un token donné (mint), afin de calculer précisément le PNL (Profit and Loss) en SOL et d’afficher toutes les informations utiles sur les achats/ventes de ce token.
Il peut par exemple être cohérent de checker le PNL d'un top trader sur dexscreener sur un token donné et de le comparer avec le PNL calculé par le script testToken.js. Ex : token Valentine sur wallet 0x1234567890123456789012345678901234567890

- **Utilisation typique :**
  ```bash
  node backend/scripts/testToken.js <adresse_wallet> <mint_token>
  ```
  Exemple :
  ```bash
  node backend/scripts/testToken.js HRFekhACsTUj9tRNHR8VfgBSYZp4BodaQwrqfpSePkMT 9GtvcnDUvGsuibktxiMjLQ2yyBq5akUahuBs8yANbonk
  ```

- **Ce que fait ce script :**
  - Récupère toutes les transactions du wallet pour le token spécifié
  - Identifie précisément les achats et ventes
  - Calcule le SOL dépensé, reçu, le PNL, le nombre d’achats/ventes, etc.
  - Affiche le détail de chaque transaction (date, type, montants, signatures)
  - Permet de comparer le PNL réel on-chain avec celui stocké en base

- **Pourquoi l’utiliser ?**
  - Pour auditer un cas précis (debug avancé)
  - Pour valider la logique du worker sur un wallet/token donné
  - Pour détecter des incohérences ou erreurs d’analyse

- **Remarque :** Ce script ne modifie jamais la base, il est purement analytique et indépendant du worker ou des données stockées. 