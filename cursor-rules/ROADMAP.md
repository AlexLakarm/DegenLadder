# Roadmap et Priorités du Projet

Voici la liste des prochaines étapes de développement, classées par ordre de priorité.

### 8. Préparation à la Publication sur le dApp Store
- **Objectif**: Assurer la conformité de l'application avec les règles de la dApp Store de Solana Mobile pour une publication réussie.
- **Actions Clés**:
    - **[✅ DONE] Rédiger une Politique de Confidentialité**
    - **[✅ DONE] Ajouter des Avertissements (Disclaimers)**
    - **[✅ DONE] Implémenter la Suppression de Compte**
    - **Préparer les Éléments du Store**

### 9. Mettre en Place les Niveaux d'Utilisateurs (Basic/Pro)
- **Objectif**: Créer un modèle de monétisation pour l'application.
- **Action Clé**: Implémenter un système à deux niveaux :
    - **Basic**: Accès limité à l'onglet "Home".
    - **Pro**: Accès à toutes les fonctionnalités, pour un coût de 0.1 SOL.
- **Technologie**: Cela nécessitera la création d'une instruction sur la blockchain via Anchor pour gérer le paiement et la mise à jour du statut de l'utilisateur. 
Cela a déjà été fait sur la bdd :
ALTER TABLE public.users
ADD COLUMN plan TEXT DEFAULT 'basic' NOT NULL;

---

### 10. Historique et évolution du rang utilisateur (Leaderboard Dynamics)
- **Objectif**: Afficher l'évolution du rang d'un utilisateur d'un jour sur l'autre (flèche, +1/-2, etc.)
- **Étapes techniques** :
    1. **[✅ DONE] Créer une table d'historique des rangs** (`rank_history`)
    2. **[✅ DONE] Fonction purge_rank_history** (automatique après chaque scan global)
    3. **[✅ DONE] Insertion automatique du snapshot de rang après chaque scan global**
    4. **[✅ DONE] Peuplement initial de rank_history avec les données actuelles**
    5. **[✅ DONE] Affichage frontend de l'évolution du rang** (flèche, variation, etc.)
    5. (Rappel technique et exemples SQL ci-dessous)

```sql
-- Table rank_history
CREATE TABLE rank_history (
  user_address TEXT,
  rank INTEGER,
  snapshot_date DATE,
  PRIMARY KEY (user_address, snapshot_date)
);

-- Purge automatique (fonction SQL)
CREATE OR REPLACE FUNCTION purge_rank_history() ...

-- Insertion du snapshot (à automatiser)
INSERT INTO rank_history (user_address, rank, snapshot_date)
SELECT user_address, rank, CURRENT_DATE FROM degen_rank;

-- Calcul de l'évolution
SELECT
  dr.rank AS current_rank,
  rh.rank AS previous_rank,
  (rh.rank - dr.rank) AS evolution
FROM degen_rank dr
LEFT JOIN rank_history rh
  ON dr.user_address = rh.user_address
 AND rh.snapshot_date = CURRENT_DATE - INTERVAL '1 day'
WHERE dr.user_address = '<adresse>';
```

- **Bénéfice** :
    - Permet à l'utilisateur de visualiser sa progression ou régression dans le classement, rendant l'expérience plus dynamique et engageante.