import React from "react";
import { ScrollView, StyleSheet, View, ActivityIndicator } from "react-native";
import { Card, List, Text, Title, useTheme } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { Platform, PlatformColor } from "react-native";
import { useRoute } from '@react-navigation/native';
import { useAuthorization } from "../utils/useAuthorization";
import Constants from "expo-constants";

const API_ENDPOINT = Constants.expoConfig?.extra?.apiEndpoint;

// On utilise la même adresse mockée que dans HomeScreen pour les tests
// const MOCK_USER_ADDRESS = "3Dimjf2UDeZvsSuUYU22ovZ6uvF8z6KUnXMmokQuYfi2";

// Fonction pour fetch les stats
async function fetchUserStats(userAddress: string) {
  if (!API_ENDPOINT) throw new Error("API endpoint is not configured in app.json");
  // Assurez-vous que l'URL correspond à votre configuration locale/de production
  const response = await fetch(`${API_ENDPOINT}/user/${userAddress}/stats`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
}

// Fonction pour fetch l'historique
async function fetchUserHistory(userAddress: string) {
  if (!API_ENDPOINT) throw new Error("API endpoint is not configured in app.json");
  const response = await fetch(`${API_ENDPOINT}/user/${userAddress}/history`);
  if (!response.ok) {
    throw new Error('Network response was not ok for history');
  }
  return response.json();
}

export default function DetailsScreen() {
  const theme = useTheme();
  const route = useRoute();
  const { selectedAccount } = useAuthorization();

  // On priorise l'adresse passée en paramètre, sinon on prend celle de l'utilisateur connecté
  // @ts-ignore
  const addressFromRoute = route.params?.userAddress;
  const loggedInUserAddress = selectedAccount?.publicKey.toBase58();
  const userAddress = addressFromRoute || loggedInUserAddress;
  const isMyOwnProfile = userAddress === loggedInUserAddress;

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['userStats', userAddress],
    queryFn: () => fetchUserStats(userAddress!),
    enabled: !!userAddress, // La requête ne s'exécute que si userAddress existe
  });

  const { data: history, isLoading: isLoadingHistory, isError: isErrorHistory } = useQuery({
    queryKey: ['userHistory', userAddress],
    queryFn: () => fetchUserHistory(userAddress!),
    enabled: !!userAddress, // La requête ne s'exécute que si userAddress existe
  });

  // --- Mock Data ---
  // const pointsHistory = [
  //   { reason: "Good exit on $POPCAT", points: "+150", date: "2024-07-03" },
  //   { reason: "Rekt on $DUMDUM", points: "-50", date: "2024-07-02" },
  //   { reason: "Early entry on $WIF", points: "+200", date: "2024-07-01" },
  //   { reason: "Forgot to sell $PEPE", points: "-25", date: "2024-06-30" },
  // ];
  // -----------------

  return (
    <ScrollView style={styles.container}>
      <Title style={styles.title}>{isMyOwnProfile ? 'Your Stats' : 'User Stats'}</Title>

      {!userAddress && (
         <View style={{alignItems: 'center', marginTop: 40}}>
            <Text>Connect your wallet to see your stats.</Text>
         </View>
      )}

      {userAddress && isLoading && <ActivityIndicator style={{marginTop: 20}} size="large" />}
      {userAddress && isError && <Text style={{textAlign: 'center', marginTop: 20, color: 'red'}}>Error fetching your stats.</Text>}

      {stats && Object.keys(stats).map((platform) => (
        <Card key={platform} style={styles.card}>
          <Card.Title titleStyle={{textTransform: 'capitalize'}} title={`${platform}.fun`} />
          <Card.Content>
            <List.Item
              title="PNL (SOL)"
              description="Profit and Loss in SOL"
              right={() => <Text variant="titleMedium" style={{color: stats[platform].pnl >= 0 ? 'green' : 'red'}}>{stats[platform].pnl.toFixed(4)} SOL</Text>}
            />
             <List.Item
              title="Wins"
              right={() => <Text variant="bodyLarge" style={{color: 'green'}}>{stats[platform].wins}</Text>}
            />
             <List.Item
              title="Losses"
              right={() => <Text variant="bodyLarge" style={{color: 'red'}}>{stats[platform].losses}</Text>}
            />
          </Card.Content>
        </Card>
      ))}

      <Card style={styles.card}>
        <Card.Title title="Recent Activity" />
        <Card.Content>
          {userAddress && isLoadingHistory && <ActivityIndicator />}
          {userAddress && isErrorHistory && <Text style={{textAlign: 'center', color: 'red'}}>Error fetching history.</Text>}
          
          {history && history.length > 0 ? (
            history.map((item: any, index: number) => (
              <List.Item
                key={index}
                title={`${item.is_win ? 'Win' : 'Loss'} on $${item.token_name.split('').slice(0, 6).join('')}...`}
                description={`on ${item.platform}.fun - ${new Date(item.last_sell_at).toLocaleDateString()}`}
                right={() => (
                  <Text
                    variant="bodyLarge"
                    style={{
                      color: item.is_win ? "green" : "red",
                    }}
                  >
                    {item.pnl_sol >= 0 ? '+' : ''}{item.pnl_sol.toFixed(4)} SOL
                  </Text>
                )}
              />
            ))
          ) : (
            userAddress && !isLoadingHistory && <Text style={{textAlign: 'center'}}>No recent activity found.</Text>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  card: {
    marginBottom: 24,
  },
});
