# Contexte du Projet DegenLadder

Ce document sert de source de vérité pour l'IA afin de maintenir une compréhension complète et à jour du projet DegenLadder.

## 1. Objectif Général

DegenLadder est une application web et mobile qui affiche un classement (leaderboard) en temps réel des traders sur différentes plateformes de l'écosystème Solana (ex: pump.fun, Bonk).

## 2. Architecture Globale

Le projet est un monorepo structuré comme suit :
- `backend/`: Un serveur Node.js qui gère la collecte de données et l'API.
- `frontend/`: Une application React Native (avec Expo) pour l'interface utilisateur.

## 3. Backend en Détail

- **Technologie**: Node.js avec Express.js.
- **`backend/api/index.js`**: Expose une API REST. Les routes principales sont :
    - `/leaderboard/*`: Sert les données du classement depuis la base de données.
    - `/user/connect` (POST): Enregistre une nouvelle adresse utilisateur. **Déclencheur Clé**: Cet endpoint lance un scan **immédiat et complet** (`getFullHistory`) du worker pour ce nouvel utilisateur afin de peupler ses données initiales.
    - `/user/:userAddress/stats` (GET): Récupère les statistiques d'un utilisateur, incluant un objet `globalStats` (depuis la vue `degen_rank`) et un objet `platformStats` (calculé à la volée depuis les tables `trades_*`).
    - `/user/:userAddress/refresh` (POST): Déclenche un scan incrémental pour un utilisateur spécifique. Utilisé par le bouton de rafraîchissement manuel sur l'écran de détails. **Sécurité** : Limite de 24h entre chaque rafraîchissement manuel par utilisateur, avec vérification de `last_manual_refresh_at`.
    - `/user/:userAddress/score-history` (GET): Récupère l'historique des scores d'un utilisateur depuis la table `rank_history` pour afficher l'évolution du classement dans un graphique.
    - `/user/:userAddress` (DELETE): Supprime toutes les données liées à l'utilisateur (trades, entrée dans users) et rafraîchit la vue matérialisée `degen_rank`. **Conformité RGPD** : si l'utilisateur se reconnecte, ses données publiques seront automatiquement re-fetch et ré-analysées.
    - `/api/cron` (GET): Endpoint sécurisé par un token secret (`CRON_SECRET`). Il lance la logique du worker pour une **mise à jour globale et incrémentale** de tous les utilisateurs existants.
- **`worker.js`**: N'est plus un script autonome. C'est une **librairie de fonctions** qui contient la logique ETL. Sa robustesse a été grandement améliorée pour gérer les limitations des API externes.
    - **Logique d'Extraction (Helius API)**:
        - **Scan Complet (`getFullHistory`)**: Utilisé pour les nouveaux utilisateurs. Parcourt tout l'historique des transactions.
        - **Scan Incrémental (`getRecentHistory`)**: Utilisé par le cron. Ne récupère que les transactions survenues depuis la dernière exécution réussie, en se basant sur le timestamp `trades_updated_at` de la table `system_status`.
        - **Stratégie anti "Rate-Limiting"**: Pour éviter les erreurs 429 de Helius, une stratégie de temporisation à plusieurs niveaux est implémentée :
            1.  Une pause de **1 seconde** est observée après chaque "page" de transactions récupérée.
            2.  Une pause de **1 seconde** est observée entre le scan de la plateforme `.pump` et celui de `.bonk` pour un même utilisateur.
            3.  Les utilisateurs sont traités en lots (`chunks`) pour structurer le processus.
            4.  Au sein d'un lot, les utilisateurs sont traités **en série** (un par un).
    - **Logique Transform & Load**: Identique (analyse, agrégation, calcul du score, upsert dans les tables `trades_*`).

## 4. Frontend en Détail

- **Technologie Principale**: React Native avec Expo, écrit en TypeScript.
- **Structure**: Le code source se trouve dans `frontend/src/`. Il utilise une navigation par écrans (`screens/`) et des composants réutilisables (`components/`).
- **Fonctionnalité**: Le frontend appelle l'API du backend pour récupérer les données du leaderboard et les affiche à l'utilisateur.
- **Composants Avancés et Build Natif**:
    - **Pile 3D**: Pour des effets visuels modernes, le projet utilise `three.js`, `@react-three/fiber` et `framer-motion-3d` pour rendre des composants en 3D (ex: `GlowingCard.tsx`).
    - **Build de Développement**: L'utilisation de ces librairies graphiques avancées nécessite la création d'un **build de développement personnalisé** via Expo Application Services (EAS). L'application standard Expo Go n'est pas suffisante.
- **Logique Clé**: 
    - Le frontend appelle l'API du backend pour récupérer les données.
    - Lors d'une connexion réussie, il appelle l'endpoint `/user/connect` pour s'assurer que l'adresse de l'utilisateur est bien enregistrée côté serveur.
    - Le leaderboard est interactif : un clic sur un utilisateur dans le classement redirige vers sa page de détails (`DetailsScreen`).
    - `DetailsScreen.tsx` affiche les statistiques détaillées d'un utilisateur. Il présente des statistiques globales, des statistiques par plateforme (`pump.fun`, `letsbonk.fun`), ainsi qu'un historique des trades récents. Il inclut également un bouton de rafraîchissement manuel.

## 5. Base de Données (Supabase)

La base de données contient 4 tables principales, une table de statut, une vue matérialisée et une table d'historique des rangs.

### Table `users`
Stocke les adresses des utilisateurs. C'est la **source de vérité** pour le worker. Chaque utilisateur a son propre timestamp de scan et de rafraîchissement manuel.
**Logique**: Cette table est peuplée via l'endpoint `/user/connect` à chaque fois qu'un nouvel utilisateur se connecte.

```sql
CREATE TABLE users (
  id bigint,
  address text,
  username text,
  created_at timestamp,
  plan text DEFAULT 'basic',
  last_scanned_at timestamp with time zone, -- Mis à jour après chaque scan de cet utilisateur
  last_manual_refresh_at timestamp with time zone, -- Mis à jour après chaque rafraîchissement manuel (limite 24h)
  PRIMARY KEY (address)
);
```

### Tables `trades_pump` et `trades_bonk`
Ces deux tables stockent les données de trade analysées par le `worker.js`. Elles ont une structure identique.

```sql
CREATE TABLE trades_pump (
  user_address text,
  token_mint text,
  status text,
  pnl_sol numeric,
  sol_spent_lamports bigint,
  sol_received_lamports bigint,
  first_buy_at timestamp,
  last_sell_at timestamp,
  first_buy_tx text,
  last_sell_tx text,
  buy_transactions text[],
  sell_transactions text[],
  degen_score int,
  PRIMARY KEY (user_address, token_mint)
);
```
La table `trades_bonk` est identique. 

### Table `system_status`
Cette table ne contient qu'une seule ligne et un seul timestamp, qui sert de référence pour la dernière mise à jour globale de **tous** les utilisateurs.

```sql
CREATE TABLE system_status (
  id int, -- Toujours 1
  last_global_update_at timestamp with time zone
);
```
- `last_global_update_at`: Mis à jour uniquement à la fin d'un scan global réussi de tous les trades.

### Table `rank_history`
Stocke l'historique du rang utilisateur pour chaque date de snapshot. Permet d'afficher l'évolution du classement jour après jour (flèche, +1/-2, etc).

```sql
CREATE TABLE rank_history (
  user_address TEXT NOT NULL,
  rank INTEGER NOT NULL,
  snapshot_date DATE NOT NULL,
  PRIMARY KEY (user_address, snapshot_date)
);
```

### Vue Matérialisée `degen_rank`
Pour garantir des temps de chargement rapides, le classement principal est une **vue matérialisée**. Elle agrège les scores, le PNL et le nombre de trades pour chaque utilisateur.
**Logique de jointure**: Utilise un `LEFT JOIN` depuis la table `users` pour s'assurer que **tous les utilisateurs** sont présents dans le classement, même ceux avec 0 trade.
**Automatisation**: Elle est rafraîchie par le `worker.js` à la fin de **chaque** exécution (globale ou ciblée).

## 6. Algorithme du "Degen Score" V1
Le score est calculé pour chaque trade complet (achat/vente) et stocké dans la colonne `degen_score`.
- **Trade Gagnant**: +10 points
- **Trade Perdant**: -10 points
- **Bonus PnL** (uniquement si PNL > 0): `50 * log(1 + pnl_en_sol)`

## 7. Stratégies de Données et de Rafraîchissement

Le système utilise deux processus distincts et complémentaires pour maintenir les données à jour.

### 7.1. Processus 1 : Connexion d'un Nouvel Utilisateur (Scan Ciblé et Intelligent)
Objectif: Fournir des données initiales et une place dans le classement, uniquement si l'utilisateur est nouveau.
Déclencheur: Un utilisateur se connecte à l'application. Le frontend appelle l'endpoint POST /user/connect.
Mécanisme Détaillé:
Le backend reçoit la requête et vérifie si l'adresse de l'utilisateur existe déjà dans la table users.
Si l'utilisateur n'existe pas :
Il est ajouté à la table users.
Le worker.js est lancé en arrière-plan en mode ciblé pour scanner son historique complet.
Le last_scanned_at de l'utilisateur est mis à jour.
La vue matérialisée degen_rank est rafraîchie.
Si l'utilisateur existe déjà :
Le serveur renvoie une réponse de succès et ne fait rien d'autre. Aucun scan n'est déclenché.
Timestamp Global: Le last_global_update_at n'est pas modifié durant ce processus.

### 7.2. Processus 2 : Mise à Jour Quotidienne (Scan Global Manuel)
- **Objectif**: Mettre à jour les données de trade pour **tous** les utilisateurs enregistrés et actualiser la date de référence globale.
- **Déclencheur**: Lancement manuel du script dédié `runManualWorker.js`.
- **Mécanisme Détaillé**:
    1.  Un opérateur lance le script `node backend/scripts/runManualWorker.js`.
    2.  Le `worker.js` est lancé en mode **global** : il scanne les transactions **récentes** de tous les utilisateurs présents dans la table `users`.
    3.  Une fois le scan de **tous** les utilisateurs terminé avec succès, le timestamp `last_global_update_at` est mis à jour dans la table `system_status`.
    4.  Enfin, la vue matérialisée `degen_rank` est rafraîchie pour refléter les nouvelles données de tout le classement.

### 7.3. Processus 3 : Rafraîchissement Manuel d'un Utilisateur (Scan Ciblé Incrémental)
- **Objectif**: Permettre à un utilisateur de mettre à jour ses propres statistiques à la demande, sans attendre le scan global.
- **Déclencheur**: L'utilisateur appuie sur le bouton "Rafraîchir" sur son écran de détails (`DetailsScreen.tsx`).
- **Mécanisme Détaillé**:
    1.  Le frontend appelle l'endpoint `POST /user/:userAddress/refresh`.
    2.  Le backend lance le `worker.js` en arrière-plan, en mode **ciblé** et **incrémental** pour cet utilisateur uniquement.
    3.  Le `last_scanned_at` de l'utilisateur est mis à jour.
    4.  La vue matérialisée `degen_rank` est rafraîchie.
    5.  Le frontend invalide ses caches de données après un court délai pour récupérer et afficher les nouvelles statistiques.
- **Timestamp Global**: Le `last_global_update_at` n'est pas modifié durant ce processus.
- **Sécurité**: Limite de 24h entre chaque rafraîchissement manuel par utilisateur, vérifiée via `last_manual_refresh_at`.

### 7.4. Sécurité du Rafraîchissement Manuel
- **Limitation Temporelle**: Chaque utilisateur ne peut déclencher qu'un seul rafraîchissement manuel toutes les 24 heures.
- **Vérification Backend**: L'API `/user/:userAddress/refresh` vérifie `last_manual_refresh_at` avant d'autoriser le rafraîchissement.
- **Code d'Erreur**: Retourne HTTP 429 (Too Many Requests) si la limite est dépassée.
- **Sécurité Frontend**: Le bouton de rafraîchissement n'est visible que pour le propre wallet de l'utilisateur connecté.
- **Messages d'Erreur**: Interface utilisateur claire avec explications sur les limitations et alternatives.

## 8. Composants Frontend Avancés

### 8.1. ScoreEvolutionChart
- **Fichier**: `frontend/src/components/leaderboard/ScoreEvolutionChart.tsx`
- **Fonctionnalité**: Affiche l'évolution du score de l'utilisateur sur les 30 derniers jours.
- **Données**: Utilise l'endpoint `/user/:userAddress/score-history` pour récupérer l'historique depuis `rank_history`.
- **Design**: Graphique en barres horizontal scrollable avec barres en couleur emerald-500 (#10b981).
- **Performance**: Aucune dépendance externe pour éviter les problèmes de compatibilité Expo.
- **Positionnement**: Intégré dans `DetailsScreen.tsx` directement sous les cartes PNL et Degen Score.

### 8.2. Sécurité de l'Interface Utilisateur
- **Bouton de Rafraîchissement**: Visible uniquement quand `isMyOwnProfile === true`.
- **Vérification Double**: Contrôle côté interface ET côté logique métier.
- **Gestion d'Erreurs**: Messages professionnels et informatifs pour guider l'utilisateur.
- **TypeScript**: Typage strict pour éviter les erreurs de sécurité.

## 9. Démarrage du Projet

Pour lancer l'application, suivez ces étapes dans deux terminaux séparés.

### Démarrer le Backend
```bash
npm run start --prefix backend
```

### Démarrer le Frontend
```bash
npm start --prefix frontend
``` 

## 10. Outils de Développement

### Script `add-user`
Ajoute un nouvel utilisateur et déclenche son scan initial. Simule une première connexion.
```bash
npm run add-user --prefix backend -- <adresse1> <adresse2> ...
``` 

### Script `runManualWorker`
Lance le scan global incrémental de tous les utilisateurs. C'est la méthode de mise à jour principale actuelle.
```bash
node backend/scripts/runManualWorker.js
``` 

### Script `deleteUser.js`
Supprime complètement un utilisateur de toutes les tables (RGPD compliance).
```bash
node backend/scripts/deleteUser.js <user_address>
```

### Script `addManualRefreshColumn.js`
Ajoute la colonne `last_manual_refresh_at` à la table `users` pour la sécurité du rafraîchissement manuel.
```bash
node backend/scripts/addManualRefreshColumn.js
```

### Script `testToken.js`
Permet d'analyser en détail toutes les transactions d'un wallet pour un token donné (mint), afin de calculer précisément le PNL (Profit and Loss) en SOL et d'afficher toutes les informations utiles sur les achats/ventes de ce token.

- **Utilisation typique :**
  ```bash
  node backend/scripts/testToken.js <adresse_wallet> <mint_token>
  ```
  Exemple :
  ```bash
  node backend/scripts/testToken.js HRFekhACsTUj9tRNHR8VfgBSYZp4BodaQwrqfpSePkMT 9GtvcnDUvGsuibktxiMjLQ2yyBq5akUahuBs8yANbonk
  ```
- Ce script ne modifie jamais la base : il est purement analytique et indépendant du worker ou des données stockées.
- Idéal pour auditer un cas précis, valider la logique du worker ou détecter des incohérences.
- Il est pertinent de comparer le PNL calculé par ce script avec celui affiché sur dexscreener ou dans la base, pour valider la cohérence des données (ex : top trader sur Valentine).

## 11. Évolutions Récentes du Projet

### 11.1. Sécurité du Rafraîchissement Manuel (2024)
- **Problème résolu**: Limitation de la surcharge du backend par les rafraîchissements manuels.
- **Solution**: Implémentation d'une limite de 24h par utilisateur avec tracking dans la base de données.
- **Impact**: Protection des ressources serveur tout en maintenant une bonne expérience utilisateur.

### 11.2. Graphique d'Évolution des Scores (2024)
- **Fonctionnalité**: Visualisation de l'évolution du classement sur 30 jours.
- **Technique**: Composant React Native personnalisé sans dépendances externes.
- **UX**: Intégration harmonieuse dans l'écran de détails utilisateur.

### 11.3. Amélioration de la Sécurité Frontend (2024)
- **Problème**: Possibilité de rafraîchir les stats d'autres utilisateurs.
- **Solution**: Restriction du bouton de rafraîchissement au propre wallet de l'utilisateur.
- **Sécurité**: Vérifications côté client et serveur pour une protection complète. 

## 12. Nouveautés 2024 : Leaderboard 24h & Last Buys

### 12.1. Leaderboard 24h
- **Vue matérialisée dédiée** : `degen_rank_24h` calcule le classement sur les 24 dernières heures (rolling window, filtre sur `last_sell_at`).
- **Refresh** : Cette vue est rafraîchie à chaque scan global ou ciblé (worker, ajout user, refresh manuel).
- **Intégration front** : Un toggle permet de passer du leaderboard annuel au leaderboard 24h. Le titre s’adapte dynamiquement.
- **Évolution de rang** : Les flèches d’évolution de rang ne sont affichées que sur le leaderboard annuel (pas sur 24h).

### 12.2. Last Buys from the Top 10
- **Table dédiée** : `recent_top10_buys` stocke les derniers "buy in" des top 10 utilisateurs (24h et annuel).
- **Endpoint** : `/recent-top10-buys?period=24h|yearly` retourne les derniers achats, triés par date ou montant SOL.
- **Refresh** : Un endpoint POST `/refresh-recent-top10-buys` permet de rafraîchir la table (limite toutes les 15min, visible dans l’UI avec timestamp du dernier refresh).
- **Sécurité** : Le refresh est limité côté backend (15min) et le bouton est désactivé côté front si la limite n’est pas atteinte.
- **UX front** :
    - Un écran dédié affiche les derniers achats des top 10 (toggle 24h/2025 indépendant du leaderboard principal).
    - Tri possible par date (plus récent) ou par montant SOL (plus gros buy).
    - Badge plateforme coloré (pump.fun, letsbonk) avec lien direct.
    - Affichage des dates en "xhxx ago" pour éviter toute confusion de fuseau horaire.
    - Snackbar de confirmation lors du refresh (visible en bas de l’écran).

### 12.3. Logique de Refresh et Sécurité
- **Leaderboard 24h** : Rafraîchi automatiquement à chaque scan global ou ciblé (aucune action manuelle nécessaire).
- **Last Buys** : Rafraîchissement manuel possible toutes les 15min via bouton dédié, avec feedback visuel et gestion d’erreur.

### 12.4. Roadmap et évolutions
- Ces deux fonctionnalités sont désormais stables et documentées. Toute évolution future (nouvelle plateforme, analytics, social, etc.) devra respecter cette logique de modularité et de sécurité du refresh. 