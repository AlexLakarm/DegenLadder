# Roadmap et Priorités du Projet

Voici la liste des prochaines étapes de développement, classées par ordre de priorité.


### 1. Display des principaux buy-in des top 10 (points)

Parfait, voici la synthèse de la solution à mettre en place :

---

## 1. **Table à créer**
- **Nom** : `recent_top10_buys`
- **But** : stocker les “buy in” des top 10 (24h et 2025) sur les 12 dernières heures, pour affichage rapide côté frontend.
- **Champs proposés** :
  - `id` (clé primaire, auto-incrément)
  - `user_address`
  - `platform` (`pump` ou `bonk`)
  - `token_mint`
  - `buy_signature`
  - `buy_amount_sol`
  - `buy_at` (timestamp)
  - `leaderboard_period` (`24h` ou `yearly`)
  - (optionnel) `token_name`, etc.

---

## 2. **Script de rafraîchissement**
- **Fonction** :  
  - À lancer toutes les 15 minutes (ou à la demande).
  - Va chercher :
    1. Le top 10 du leaderboard 24h (`degen_rank_24h`)
    2. Le top 10 du leaderboard 2025 (`degen_rank`)
    3. Pour chaque user, fetch tous les “buy in” (transactions d’achat) dans les 12 dernières heures sur pump et bonk.
    4. Insère ces “buy in” dans la table `recent_top10_buys` (avec la période correspondante).
    5. Purge les anciens enregistrements (>12h).

---

## 3. **Endpoint backend**
- Expose `/recent-top10-buys?period=24h|yearly` pour retourner la liste à afficher côté frontend.

---

## 4. **Frontend**
- Consomme l’endpoint, toggle local pour la période, titre dynamique, tri par montant SOL décroissant.

---

## 5. **Étapes d’implémentation**
1. **Créer la table SQL** `recent_top10_buys`
2. **Créer le script Node.js** de rafraîchissement (fetch, insert, purge)
3. **Créer l’endpoint API**
4. **Brancher le frontend**

---

### SQL de création de la table recent_top10_buys

```sql
CREATE TABLE public.recent_top10_buys (
  id BIGSERIAL PRIMARY KEY,
  user_address TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'pump' ou 'bonk'
  token_mint TEXT NOT NULL,
  buy_signature TEXT NOT NULL,
  buy_amount_sol REAL NOT NULL,
  buy_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  leaderboard_period TEXT NOT NULL, -- '24h' ou 'yearly'
  token_name TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- Index pour accélérer les requêtes sur la période et la date
CREATE INDEX idx_recent_top10_buys_period_date ON public.recent_top10_buys (leaderboard_period, buy_at DESC);
```

---

### SQL pour ajouter la colonne de suivi du refresh dans system_status

```sql
ALTER TABLE public.system_status
ADD COLUMN IF NOT EXISTS recent_top10_buys_refreshed_at TIMESTAMP WITH TIME ZONE;
```

---

### SQL pour ajouter la contrainte d'unicité sur recent_top10_buys

```sql
ALTER TABLE public.recent_top10_buys
ADD CONSTRAINT unique_buy_per_user_signature_period UNIQUE (user_address, buy_signature, leaderboard_period);
```

---

### Note sur l'amélioration future
- Pour avoir le montant SOL exact de chaque "buy in", il faudra parser les transactions d'achat individuellement (via l'API RPC Solana ou un indexer) et enrichir la table avec ce montant lors de l'insertion.
- Actuellement, le script ne peut pas fournir ce montant car il n'est pas stocké dans les tables trades_*. Il faudra donc une étape d'enrichissement supplémentaire (à prévoir dans le worker ou dans le script de fetch).

### 2. Préparation à la Publication sur le dApp Store
- **Objectif**: Assurer la conformité de l'application avec les règles de la dApp Store de Solana Mobile pour une publication réussie.
- **Actions Clés**:
    - [✅ DONE] Rédiger une Politique de Confidentialité
    - [✅ DONE] Ajouter des Avertissements (Disclaimers)
    - [✅ DONE] Implémenter la Suppression de Compte
    - Préparer les Éléments du Store

### 3. Niveaux d'Utilisateurs (Basic/Pro)
- **Objectif**: Créer un modèle de monétisation pour l'application.
- **Action Clé**: Implémenter un système à deux niveaux :
    - **Basic**: Accès limité à l'onglet "Home".
    - **Pro**: Accès à toutes les fonctionnalités, pour un coût de 0.1 SOL.
    - **Technologie**: Instruction Anchor pour paiement et mise à jour du statut utilisateur.