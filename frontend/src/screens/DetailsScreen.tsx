import React from "react";
import { ScrollView, StyleSheet, View, ActivityIndicator } from "react-native";
import { Card, List, Text, Title, useTheme } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from '@react-navigation/native';
import { useAuthorization } from "../utils/useAuthorization";
import Constants from "expo-constants";
import { DetailsScreenRouteProp } from '../navigators/HomeNavigator';
import { useSystemStatus } from "../data/leaderboard-data-access";
import { AnimatedBorderCard } from "../components/card/AnimatedBorderCard";

const API_ENDPOINT = Constants.expoConfig?.extra?.apiEndpoint;

async function fetchUserStats(userAddress: string) {
  if (!API_ENDPOINT) throw new Error("API endpoint is not configured in app.json");
  const response = await fetch(`${API_ENDPOINT}/user/${userAddress}/stats`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
}

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
  const route = useRoute<DetailsScreenRouteProp>();
  const { selectedAccount } = useAuthorization();

  const addressFromRoute = route.params?.userAddress;
  const userAddress = addressFromRoute || selectedAccount?.publicKey.toBase58();
  const isMyOwnProfile = userAddress === selectedAccount?.publicKey.toBase58();

  // On conserve ce hook pour d'éventuelles informations globales futures, mais il n'est plus utilisé pour la date
  const { data: systemStatus, isLoading: isLoadingStatus } = useSystemStatus();

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['userStats', userAddress],
    queryFn: () => fetchUserStats(userAddress!),
    enabled: !!userAddress,
  });

  const { data: history, isLoading: isLoadingHistory, isError: isErrorHistory } = useQuery({
    queryKey: ['userHistory', userAddress],
    queryFn: () => fetchUserHistory(userAddress!),
    enabled: !!userAddress,
  });

  // Logique pour déterminer la date de mise à jour la plus pertinente
  const getDisplayDate = () => {
    const userScanDate = stats?.last_scanned_at ? new Date(stats.last_scanned_at) : null;
    const globalUpdateDate = systemStatus?.last_global_update_at ? new Date(systemStatus.last_global_update_at) : null;

    if (!userScanDate && !globalUpdateDate) {
      return "Last update: N/A";
    }

    // On prend la date la plus récente des deux
    const mostRecentDate = userScanDate && globalUpdateDate 
      ? (userScanDate > globalUpdateDate ? userScanDate : globalUpdateDate)
      : userScanDate || globalUpdateDate;

    return `Last update: ${mostRecentDate!.toLocaleString()}`;
  };


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
    cardTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    listItemTitle: {
      color: theme.colors.onSurface,
    },
    date: {
      textAlign: 'center',
      marginBottom: 16,
      color: theme.colors.onSurface,
      opacity: 0.7
    }
  });

  return (
    <ScrollView style={styles.container}>
      <Title style={[styles.title, { color: theme.colors.onSurface }]}>{isMyOwnProfile ? 'Your degenStats' : 'User Stats'}</Title>

      {(isLoading || isLoadingStatus) ? (
        <ActivityIndicator style={{ marginBottom: 8 }} />
      ) : (
        <Text style={styles.date}>{getDisplayDate()}</Text>
      )}

      {!userAddress && (
         <View style={{alignItems: 'center', marginTop: 40}}>
            <Text>Connect your wallet to see your degenStats.</Text>
         </View>
      )}

      {userAddress && isError && <Text style={{textAlign: 'center', marginTop: 20, color: 'red'}}>Error fetching your stats.</Text>}

      {stats && (
        <AnimatedBorderCard style={styles.card}>
            <Title style={styles.cardTitle}>Global Stats</Title>
            <List.Item
              title="Total PNL (SOL)"
              titleStyle={styles.listItemTitle}
              right={() => <Text variant="titleMedium" style={{color: (stats.total_pnl_sol ?? 0) >= 0 ? 'green' : 'red'}}>{(stats.total_pnl_sol ?? 0).toFixed(4)} SOL</Text>}
            />
            <List.Item
              title="Win Rate"
              titleStyle={styles.listItemTitle}
              right={() => <Text variant="titleMedium">{(stats.win_rate ?? 0).toFixed(2)}%</Text>}
            />
            <List.Item
              title="Total Wins"
              titleStyle={styles.listItemTitle}
              right={() => <Text variant="bodyLarge" style={{color: 'green'}}>{stats.total_wins ?? 0}</Text>}
            />
            <List.Item
              title="Total Losses"
              titleStyle={styles.listItemTitle}
              right={() => <Text variant="bodyLarge" style={{color: 'red'}}>{stats.total_losses ?? 0}</Text>}
            />
        </AnimatedBorderCard>
      )}

      {/* La section des stats par plateforme n'est plus pertinente car on a les stats globales */}
      {/* Vous pouvez la supprimer ou la conserver si vous prévoyez de la réutiliser */}
      {/* 
      {stats && Object.keys(stats).map((platform) => (
        <Card key={platform} style={styles.card} mode="contained">
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
      */}

      <Card style={styles.card} mode="contained">
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