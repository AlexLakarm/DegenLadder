import React from 'react';
import { ScrollView, View, Text, StyleSheet, useColorScheme } from 'react-native';
import { theme } from '../theme';

export function PrivacyPolicyScreen() {
  const colorScheme = useColorScheme();
  const styles = getStyles(colorScheme);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Politique de Confidentialité</Text>
        <Text style={styles.lastUpdated}>Dernière mise à jour : 28 Juillet 2024</Text>

        <Text style={styles.heading}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          Bienvenue sur DegenRank. Cette politique de confidentialité a pour but de vous informer sur la manière dont nous traitons vos informations lorsque vous utilisez notre application. En utilisant DegenRank, vous acceptez les pratiques décrites dans ce document.
        </Text>

        <Text style={styles.heading}>2. Les Données que Nous Utilisons</Text>
        <Text style={styles.paragraph}>
          DegenRank fonctionne en utilisant exclusivement des données publiques et accessibles sur la blockchain Solana. Lorsque vous connectez votre portefeuille à notre application, la seule information que nous enregistrons est votre **adresse de portefeuille publique**.
        </Text>
        <Text style={styles.paragraph}>
          Nous n'avons accès, ni ne stockons, vos clés privées, vos phrases de récupération, ou toute autre information personnelle identifiable (telle que votre nom ou votre email).
        </Text>

        <Text style={styles.heading}>3. Comment Nous Utilisons les Données</Text>
        <Text style={styles.paragraph}>
          Votre adresse publique est utilisée pour interroger la blockchain Solana afin de récupérer votre historique de transactions. Ces informations sont ensuite traitées par notre service pour :
        </Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• Calculer et afficher vos statistiques de trading (PNL, Win Rate, Degen Score).</Text>
          <Text style={styles.listItem}>• Présenter votre historique de trades de manière lisible.</Text>
          <Text style={styles.listItem}>• Vous inclure dans le classement (leaderboard) de l'application.</Text>
        </View>
        <Text style={styles.paragraph}>
          Les résultats de ces calculs sont associés à votre adresse et stockés dans notre base de données sécurisée pour vous permettre un accès rapide à vos statistiques lors de vos prochaines visites.
        </Text>

        <Text style={styles.heading}>4. Partage des Données</Text>
        <Text style={styles.paragraph}>
          Nous ne vendons, n'échangeons, ni ne transférons vos informations à des tiers. Les données affichées dans l'application (comme le leaderboard) sont basées sur les mêmes données publiques de la blockchain accessibles à tous.
        </Text>
        
        <Text style={styles.heading}>5. Sécurité</Text>
        <Text style={styles.paragraph}>
            Nous mettons en œuvre des mesures de sécurité pour protéger les informations que nous stockons. Cependant, aucune méthode de transmission sur Internet ou de stockage électronique n'est sûre à 100%.
        </Text>

        <Text style={styles.heading}>6. Modifications de cette Politique</Text>
        <Text style={styles.paragraph}>
          Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. Les modifications seront publiées sur cette page avec une date de mise à jour.
        </Text>

        <Text style={styles.heading}>7. Nous Contacter</Text>
        <Text style={styles.paragraph}>
          Pour toute question concernant cette politique de confidentialité, veuillez nous contacter à [votre adresse email de contact].
        </Text>
      </View>
    </ScrollView>
  );
}

const getStyles = (colorScheme: 'light' | 'dark' | null | undefined) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorScheme === 'dark' ? theme.colors.backgroundDark : theme.colors.backgroundLight,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? theme.colors.textDark : theme.colors.textLight,
    marginBottom: 10,
  },
  lastUpdated: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colorScheme === 'dark' ? theme.colors.textDark : theme.colors.textLight,
    marginTop: 20,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: colorScheme === 'dark' ? theme.colors.textDark : theme.colors.textLight,
    textAlign: 'justify',
  },
  list: {
    marginLeft: 10,
    marginVertical: 5,
  },
  listItem: {
    fontSize: 16,
    lineHeight: 24,
    color: colorScheme === 'dark' ? theme.colors.textDark : theme.colors.textLight,
  }
}); 