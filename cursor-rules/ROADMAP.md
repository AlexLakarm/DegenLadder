# Roadmap et Priorités du Projet

Voici la liste des prochaines étapes de développement, classées par ordre de priorité.

### 8. Préparation à la Publication sur le dApp Store
- **Objectif**: Assurer la conformité de l'application avec les règles de la dApp Store de Solana Mobile pour une publication réussie.
- **Actions Clés**:
    - **[✅ DONE] Rédiger une Politique de Confidentialité**: Créer une politique claire expliquant l'utilisation des données publiques de la blockchain pour générer les statistiques.
    - **[✅ DONE] Ajouter des Avertissements (Disclaimers)**: Intégrer des messages visibles dans l'UI pour clarifier que l'application est un outil d'analyse et non de conseil financier.
    - **[✅ DONE] Implémenter la Suppression de Compte**: Fournir une option pour que l'utilisateur puisse supprimer les données associées à son compte dans notre application (statistiques calculées, etc.). Même si les données brutes restent publiques sur la blockchain, cette politique concerne les données que nous stockons et traitons.
    - **Préparer les Éléments du Store**: Rédiger les descriptions, préparer les captures d'écran et l'icône pour la page de l'application.

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
    1. **Créer une table d'historique des rangs** :
        ```sql
        CREATE TABLE rank_history (
          user_address TEXT,
          rank INTEGER,
          snapshot_date DATE,
          PRIMARY KEY (user_address, snapshot_date)
        );
        ```
    2. **À chaque scan global (runManualWorker.js)** :
        - Insérer le rang courant de chaque utilisateur dans `rank_history` avec la date du jour.
        - Exemple :
        ```sql
        INSERT INTO rank_history (user_address, rank, snapshot_date)
        SELECT user_address, rank, CURRENT_DATE FROM degen_rank;
        ```
    3. **Calculer l'évolution** :
        - Comparer le rang courant (dans `degen_rank`) avec le rang de la veille (dans `rank_history`).
        - Afficher la variation (+/-) et la flèche correspondante dans le frontend.
        - Exemple de requête :
        ```sql
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
    4. **Frontend** :
        - Afficher la flèche (↑, ↓, =) et la variation à côté du rang utilisateur.

- **Bénéfice** :
    - Permet à l'utilisateur de visualiser sa progression ou régression dans le classement, rendant l'expérience plus dynamique et engageante.