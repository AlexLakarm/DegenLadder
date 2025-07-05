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
- **`server.js`**: Expose une API REST simple pour le frontend. La route principale est `/leaderboard/:platform` qui sert les données pré-calculées depuis la base de données.
- **`worker.js`**: C'est le cœur du backend. Il agit comme un service ETL (Extract, Transform, Load) :
    - **Extract**: Il utilise l'API de **Helius** pour récupérer l'historique des transactions d'adresses Solana.
    - **Transform**: Il analyse ces transactions, les agrège par jeton (mint) et calcule le PNL (Profit & Loss) pour chaque cycle de trade complet.
    - **Load**: Il insère ou met à jour (upsert) les résultats de cette analyse dans la base de données Supabase.

## 4. Frontend en Détail

- **Technologie**: React Native avec Expo, écrit en TypeScript.
- **Structure**: Le code source se trouve dans `frontend/src/`. Il utilise une navigation par écrans (`screens/`) et des composants réutilisables (`components/`).
- **Fonctionnalité**: Le frontend appelle l'API du backend pour récupérer les données du leaderboard et les affiche à l'utilisateur.

## 5. Base de Données (Supabase)

La base de données contient 3 tables principales.

### Table `users`
Stocke les informations de base sur les utilisateurs.
**Logique future**: Cette table sera peuplée à chaque fois qu'un nouvel utilisateur se connecte à l'application.

```sql
CREATE TABLE users (
  id bigint,
  address text,
  username text,
  created_at timestamp
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

### Vue `degen_rank`
Pour agréger les scores, une vue SQL (`VIEW`) est utilisée. Elle calcule le score total, le PNL et le nombre de trades pour chaque utilisateur en combinant les tables `trades_pump` et `trades_bonk`.

**Note sur la scalabilité**: Pour le développement, une `VIEW` standard est suffisante. En production, avec un grand nombre d'utilisateurs, il faudra la transformer en `MATERIALIZED VIEW` rafraîchie périodiquement (ex: toutes les 10 minutes) pour garantir des temps de réponse rapides.

### Algorithme du "Degen Score" V1
Le score est calculé pour chaque trade complet (achat/vente) et stocké dans la colonne `degen_score`.
- **Trade Gagnant**: +10 points
- **Trade Perdant**: -10 points
- **Bonus PnL** (uniquement si PnL > 0): `50 * log(1 + pnl_en_sol)`

## 6. Démarrage du Projet

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