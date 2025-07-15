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
Stocke les adresses des utilisateurs. C'est la **source de vérité** pour le worker.
**Logique**: Cette table est peuplée via l'endpoint `/user/connect` à chaque fois qu'un nouvel utilisateur se connecte.

```sql
CREATE TABLE users (
  id bigint,
  address text,
  username text,
  created_at timestamp,
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
Cette table centralise les timestamps des processus automatisés clés pour un monitoring simplifié. Elle ne contient qu'une seule ligne.

```sql
CREATE TABLE system_status (
  id bool PRIMARY KEY, -- Toujours 'true'
  trades_updated_at timestamp with time zone,
  leaderboard_updated_at timestamp with time zone
);
```
- `trades_updated_at`: Mis à jour à la fin de chaque exécution réussie du scan global des trades.
- `leaderboard_updated_at`: Mis à jour à la fin de chaque rafraîchissement réussi de la vue `degen_rank` par le cron Supabase.

### Vue Matérialisée `degen_rank`
Pour garantir des temps de chargement rapides, le classement principal est une **vue matérialisée**. Elle agrège les scores, le PNL et le nombre de trades pour chaque utilisateur.
**Automatisation**: Elle est rafraîchie automatiquement toutes les 10 minutes. (Voir la section "Automatisation et Monitoring").

## 6. Algorithme du "Degen Score" V1
Le score est calculé pour chaque trade complet (achat/vente) et stocké dans la colonne `degen_score`.
- **Trade Gagnant**: +10 points
- **Trade Perdant**: -10 points
- **Bonus PnL** (uniquement si PnL > 0): `50 * log(1 + pnl_en_sol)`

## 7. Automatisation et Stratégies de Rafraîchissement

Le projet utilise trois mécanismes distincts pour maintenir les données à jour.

### 7.1. Scan Initial des Nouveaux Utilisateurs (En temps réel)
- **Objectif**: Fournir des données immédiates à un nouvel utilisateur.
- **Déclencheur**: Un utilisateur se connecte à l'application pour la première fois.
- **Mécanisme**:
    1. Le frontend appelle l'endpoint `POST /user/connect`.
    2. Le backend lance le `worker.js` en mode ciblé (scan complet) pour cet utilisateur.

### 7.2. Mise à Jour Globale des Trades (Solution Actuelle : Manuelle)
- **Objectif**: Mettre à jour les données de trades pour **tous** les utilisateurs enregistrés de manière fiable.
- **Problématique**: Le cron Vercel a un timeout de 60 secondes, ce qui est trop court pour le worker qui doit respecter les limites de l'API Helius.
- **Solution de Contournement Actuelle**: Lancer le worker manuellement.
- **Mécanisme**:
    1. Un opérateur lance le script `node backend/scripts/runManualWorker.js` depuis sa machine.
    2. Le script appelle le `worker.js` en mode global (scan incrémental).
    3. Le worker s'exécute sans contrainte de temps et met à jour le timestamp `trades_updated_at` dans la table `system_status` à la fin.

### 7.3. Rafraîchissement du Leaderboard (Agrégation rapide)
- **Objectif**: Mettre à jour la vue matérialisée `degen_rank`.
- **Déclencheur**: Un Cron Job Supabase (`pg_cron`).
- **Fréquence**: Toutes les 10 minutes.
- **Mécanisme**:
    1. `pg_cron` exécute la fonction SQL `refresh_degen_rank()`.
    2. La fonction met à jour le timestamp `leaderboard_updated_at` dans `system_status`.

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