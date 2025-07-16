# Contexte du Projet Degenrank

Ce document sert de source de vérité pour l'IA afin de maintenir une compréhension complète et à jour du projet Degenrank.

## 1. Objectif Général

Degenrank est une application web et mobile qui affiche un classement (leaderboard) en temps réel des traders sur différentes plateformes de l'écosystème Solana (ex: pump.fun, Bonk).

## 2. Architecture Globale

Le projet est un monorepo structuré comme suit :
- `backend/`: Un serveur Node.js qui gère la collecte de données et l'API.
- `frontend/`: Une application React Native (avec Expo) pour l'interface utilisateur.

## 3. Backend en Détail

- **Technologie**: Node.js avec Express.js.
- **`backend/api/index.js`**: Expose une API REST. Les routes principales sont :
    - `/leaderboard/*`: Sert les données du classement depuis la base de données.
    - `/user/connect` (POST): Enregistre une nouvelle adresse utilisateur. **Déclencheur Clé**: Cet endpoint lance un scan **immédiat et complet** (`getFullHistory`) du worker pour ce nouvel utilisateur afin de peupler ses données initiales.
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

## 5. Base de Données (Supabase)

La base de données contient 3 tables principales, une table de statut et une vue matérialisée.

### Table `users`
Stocke les adresses des utilisateurs. C'est la **source de vérité** pour le worker. Chaque utilisateur a son propre timestamp de scan.
**Logique**: Cette table est peuplée via l'endpoint `/user/connect` à chaque fois qu'un nouvel utilisateur se connecte.

```sql
CREATE TABLE users (
  id bigint,
  address text,
  username text,
  created_at timestamp,
  last_scanned_at timestamp with time zone, -- Mis à jour après chaque scan de cet utilisateur
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

### 7.1. Processus 1 : Connexion d'un Nouvel Utilisateur (Scan Ciblé en Temps Réel)
- **Objectif**: Fournir des données initiales et une place dans le classement immédiatement après la connexion.
- **Déclencheur**: Un utilisateur se connecte pour la première fois, déclenchant un appel à l'endpoint `POST /user/connect`.
- **Mécanisme Détaillé**:
    1.  L'adresse de l'utilisateur est ajoutée (ou confirmée) dans la table `users`.
    2.  Le `worker.js` est lancé en mode **ciblé** : il scanne l'historique de transactions **complet** de cet utilisateur uniquement.
    3.  Une fois le scan terminé, le timestamp personnel `last_scanned_at` de l'utilisateur est mis à jour dans la table `users`.
    4.  Enfin, la vue matérialisée `degen_rank` est rafraîchie pour que le nouvel utilisateur y apparaisse.
- **Timestamp Global**: Le `last_global_update_at` de la table `system_status` **n'est pas** modifié durant ce processus.

### 7.2. Processus 2 : Mise à Jour Quotidienne (Scan Global Manuel)
- **Objectif**: Mettre à jour les données de trade pour **tous** les utilisateurs enregistrés et actualiser la date de référence globale.
- **Déclencheur**: Lancement manuel du script dédié `runManualWorker.js`.
- **Mécanisme Détaillé**:
    1.  Un opérateur lance le script `node backend/scripts/runManualWorker.js`.
    2.  Le `worker.js` est lancé en mode **global** : il scanne les transactions **récentes** de tous les utilisateurs présents dans la table `users`.
    3.  Une fois le scan de **tous** les utilisateurs terminé avec succès, le timestamp `last_global_update_at` est mis à jour dans la table `system_status`.
    4.  Enfin, la vue matérialisée `degen_rank` est rafraîchie pour refléter les nouvelles données de tout le classement.

## 8. Démarrage du Projet

Pour lancer l'application, suivez ces étapes dans deux terminaux séparés.

### Démarrer le Backend
```bash
npm run start --prefix backend
```

### Démarrer le Frontend
```bash
npm start --prefix frontend
``` 

## 9. Outils de Développement

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