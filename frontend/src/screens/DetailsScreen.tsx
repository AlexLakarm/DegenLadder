import React, { useState } from "react";
import { ScrollView, StyleSheet, View, ActivityIndicator, Alert, Linking } from "react-native";
import { Card, List, IconButton, Text, Title, useTheme, SegmentedButtons, Chip } from "react-native-paper";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthorization } from "../utils/useAuthorization";
import { useSystemStatus } from "../data/leaderboard-data-access";
import Constants from "expo-constants";
import { AnimatedBorderCard } from "../components/card/AnimatedBorderCard";
import * as Clipboard from 'expo-clipboard';

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

const StatBox = ({ icon, label, value, valueColor }: { icon: string, label: string, value: any, valueColor?: string }) => {
  const theme = useTheme();
  const styles = StyleSheet.create({
    statBox: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      width: '48%',
      marginBottom: 12,
    },
    statIcon: {
      marginBottom: 8,
    },
    statValue: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    statLabel: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
    },
  });

  return (
    <View style={styles.statBox}>
      <IconButton icon={icon} size={24} style={styles.statIcon} />
      <Text style={[styles.statValue, { color: valueColor || theme.colors.onSurface }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
};


export function DetailsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { selectedAccount } = useAuthorization();
  const addressFromRoute = route.params?.userAddress;
  const userAddress = addressFromRoute || selectedAccount?.publicKey.toBase58();
  const isMyOwnProfile = userAddress === selectedAccount?.publicKey.toBase58();
  const [selectedPlatform, setSelectedPlatform] = useState('pump');


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

    return `Updated: ${displayDate!.toLocaleString()}`;
  };

  const globalStats = stats?.globalStats;
  const platformStats = stats?.platformStats;

  // Fonction pour copier l'adresse du token
  const copyTokenAddress = async (tokenMint: string) => {
    try {
      await Clipboard.setStringAsync(tokenMint);
      Alert.alert("Copied!", "Token address copied to clipboard");
    } catch (error) {
      Alert.alert("Error", "Failed to copy token address");
    }
  };

  // Fonction pour ouvrir les plateformes
  const openPlatform = (platform: string) => {
    const urls = {
      pump: 'https://pump.fun',
      bonk: 'https://letsbonk.fun'
    };
    
    const url = urls[platform as keyof typeof urls];
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert("Error", "Could not open platform");
      });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header Section */}
      {userAddress && (
        <View style={styles.headerContainer}>
          <View>
            <Title style={styles.headerTitle}>{isMyOwnProfile ? 'Your DegenStats' : 'User Stats'}</Title>
            <Text style={styles.headerAddress}>{userAddress.substring(0, 6)}...{userAddress.substring(userAddress.length - 6)}</Text>
          </View>
          {refreshMutation.isPending ? (
            <ActivityIndicator />
          ) : (
            <IconButton
              icon="refresh"
              size={28}
              onPress={() => refreshMutation.mutate()}
            />
          )}
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" />
      ) : isError ? (
         <Text style={{color: 'red', textAlign: 'center', marginTop: 40}}>Error fetching user stats.</Text>
      ) : userAddress && globalStats ? (
        <>
          {/* Date and PNL */}
          <Text style={styles.date}>{getDisplayDate()}</Text>

          {/* PNL and Score */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Total PNL (SOL)</Text>
              <Title style={[styles.summaryValue, { color: (globalStats.total_pnl_sol ?? 0) >= 0 ? '#22c55e' : '#ef4444' }]}>
                {(globalStats.total_pnl_sol ?? 0).toFixed(4)}
              </Title>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Degen Score</Text>
              <Title style={styles.summaryValue}>
                {Math.round(globalStats.total_degen_score ?? 0)} pts
              </Title>
            </View>
          </View>
          
          {/* Global Stats Grid */}
          <View style={styles.statsGrid}>
            <StatBox 
              icon="swap-vertical-bold" 
              label="Total Trades" 
              value={globalStats.total_trades ?? 0} 
            />
            <StatBox 
              icon="chart-pie" 
              label="Win Rate" 
              value={`${(globalStats.win_rate ?? 0).toFixed(1)}%`}
              valueColor={(globalStats.win_rate ?? 0) >= 50 ? '#22c55e' : '#ef4444'}
            />
            <StatBox 
              icon="arrow-up-bold-box" 
              label="Wins" 
              value={globalStats.total_wins ?? 0}
              valueColor="#22c55e"
            />
            <StatBox 
              icon="arrow-down-bold-box" 
              label="Losses" 
              value={globalStats.total_losses ?? 0}
              valueColor="#ef4444"
            />
          </View>

          {/* Platform Stats Section */}
          {platformStats && (
            <View style={styles.sectionContainer}>
              <Title style={styles.sectionTitle}>Platform Stats</Title>
              <SegmentedButtons
                value={selectedPlatform}
                onValueChange={setSelectedPlatform}
                buttons={[
                  { value: 'pump', label: 'pump.fun' },
                  { value: 'bonk', label: 'letsbonk.fun' },
                ]}
                style={{ marginBottom: 16 }}
              />
              <Card style={styles.card} mode="elevated">
                 <Card.Content>
                   <List.Item
                     title="PNL (SOL)"
                     titleStyle={styles.listItemTitle}
                     right={() => <Text style={{fontSize: 16, color: platformStats[selectedPlatform]?.pnl >= 0 ? '#22c55e' : '#ef4444'}}>{platformStats[selectedPlatform]?.pnl.toFixed(4)}</Text>}
                   />
                   <List.Item
                     title="Degen Score"
                     titleStyle={styles.listItemTitle}
                     right={() => <Text style={{fontSize: 16}}>{Math.round(platformStats[selectedPlatform]?.degen_score ?? 0)} pts</Text>}
                   />
                   <List.Item
                     title="Wins"
                     titleStyle={styles.listItemTitle}
                     right={() => <Text style={{fontSize: 16, color: '#22c55e'}}>{platformStats[selectedPlatform]?.wins}</Text>}
                   />
                   <List.Item
                     title="Losses"
                     titleStyle={styles.listItemTitle}
                     right={() => <Text style={{fontSize: 16, color: '#ef4444'}}>{platformStats[selectedPlatform]?.losses}</Text>}
                   />
                 </Card.Content>
              </Card>
            </View>
          )}

          {/* Recent History Section */}
          {history && history.length > 0 && (
            <View style={styles.sectionContainer}>
              <Title style={styles.sectionTitle}>Recent Trades</Title>
              <Card style={styles.card}>
                <Card.Content>
                  {history.map((trade: any, index: number) => (
                    <List.Item
                      key={index}
                      title={
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text>{`${trade.token_name.slice(0, 10)}...`}</Text>
                          <IconButton
                            icon="content-copy"
                            size={16}
                            onPress={() => copyTokenAddress(trade.token_name)}
                            style={{ marginLeft: 8, margin: 0 }}
                          />
                        </View>
                      }
                      description={`Score: ${(trade.degen_score > 0 ? '+' : '')}${Math.round(trade.degen_score ?? 0)} pts`}
                      left={() => <Text style={{fontSize: 24, marginRight: 12}}>{trade.is_win ? '✅' : '❌'}</Text>}
                      right={() => (
                        <View style={{alignItems: 'flex-end'}}>
                          <Text>{new Date(trade.last_sell_at).toLocaleDateString()}</Text>
                           <Chip 
                             style={{
                               marginTop: 4, 
                               backgroundColor: trade.platform === 'pump' ? '#E0F2FE' : '#FEF3C7'
                             }}
                             textStyle={{color: trade.platform === 'pump' ? '#0284C7' : '#D97706'}}
                             onPress={() => openPlatform(trade.platform)}
                             >
                             {trade.platform === 'pump' ? 'pump.fun' : 'letsbonk'}
                           </Chip>
                         </View>
                      )}
                    />
                  ))}
                </Card.Content>
              </Card>
            </View>
          )}

          {/* Disclaimer Section */}
          <View style={styles.disclaimerContainer}>
            <Text style={styles.disclaimerText}>
              Disclaimer: The information provided in this application is for informational purposes only and does not constitute financial advice. All data is sourced from the public Solana blockchain. Trading cryptocurrencies involves significant risk.
            </Text>
          </View>
        </>
      ) : (
         <View style={{alignItems: 'center', marginTop: 40}}>
           <Text style={{fontSize: 18, marginBottom: 20, color: theme.colors.onSurface}}>
            {userAddress ? 'No stats found for this user.' : 'Connect your wallet to see your stats'}
           </Text>
         </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40, // Add padding to the bottom
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerAddress: {
    fontSize: 14,
    color: '#A1A1AA',
  },
  pnlAndDateContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  pnl: {
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 44,
  },
  date: {
    color: '#71717A',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: '#18181B',
    borderRadius: 12,
  },
  summaryBox: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#A1A1AA',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sectionContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center'
  },
  card: {
    backgroundColor: '#18181B',
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  disclaimerContainer: {
    marginTop: 32,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#a1a1aa', // zinc-400
    textAlign: 'center',
    lineHeight: 18,
  },
});