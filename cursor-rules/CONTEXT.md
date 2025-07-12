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
- **`server.js`**: Expose une API REST. Les routes principales sont :
    - `/leaderboard/*`: Sert les données du classement depuis la base de données.
    - `/user/connect` (POST): Enregistre une nouvelle adresse utilisateur dans la table `users`. **Déclencheur Clé**: Cet endpoint lance également un scan **immédiat et ciblé** du worker pour ce nouvel utilisateur afin de peupler ses données initiales sans délai.
    - `/api/cron/run-worker` (POST): Endpoint sécurisé par un token secret (`CRON_SECRET`). Il lance la logique du worker pour une **mise à jour globale** de tous les utilisateurs existants. Cet endpoint est destiné à être appelé par un service de cron externe.
- **`worker.js`**: N'est plus un script autonome. C'est une **librairie de fonctions** qui contient la logique ETL et qui peut être invoquée de deux manières :
    - **Mode Ciblé**: Pour un seul `user_address` (déclenché par `/user/connect`).
    - **Mode Global**: Pour tous les utilisateurs de la table `users` (déclenché par `/api/cron/run-worker`).
    - **Logique**:
        - **Extract**: Récupère la liste des utilisateurs (un seul ou tous) depuis Supabase, puis utilise l'API de **Helius** pour récupérer leur historique de transactions.
        - **Transform**: Analyse ces transactions, les agrège par jeton (mint) et calcule le PNL (Profit & Loss).
        - **Load**: Insère ou met à jour les résultats dans les tables `trades_pump` et `trades_bonk`.

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
- `trades_updated_at`: Mis à jour à la fin de chaque exécution réussie du cron job Vercel (scan global des trades).
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

Le projet utilise trois mécanismes distincts pour maintenir les données à jour, chacun avec une fréquence et un déclencheur spécifiques. Il est crucial de différencier le rafraîchissement des **données brutes de trades** (qui viennent de la blockchain via Helius) du rafraîchissement du **leaderboard** (qui est une vue agrégée en base de données).

### 7.1. Scan Initial des Nouveaux Utilisateurs (En temps réel)
- **Objectif**: Fournir des données immédiates à un nouvel utilisateur pour une bonne expérience d'onboarding.
- **Déclencheur**: Un utilisateur se connecte à l'application pour la première fois.
- **Mécanisme**:
    1. Le frontend appelle l'endpoint `POST /user/connect`.
    2. Le backend enregistre l'adresse dans la table `users`.
    3. Le backend lance **immédiatement** le `worker.js` en arrière-plan et en mode ciblé pour cet utilisateur uniquement.
- **Comment vérifier**:
    - **Logs du Backend**: Le log `"Initiating initial scan for address: [user_address]"` apparaît.
    - **Base de données**: Les données de trade pour cet utilisateur apparaissent dans les tables `trades_*` après quelques instants.

### 7.2. Mise à Jour Globale des Trades (Tâche de fond planifiée)
- **Objectif**: Mettre à jour les données de trades pour **tous** les utilisateurs enregistrés.
- **Déclencheur**: Un Cron Job Vercel.
- **Fréquence**: Quotidiennement (modifiable dans `backend/vercel.json`).
- **Mécanisme**:
    1. Vercel Cron appelle l'endpoint `POST /api/cron/run-worker`.
    2. Le backend lance le `worker.js` en mode global, qui parcourt tous les utilisateurs de la table `users`.
    3. À la fin du processus, le timestamp `trades_updated_at` est mis à jour dans la table `system_status`.
- **Comment vérifier**:
    - **Tableau de bord Vercel**: Le cron job s'exécute avec succès (code 202).
    - **Logs du Backend**: Le log `"Global worker scan completed successfully"` apparaît.
    - **SQL**: La commande `SELECT trades_updated_at FROM public.system_status;` montre une date récente.

### 7.3. Rafraîchissement du Leaderboard (Agrégation rapide)
- **Objectif**: Mettre à jour la vue matérialisée `degen_rank` qui agrège les données des tables de trades pour un affichage rapide du classement.
- **Déclencheur**: Un Cron Job Supabase (`pg_cron`).
- **Fréquence**: Toutes les 10 minutes (modifiable dans l'interface Supabase).
- **Mécanisme**:
    1. `pg_cron` exécute la fonction SQL `refresh_degen_rank()`.
    2. Cette fonction exécute `REFRESH MATERIALIZED VIEW CONCURRENTLY degen_rank;`.
    3. À la fin, elle met à jour le timestamp `leaderboard_updated_at` dans la table `system_status`.
- **Comment vérifier**:
    - **Supabase UI**: Dans `Database` > `Cron`, la tâche `refresh-degen-rank` a le statut `succeeded`.
    - **SQL**: La commande `SELECT leaderboard_updated_at FROM public.system_status;` montre une date récente.

## 8. Démarrage du Projet

Pour lancer l'application, suivez ces étapes dans deux terminaux séparés depuis la racine du projet.

### Démarrer le Backend

1.  Ouvrez un terminal.
2.  Lancez le serveur d'API :
    ```bash
    npm run start:api --prefix backend
    ```
3.  *Optionnel*: Pour lancer le worker de collecte de données (généralement pour le développement ou des tâches ponctuelles) :
    ```bash
    npm run start:worker --prefix backend
    ```

### Démarrer le Frontend

1.  Ouvrez un second terminal.
2.  Lancez l'application web :
    ```bash
    npm start --prefix frontend -- --web
    ``` 

## 9. Outils de Développement

### Script `add-user`
Un script utilitaire a été créé pour ajouter manuellement des adresses Solana à la base de données pour des besoins de test.
- **Mécanisme**: Le script appelle l'endpoint `/user/connect` de l'API, ce qui garantit que l'adresse est non seulement enregistrée, mais que le scan initial du worker est également déclenché, simulant une connexion utilisateur complète.
- **Usage**:
    1. Assurez-vous que le serveur backend est en cours d'exécution (`npm run start:api --prefix backend`).
    2. Lancez le script depuis la racine du projet en passant une ou plusieurs adresses en argument :
    ```bash
    npm run add-user --prefix backend -- <adresse1> <adresse2> ...
    ``` 