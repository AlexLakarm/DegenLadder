import React from "react";
import { ScrollView, StyleSheet, View, ActivityIndicator, Alert } from "react-native";
import { Card, List, IconButton, Text, Title, useTheme } from "react-native-paper";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthorization } from "../utils/useAuthorization";
import { useSystemStatus } from "../data/leaderboard-data-access";
import Constants from "expo-constants";
import { AnimatedBorderCard } from "../components/card/AnimatedBorderCard";

const API_ENDPOINT = Constants.expoConfig?.extra?.apiEndpoint;

const platformDisplayNames: { [key: string]: string } = {
  pump: 'pump.fun',
  bonk: 'letsbonk.fun',
};

async function fetchUserStats(userAddress: string) {
  const response = await fetch(`${API_ENDPOINT}/user/${userAddress}/stats`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  const data = await response.json();
  return data;
}

async function fetchUserHistory(userAddress: string) {
    const response = await fetch(`${API_ENDPOINT}/user/${userAddress}/history`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return data;
}

// Nouvelle fonction pour appeler le refresh
async function refreshUser(userAddress: string) {
  const response = await fetch(`${API_ENDPOINT}/user/${userAddress}/refresh`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to initiate refresh');
  }
  return response.json();
}

export default function DetailsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { selectedAccount } = useAuthorization();
  const addressFromRoute = route.params?.userAddress;
  const userAddress = addressFromRoute || selectedAccount?.publicKey.toBase58();
  const isMyOwnProfile = userAddress === selectedAccount?.publicKey.toBase58();

  const queryClient = useQueryClient();

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

  // Mutation pour le rafraîchissement manuel
  const refreshMutation = useMutation({
    mutationFn: () => refreshUser(userAddress!),
    onSuccess: () => {
      Alert.alert("Refresh Started", "Your stats will be updated in a moment.");
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['userStats', userAddress] });
        queryClient.invalidateQueries({ queryKey: ['userHistory', userAddress] });
      }, 10000); // On attend 10s pour laisser le temps au worker
    },
    onError: (error) => {
      Alert.alert("Refresh Failed", "Could not start the refresh process. Please try again later.");
      console.error("Refresh failed", error);
    }
  });

  // Logique pour déterminer la date de mise à jour la plus pertinente
  const getDisplayDate = () => {
    const userScanDate = stats?.globalStats?.last_scanned_at ? new Date(stats.globalStats.last_scanned_at) : null;
    const globalUpdateDate = systemStatus?.last_global_update_at ? new Date(systemStatus.last_global_update_at) : null;

    if (!userScanDate && !globalUpdateDate) {
      return 'Last update: Not available';
    }

    const displayDate = userScanDate && globalUpdateDate 
      ? (userScanDate > globalUpdateDate ? userScanDate : globalUpdateDate) 
      : userScanDate || globalUpdateDate;

    return `Last update: ${displayDate!.toLocaleString()}`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.titleContainer}>
        <Title style={[styles.title, { color: theme.colors.onSurface }]}>
          {isMyOwnProfile ? 'Your degenStats' : 'User Stats'}
        </Title>
        {userAddress && (
          refreshMutation.isPending ? (
            <ActivityIndicator style={styles.refreshIcon} />
          ) : (
            <IconButton
              icon="refresh"
              size={24}
              style={styles.refreshIcon}
              onPress={() => refreshMutation.mutate()}
            />
          )
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginBottom: 8 }} />
      ) : stats?.globalStats?.last_scanned_at ? (
        <Text style={styles.date}>{getDisplayDate()}</Text>
      ) : (
        <Text style={styles.date}>User not scanned yet.</Text>
      )}

      {!userAddress && (
         <View style={{alignItems: 'center', marginTop: 40}}>
           <Text style={{fontSize: 18, marginBottom: 20, color: theme.colors.onSurface}}>Connect your wallet to see your stats</Text>
         </View>
      )}

      {userAddress && isError && (
        <Text style={{color: 'red', textAlign: 'center'}}>Error fetching user stats.</Text>
      )}

      {stats?.globalStats && (
        <AnimatedBorderCard style={styles.card}>
            <Title style={styles.cardTitle}>Global Stats</Title>
            <List.Item
              title="Total PNL (SOL)"
              titleStyle={styles.listItemTitle}
              right={() => <Text variant="titleMedium" style={{color: (stats.globalStats.total_pnl_sol ?? 0) >= 0 ? 'green' : 'red'}}>{(stats.globalStats.total_pnl_sol ?? 0).toFixed(4)} SOL</Text>}
            />
            <List.Item
              title="Win Rate"
              titleStyle={styles.listItemTitle}
              right={() => <Text variant="titleMedium">{(stats.globalStats.win_rate ?? 0).toFixed(2)}%</Text>}
            />
             <List.Item
              title="Total Trades"
              titleStyle={styles.listItemTitle}
              right={() => <Text variant="titleMedium">{stats.globalStats.total_trades ?? 0}</Text>}
            />
            <List.Item
              title="Wins"
              titleStyle={styles.listItemTitle}
              right={() => <Text variant="titleMedium" style={{color: 'green'}}>{stats.globalStats.total_wins ?? 0}</Text>}
            />
            <List.Item
              title="Losses"
              titleStyle={styles.listItemTitle}
              right={() => <Text variant="titleMedium" style={{color: 'red'}}>{stats.globalStats.total_losses ?? 0}</Text>}
            />
        </AnimatedBorderCard>
      )}

      {stats?.platformStats && Object.keys(stats.platformStats).map((platform) => (
        <Card key={platform} style={styles.card} mode="elevated">
          <Card.Title 
            titleStyle={[styles.cardTitle, {textTransform: 'none'}]} 
            title={platformDisplayNames[platform] || `${platform}.fun`} 
          />
          <Card.Content>
            <List.Item
              title="PNL (SOL)"
              titleStyle={styles.listItemTitle}
              right={() => <Text variant="titleMedium" style={{color: stats.platformStats[platform].pnl >= 0 ? 'green' : 'red'}}>{stats.platformStats[platform].pnl.toFixed(4)} SOL</Text>}
            />
            <List.Item
              title="Wins"
              titleStyle={styles.listItemTitle}
              right={() => <Text variant="titleMedium" style={{color: 'green'}}>{stats.platformStats[platform].wins}</Text>}
            />
            <List.Item
              title="Losses"
              titleStyle={styles.listItemTitle}
              right={() => <Text variant="titleMedium" style={{color: 'red'}}>{stats.platformStats[platform].losses}</Text>}
            />
          </Card.Content>
        </Card>
      ))}
      
      {isLoadingHistory ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : isErrorHistory ? (
        <Text style={{color: 'red', textAlign: 'center'}}>Error fetching trade history.</Text>
      ) : (
        history && history.length > 0 && (
          <Card style={styles.card}>
            <Card.Title title="Recent Trades" titleStyle={styles.cardTitle} />
            <Card.Content>
              {history.map((trade: any, index: number) => (
                <List.Item
                  key={index}
                  title={`${trade.is_win ? '✅' : '❌'} ${trade.token_name.slice(0, 10)}...`}
                  description={`PNL: ${trade.pnl_sol.toFixed(4)} SOL`}
                  titleStyle={styles.listItemTitle}
                  right={() => <Text>{new Date(trade.last_sell_at).toLocaleDateString()}</Text>}
                />
              ))}
            </Card.Content>
          </Card>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 16,
  },
  refreshIcon: {
    marginVertical: 16,
  },
  date: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 16,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  listItemTitle: {
    fontSize: 16,
  },
});