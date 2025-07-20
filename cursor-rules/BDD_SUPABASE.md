# Documentation de la base de données Supabase (DegenLadder)

Ce document décrit la structure complète de la base de données utilisée par le projet DegenLadder.

---

## Tables et vues principales

### 1. degen_rank (vue matérialisée)
- **Description** : Vue matérialisée principale pour le classement global des utilisateurs.
- **Champs** :
  - `rank` : Rang de l'utilisateur dans le classement
  - `user_address` : Adresse du wallet utilisateur
  - `last_scanned_at` : Date du dernier scan de l'utilisateur
  - `total_degen_score` : Score total (toutes plateformes)
  - `total_pnl_sol` : PNL total en SOL (toutes plateformes)
  - `total_trades` : Nombre total de trades
  - `total_wins` : Nombre de trades gagnants
  - `total_losses` : Nombre de trades perdants
  - `win_rate` : Pourcentage de trades gagnants

### 2. system_status
- **Description** : Statut global du système (timestamp du dernier scan global)
- **Champs** :
  - `id` : Toujours TRUE (clé primaire, unique)
  - `last_global_update_at` : Timestamp du dernier scan global réussi

### 3. trades_bonk
- **Description** : Historique des trades analysés sur la plateforme Bonk.fun
- **Champs** :
  - `id` : Identifiant unique (clé primaire)
  - `user_address` : Adresse du wallet utilisateur
  - `token_mint` : Mint du token
  - `status` : 'WIN' ou 'LOSS'
  - `pnl_sol` : PNL en SOL
  - `sol_spent_lamports` : SOL dépensé (en lamports)
  - `sol_received_lamports` : SOL reçu (en lamports)
  - `first_buy_at` : Timestamp du premier achat
  - `last_sell_at` : Timestamp de la dernière vente
  - `first_buy_tx` : Signature de la première transaction d'achat
  - `last_sell_tx` : Signature de la dernière transaction de vente
  - `buy_transactions` : Liste des signatures d'achats (JSONB)
  - `sell_transactions` : Liste des signatures de ventes (JSONB)
  - `degen_score` : Score attribué à ce trade

### 4. trades_pump
- **Description** : Historique des trades analysés sur la plateforme Pump.fun
- **Champs** :
  - (identique à trades_bonk)

### 5. users
- **Description** : Table des utilisateurs suivis par le système
- **Champs** :
  - `id` : Identifiant unique (clé primaire)
  - `address` : Adresse du wallet utilisateur (unique)
  - `username` : Nom d'utilisateur (optionnel)
  - `created_at` : Date de création de l'utilisateur
  - `plan` : Type d'abonnement (par défaut 'basic')
  - `last_scanned_at` : Date du dernier scan individuel
  - `last_manual_refresh_at` : Date du dernier rafraîchissement manuel (limite 24h)

### 6. rank_history
- **Description** : Historique du rang utilisateur pour chaque date de snapshot (permet d'afficher l'évolution du classement jour après jour)
- **Champs** :
  - `user_address` : Adresse du wallet utilisateur
  - `rank` : Rang de l'utilisateur à la date du snapshot
  - `snapshot_date` : Date du snapshot (clé primaire avec user_address)

---

## Annexe : Code SQL de création des tables et de la vue

```sql
-- 1. Vue matérialisée degen_rank
create materialized view public.degen_rank as
with
  all_trades as (
    select
      trades_pump.user_address,
      trades_pump.status,
      trades_pump.pnl_sol,
      trades_pump.degen_score
    from
      trades_pump
    union all
    select
      trades_bonk.user_address,
      trades_bonk.status,
      trades_bonk.pnl_sol,
      trades_bonk.degen_score
    from
      trades_bonk
  ),
  aggregated_stats as (
    select
      all_trades.user_address,
      sum(all_trades.degen_score) as total_degen_score,
      sum(all_trades.pnl_sol) as total_pnl_sol,
      count(*) as total_trades,
      sum(
        case
          when all_trades.status = 'WIN'::text then 1
          else 0
        end
      ) as total_wins,
      sum(
        case
          when all_trades.status = 'LOSS'::text then 1
          else 0
        end
      ) as total_losses
    from
      all_trades
    group by
      all_trades.user_address
  )
select
  row_number() over (
    order by
      (COALESCE(s.total_degen_score, 0::bigint)) desc,
      (COALESCE(s.total_pnl_sol, 0::real)) desc
  ) as rank,
  u.address as user_address,
  u.last_scanned_at,
  COALESCE(s.total_degen_score, 0::bigint) as total_degen_score,
  COALESCE(s.total_pnl_sol, 0::real) as total_pnl_sol,
  COALESCE(s.total_trades, 0::bigint) as total_trades,
  COALESCE(s.total_wins, 0::bigint) as total_wins,
  COALESCE(s.total_losses, 0::bigint) as total_losses,
  case
    when COALESCE(s.total_trades, 0::bigint) > 0 then COALESCE(s.total_wins, 0::bigint)::numeric / COALESCE(s.total_trades, 0::bigint)::numeric * 100::numeric
    else 0::numeric
  end as win_rate
from
  users u
  left join aggregated_stats s on u.address = s.user_address
order by
  (
    row_number() over (
      order by
        (COALESCE(s.total_degen_score, 0::bigint)) desc,
        (COALESCE(s.total_pnl_sol, 0::real)) desc
    )
  );

-- 2. Table system_status
create table public.system_status (
  id boolean not null default true,
  last_global_update_at timestamp with time zone null,
  constraint system_status_pkey primary key (id),
  constraint single_row_check check ((id = true))
) TABLESPACE pg_default;

-- 3. Table trades_bonk
create table public.trades_bonk (
  id bigint generated by default as identity not null,
  user_address text not null,
  token_mint text not null,
  status text null,
  pnl_sol real null,
  sol_spent_lamports bigint null,
  sol_received_lamports bigint null,
  first_buy_at timestamp without time zone null,
  last_sell_at timestamp without time zone null,
  first_buy_tx text null,
  last_sell_tx text null,
  buy_transactions jsonb null,
  sell_transactions jsonb null,
  degen_score integer null,
  constraint trades_bonk_pkey primary key (id),
  constraint trades_bonk_user_address_token_mint_key unique (user_address, token_mint),
  constraint trades_bonk_status_check check ((status = any (array['WIN'::text, 'LOSS'::text])))
) TABLESPACE pg_default;

-- 4. Table trades_pump
create table public.trades_pump (
  id bigint generated by default as identity not null,
  user_address text not null,
  token_mint text not null,
  status text null,
  pnl_sol real null,
  sol_spent_lamports bigint null,
  sol_received_lamports bigint null,
  first_buy_at timestamp without time zone null,
  last_sell_at timestamp without time zone null,
  first_buy_tx text null,
  last_sell_tx text null,
  buy_transactions jsonb null,
  sell_transactions jsonb null,
  degen_score integer null,
  constraint trades_pump_pkey primary key (id),
  constraint trades_pump_user_address_token_mint_key unique (user_address, token_mint),
  constraint trades_pump_status_check check ((status = any (array['WIN'::text, 'LOSS'::text])))
) TABLESPACE pg_default;

-- 5. Table users
create table public.users (
  id bigint generated by default as identity not null,
  address text not null,
  username text null,
  created_at timestamp without time zone not null default now(),
  plan text not null default 'basic'::text,
  last_scanned_at timestamp with time zone null,
  last_manual_refresh_at timestamp with time zone null,
  constraint users_pkey primary key (id),
  constraint users_address_key unique (address)
) TABLESPACE pg_default;

-- 6. Table rank_history
CREATE TABLE rank_history (
  user_address TEXT NOT NULL,
  rank INTEGER NOT NULL,
  snapshot_date DATE NOT NULL,
  PRIMARY KEY (user_address, snapshot_date)
);
``` 