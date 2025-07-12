import React from "react";
import { ScrollView, StyleSheet, View, ActivityIndicator } from "react-native";
import { Card, List, Text, Title, useTheme } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from '@react-navigation/native';
import { useAuthorization } from "../utils/useAuthorization";
import Constants from "expo-constants";
import { DetailsScreenRouteProp } from '../navigators/HomeNavigator';
import { useSystemStatus } from "../data/leaderboard-data-access";

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

  // Calculer les statistiques globales
  const globalStats = React.useMemo(() => {
    if (!stats) return null;

    let totalWins = 0;
    let totalLosses = 0;
    let totalPnl = 0;

    for (const platform in stats) {
      totalWins += stats[platform].wins;
      totalLosses += stats[platform].losses;
      totalPnl += stats[platform].pnl;
    }

    const totalTrades = totalWins + totalLosses;
    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;

    return { totalWins, totalLosses, totalPnl, winRate };
  }, [stats]);


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

      {isLoadingStatus ? (
        <ActivityIndicator style={{ marginBottom: 8 }} />
      ) : systemStatus?.trades_updated_at ? (
        <Text style={styles.date}>
            Last trades update: {new Date(systemStatus.trades_updated_at).toLocaleString()}
        </Text>
      ) : null}

      {!userAddress && (
         <View style={{alignItems: 'center', marginTop: 40}}>
            <Text>Connect your wallet to see your degenStats.</Text>
         </View>
      )}

      {userAddress && isLoading && <ActivityIndicator style={{marginTop: 20}} size="large" />}
      {userAddress && isError && <Text style={{textAlign: 'center', marginTop: 20, color: 'red'}}>Error fetching your stats.</Text>}

      {globalStats && (
        <Card style={styles.card} mode="contained">
          <Card.Title title="Global Stats" />
          <Card.Content>
            <List.Item
              title="Total PNL (SOL)"
              right={() => <Text variant="titleMedium" style={{color: globalStats.totalPnl >= 0 ? 'green' : 'red'}}>{globalStats.totalPnl.toFixed(4)} SOL</Text>}
            />
            <List.Item
              title="Win Rate"
              right={() => <Text variant="titleMedium">{globalStats.winRate.toFixed(2)}%</Text>}
            />
            <List.Item
              title="Total Wins"
              right={() => <Text variant="bodyLarge" style={{color: 'green'}}>{globalStats.totalWins}</Text>}
            />
            <List.Item
              title="Total Losses"
              right={() => <Text variant="bodyLarge" style={{color: 'red'}}>{globalStats.totalLosses}</Text>}
            />
          </Card.Content>
        </Card>
      )}

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