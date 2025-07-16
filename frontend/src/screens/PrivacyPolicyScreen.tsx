import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

export function PrivacyPolicyScreen() {
  const theme = useTheme(); // Utiliser le hook pour le thème dynamique
  const styles = getStyles(theme);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.lastUpdated}>Last updated: July 16, 2025</Text>

        <Text style={styles.heading}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          Welcome to DegenRank. This Privacy Policy is intended to inform you about how we handle your information when you use our application. By using DegenRank, you agree to the practices described in this document.
        </Text>

        <Text style={styles.heading}>2. Data We Use</Text>
        <Text style={styles.paragraph}>
          DegenRank operates by exclusively using public and accessible data from the Solana blockchain. When you connect your wallet to our application, the only piece of information we record is your <Text style={{fontWeight: 'bold'}}>public wallet address</Text>.
        </Text>
        <Text style={styles.paragraph}>
          We do not have access to, nor do we store, your private keys, seed phrases, or any other personally identifiable information (such as your name or email).
        </Text>

        <Text style={styles.heading}>3. How We Use Data</Text>
        <Text style={styles.paragraph}>
          Your public address is used to query the Solana blockchain to retrieve your transaction history. This information is then processed by our service to:
        </Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• Calculate and display your trading statistics (PNL, Win Rate, Degen Score).</Text>
          <Text style={styles.listItem}>• Present your trade history in a readable format.</Text>
          <Text style={styles.listItem}>• Include you in the application's leaderboard.</Text>
        </View>
        <Text style={styles.paragraph}>
          The results of these calculations are associated with your address and stored in our secure database to provide you with quick access to your statistics on future visits.
        </Text>

        <Text style={styles.heading}>4. Data Sharing</Text>
        <Text style={styles.paragraph}>
          We do not sell, trade, or otherwise transfer your information to third parties. The data displayed in the application (such as the leaderboard) is based on the same public blockchain data accessible to everyone.
        </Text>
        
        <Text style={styles.heading}>5. Security</Text>
        <Text style={styles.paragraph}>
            We implement security measures to protect the information we store. However, no method of transmission over the Internet or electronic storage is 100% secure.
        </Text>

        <Text style={styles.heading}>6. Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We reserve the right to modify this privacy policy at any time. Changes will be posted on this page with an updated date.
        </Text>

        <Text style={styles.heading}>7. Contact Us</Text>
        <Text style={styles.paragraph}>
          For any questions regarding this privacy policy, please contact us at degenrank-legal@gmail.com.
        </Text>
      </View>
    </ScrollView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: 10,
  },
  lastUpdated: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginTop: 20,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.onSurface,
    textAlign: 'justify',
  },
  list: {
    marginLeft: 10,
    marginVertical: 5,
  },
  listItem: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.onSurface,
  }
}); 