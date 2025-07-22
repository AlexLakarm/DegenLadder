import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, SegmentedButtons, Card, useTheme } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';

const API_ENDPOINT = Constants.expoConfig?.extra?.apiEndpoint;

function useRecentTop10Buys(period: '24h' | 'yearly') {
  return useQuery({
    queryKey: ['recentTop10Buys', period],
    queryFn: async () => {
      const res = await fetch(`${API_ENDPOINT}/recent-top10-buys?period=${period}`);
      if (!res.ok) throw new Error('Failed to fetch recent buys');
      return res.json();
    },
  });
}

export default function Top10BuysScreen() {
  const theme = useTheme();
  const [period, setPeriod] = useState<'24h' | 'yearly'>('24h');
  const { data, isLoading, isError } = useRecentTop10Buys(period);

  const title = period === '24h'
    ? 'Last buys from the top 10 of the 24h leaderboard'
    : 'Last buys from the top 10 of the 2025 leaderboard';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Text variant="headlineSmall" style={styles.title}>{title}</Text>
      <SegmentedButtons
        value={period}
        onValueChange={v => setPeriod(v as '24h' | 'yearly')}
        style={{ margin: 12 }}
        buttons={[
          { value: '24h', label: '24h' },
          { value: 'yearly', label: '2025' },
        ]}
      />
      {isLoading && <Text style={styles.loading}>Loading...</Text>}
      {isError && <Text style={styles.error}>Error loading data</Text>}
      <FlatList
        data={data || []}
        keyExtractor={item => item.buy_signature + item.leaderboard_period}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.row}>
                <Text style={styles.user}>{item.user_address.slice(0, 6)}…</Text>
                <Text style={styles.platform}>{item.platform}</Text>
                <Text style={styles.amount}>{item.buy_amount_sol.toFixed(4)} SOL</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.token}>{item.token_mint.slice(0, 6)}…</Text>
                <Text style={styles.date}>{new Date(item.buy_at).toLocaleString()}</Text>
              </View>
            </Card.Content>
          </Card>
        )}
        contentContainerStyle={{ padding: 12 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  loading: {
    textAlign: 'center',
    marginTop: 24,
  },
  error: {
    textAlign: 'center',
    marginTop: 24,
    color: 'red',
  },
  card: {
    marginBottom: 12,
    borderRadius: 10,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  user: {
    fontWeight: 'bold',
    color: '#333',
  },
  platform: {
    fontWeight: 'bold',
    color: '#666',
  },
  amount: {
    fontWeight: 'bold',
    color: '#007aff',
  },
  token: {
    color: '#888',
  },
  date: {
    color: '#888',
    fontSize: 12,
  },
}); 