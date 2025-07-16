# Roadmap et Priorités du Projet

Voici la liste des prochaines étapes de développement, classées par ordre de priorité.

### 8. Préparation à la Publication sur le dApp Store
- **Objectif**: Assurer la conformité de l'application avec les règles de la dApp Store de Solana Mobile pour une publication réussie.
- **Actions Clés**:
    - **[✅ DONE] Rédiger une Politique de Confidentialité**: Créer une politique claire expliquant l'utilisation des données publiques de la blockchain pour générer les statistiques.
    - **[✅ DONE] Ajouter des Avertissements (Disclaimers)**: Intégrer des messages visibles dans l'UI pour clarifier que l'application est un outil d'analyse et non de conseil financier.
    - **Implémenter la Suppression de Compte**: Fournir une option pour que l'utilisateur puisse supprimer les données associées à son compte dans notre application (statistiques calculées, etc.). Même si les données brutes restent publiques sur la blockchain, cette politique concerne les données que nous stockons et traitons.
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