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

## 7. Automatisation et Monitoring

Cette section détaille les processus automatisés du projet et comment vérifier leur bon fonctionnement.

### 7.1. Rafraîchissement du Leaderboard
- **Mécanisme**: Une tâche planifiée (`pg_cron`) directement dans la base de données Supabase.
- **Fréquence**: Toutes les 10 minutes.
- **Comment vérifier**:
    - **Supabase UI**: Allez dans `Database` > `Cron`. La tâche `refresh-degen-rank` doit avoir un statut `succeeded`.
    - **SQL**: Exécutez `SELECT leaderboard_updated_at FROM public.system_status;` pour voir le timestamp du dernier rafraîchissement.
    - **Logs de la fonction**: Allez dans `Logs` > `Database Logs` et filtrez sur "Rafraîchissement". Vous devriez voir les messages de début et de fin de la fonction.

### 7.2. Mise à jour des Données de Trades (Worker)
- **Mécanisme**: Un Cron Job Vercel est configuré pour appeler l'endpoint `POST /api/cron/run-worker`. Il s'agit du **rafraîchissement global**.
- **Fréquence**: Quotidiennement (limite du plan gratuit Vercel) ou plus fréquemment avec un plan payant.
- **Configuration Vercel**: Le fichier `vercel.json` contenant la configuration du cron est placé dans le dossier `backend/`. Dans les réglages du projet Vercel, le "Root Directory" est donc défini sur `backend` pour que le fichier soit détecté.
- **Comment vérifier**:
    - **Tableau de bord du service Cron (Vercel)**: Vérifiez que les appels à l'API retournent un code `202 Accepted`.
    - **Logs du Backend**: Les logs de votre serveur Node.js afficheront `"Global worker scan completed successfully."` et `"trades_updated_at timestamp updated."`.
    - **SQL**: Exécutez `SELECT trades_updated_at FROM public.system_status;` pour voir le timestamp du dernier scan global.

### 7.3. Enregistrement et Scan Initial des Nouveaux Utilisateurs
- **Mécanisme**: Le frontend appelle l'endpoint `POST /user/connect` lors de la connexion. Le backend enregistre l'utilisateur et lance **immédiatement** une tâche de fond pour scanner l'historique de ce nouvel utilisateur.
- **Comment vérifier**:
    - **Logs du Backend**: Les logs du serveur afficheront `"User connected successfully. Initiating initial scan for address: [user_address]"`.
    - **Base de données**: Vérifiez directement la table `users` dans Supabase, puis les tables de trades quelques instants après pour voir apparaître les nouvelles données.

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