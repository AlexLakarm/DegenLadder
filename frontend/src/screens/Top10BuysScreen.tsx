import React, { useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, SegmentedButtons, Card, useTheme, Button, Chip } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';

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

const PLATFORM_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
  pump: { label: 'pump.fun', color: '#FFB300', bg: '#FFF3E0' },
  bonk: { label: 'letbonk.fun', color: '#FF5252', bg: '#FFF0F0' },
};

export default function Top10BuysScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const [period, setPeriod] = useState<'24h' | 'yearly'>('24h');
  const [sortBy, setSortBy] = useState<'date' | 'sol'>('date');
  const { data, isLoading, isError } = useRecentTop10Buys(period);

  const title = period === '24h'
    ? 'Last buys from the top 10 of the 24h leaderboard'
    : 'Last buys from the top 10 of the 2025 leaderboard';

  // Tri dynamique
  const sortedData = (data || []).slice().sort((a: any, b: any) => {
    if (sortBy === 'sol') {
      return b.buy_amount_sol - a.buy_amount_sol || new Date(b.buy_at).getTime() - new Date(a.buy_at).getTime();
    }
    return new Date(b.buy_at).getTime() - new Date(a.buy_at).getTime();
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 4 }}>
        <Button icon="arrow-left" mode="text" onPress={() => navigation.goBack()} compact>
          Back
        </Button>
      </View>
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
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginRight: 12, marginBottom: 4, marginTop: -4 }}>
        <Button
          icon="swap-vertical"
          mode="text"
          compact
          contentStyle={{ flexDirection: 'row-reverse' }}
          labelStyle={{ fontSize: 14, fontWeight: 'bold', color: theme.colors.onSurface }}
          onPress={() => setSortBy(sortBy === 'date' ? 'sol' : 'date')}
        >
          {sortBy === 'date' ? 'Most recent' : 'Biggest buy (SOL)'}
        </Button>
      </View>
      {isLoading && <Text style={styles.loading}>Loading...</Text>}
      {isError && <Text style={styles.error}>Error loading data</Text>}
      <FlatList
        data={sortedData}
        keyExtractor={item => item.buy_signature + item.leaderboard_period}
        renderItem={({ item }) => {
          const isPump = item.platform === 'pump';
          const isBonk = item.platform === 'bonk';
          return (
            <Card style={[styles.card, { backgroundColor: '#18181B' }]}> 
              <Card.Content>
                <View style={styles.row}>
                  <Text style={styles.user}>{item.user_address.slice(0, 6)}…</Text>
                  <Chip
                    style={{
                      backgroundColor: isPump ? '#E0F2FE' : isBonk ? '#FEF3C7' : '#eee',
                      marginHorizontal: 4,
                    }}
                    textStyle={{
                      color: isPump ? '#0284C7' : isBonk ? '#D97706' : '#888',
                      fontWeight: 'bold',
                      fontSize: 13,
                    }}
                    onPress={() => {
                      if (isPump) {
                        // @ts-ignore
                        navigation.navigate('WebView', { url: 'https://pump.fun' });
                      } else if (isBonk) {
                        // @ts-ignore
                        navigation.navigate('WebView', { url: 'https://letsbonk.fun' });
                      }
                    }}
                  >
                    {isPump ? 'pump.fun' : isBonk ? 'letsbonk' : item.platform}
                  </Chip>
                  <Text style={styles.amount}>{item.buy_amount_sol.toFixed(4)} SOL</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.token}>{item.token_mint.slice(0, 6)}…</Text>
                  <Text style={styles.date}>{new Date(item.buy_at).toLocaleString()}</Text>
                </View>
              </Card.Content>
            </Card>
          );
        }}
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
    backgroundColor: '#18181B',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    alignItems: 'center',
  },
  user: {
    fontWeight: 'bold',
    color: '#333',
  },
  platformBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginHorizontal: 4,
  },
  platformText: {
    fontWeight: 'bold',
    fontSize: 13,
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