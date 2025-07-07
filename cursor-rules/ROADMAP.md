# Roadmap et Priorités du Projet

Voici la liste des prochaines étapes de développement, classées par ordre de priorité.

### 1. Finaliser l'Authentification et Tester sur Mobile - ✅ DONE
- **Objectif**: Remplacer l'adresse de test (mock) par le véritable flux d'authentification en utilisant `useAuthorization`.
- **Action Clé**: S'assurer que l'application est pleinement fonctionnelle pour un utilisateur se connectant avec un portefeuille mobile (ex: Phantom).
- **Étape Suivante**: Relancer un build de l'application Expo (`eas build`) pour permettre les tests sur un vrai appareil mobile.

### 2. Mettre en Place la `MATERIALIZED VIEW` - ✅ DONE
- **Objectif**: Garantir des temps de chargement quasi instantanés pour le leaderboard, même avec une forte augmentation du nombre d'utilisateurs.
- **Action Clé**: Remplacer la `VIEW` SQL actuelle (`degen_rank`) par une `MATERIALIZED VIEW`.
- **Stratégie**: Mettre en place un mécanisme de rafraîchissement périodique (par exemple, via un cron job ou une fonction Supabase) toutes les 5 à 10 minutes.

### 3. Améliorer le Worker - ✅ DONE
- **Objectif**: Automatiser et étendre la collecte des données de trades.
- **Action Clé**: Modifier `worker.js` pour qu'il s'exécute en continu (avec `setInterval` ou une autre méthode de "cron job").
- **Stratégie**: Le worker devra scanner les trades pour une liste d'utilisateurs récupérée depuis la table `users`, et non plus pour une seule adresse de test.

### 4. Mettre en Place les Niveaux d'Utilisateurs (Basic/Pro)
- **Objectif**: Créer un modèle de monétisation pour l'application.
- **Action Clé**: Implémenter un système à deux niveaux :
    - **Basic**: Accès limité à l'onglet "Home".
    - **Pro**: Accès à toutes les fonctionnalités, pour un coût de 0.1 SOL.
- **Technologie**: Cela nécessitera la création d'une instruction sur la blockchain via Anchor pour gérer le paiement et la mise à jour du statut de l'utilisateur.

### 5. Rendre le Leaderboard Interactif
- **Objectif**: Augmenter l'engagement et l'exploration au sein de l'application.
- **Action Clé**: Rendre chaque ligne du leaderboard sur la page d'accueil cliquable.
- **Navigation**: Un clic sur un utilisateur doit rediriger vers sa page de détails personnelle.

### 6. Ajouter des Filtres sur le Leaderboard
- **Objectif**: Offrir plus de contrôle et de granularité dans l'analyse des données.
- **Action Clé**: Ajouter des options de tri au leaderboard.
- **Filtres possibles**: "Degen Score", "PNL total (SOL)", "Taux de victoire (%)", "Meilleur trade (PNL)". 