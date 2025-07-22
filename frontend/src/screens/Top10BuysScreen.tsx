import React, { useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Text, SegmentedButtons, Card, useTheme, Button, Chip, IconButton, Snackbar } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';

const API_ENDPOINT = Constants.expoConfig?.extra?.apiEndpoint;

function useSystemStatus() {
  return useQuery({
    queryKey: ['systemStatus'],
    queryFn: async () => {
      const res = await fetch(`${API_ENDPOINT}/status`);
      if (!res.ok) throw new Error('Failed to fetch system status');
      return res.json();
    },
    refetchInterval: 10000,
  });
}

function useRefreshRecentTop10Buys() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_ENDPOINT}/refresh-recent-top10-buys`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to refresh');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemStatus'] });
    },
  });
}

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

function formatAgo(dateString?: string) {
  if (!dateString) return '';
  const now = new Date();
  let isoString = dateString;
  // Si format SQL/Postgres (avec espace)
  if (/^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}/.test(dateString)) {
    isoString = dateString.replace(' ', 'T');
  }
  // Corrige les offsets courts (+00, +02) en +00:00, +02:00
  isoString = isoString.replace(/([+-][0-9]{2})(?!:?[0-9]{2})$/, '$1:00');
  // Si la date n'a ni 'Z' ni offset explicite, on ajoute 'Z' (UTC)
  if (!/[zZ]|[+-][0-9]{2}:[0-9]{2}$/.test(isoString)) {
    isoString += 'Z';
  }
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return 'just now';
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (hours > 0) return `${hours}h${mins.toString().padStart(2, '0')} ago`;
  if (mins > 0) return `${mins} min ago`;
  return 'just now';
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
  const { data: status, isLoading: isStatusLoading } = useSystemStatus();
  const refreshMutation = useRefreshRecentTop10Buys();
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string; error?: boolean }>({ visible: false, message: '', error: false });

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
      <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 4, marginTop: -4, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconButton
            icon={refreshMutation.isPending ? 'loading' : 'refresh'}
            size={20}
            disabled={refreshMutation.isPending || isStatusLoading || (() => {
              if (!status?.recent_top10_buys_refreshed_at) return false;
              const last = new Date(status.recent_top10_buys_refreshed_at);
              const now = new Date();
              return (now.getTime() - last.getTime()) < 15 * 60 * 1000;
            })()}
            onPress={async () => {
              setSnackbar({ visible: true, message: 'Refresh started! This may take a few minutes before new data appears.', error: false });
              try {
                await refreshMutation.mutateAsync();
                // Pas de message de succès, la data se mettra à jour automatiquement
              } catch (e: any) {
                setSnackbar({ visible: true, message: e.message, error: true });
              }
            }}
            style={{ marginRight: 0, marginLeft: 0 }}
          />
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginLeft: -4, minWidth: 80 }}>
            {status?.recent_top10_buys_refreshed_at ?
              `Last refresh: ${formatAgo(status.recent_top10_buys_refreshed_at)}`
              : 'No refresh yet'}
          </Text>
        </View>
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
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={5000}
        style={{
          backgroundColor: snackbar.error ? theme.colors.error : theme.colors.primary,
          borderRadius: 10,
          elevation: 10,
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 32,
          zIndex: 9999,
        }}
      >
        <Text style={{ color: '#000', fontWeight: 'bold' }}>{snackbar.message}</Text>
      </Snackbar>
      {isLoading && <Text style={styles.loading}>Loading...</Text>}
      {isError && <Text style={styles.error}>Error loading data</Text>}
      <FlatList
        data={sortedData}
        keyExtractor={item => item.buy_signature + item.leaderboard_period}
        renderItem={({ item }) => {
          const isPump = item.platform === 'pump';
          const isBonk = item.platform === 'bonk';
          const mintShort = `${item.token_mint.slice(0, 6)}...${item.token_mint.slice(-4)}`;
          return (
            <Card style={[styles.card, { backgroundColor: '#18181B' }]}> 
              <Card.Content>
                <View style={[styles.row, { alignItems: 'center' }]}> 
                  {/* Ticker + mint + copy */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', color: theme.colors.onSurface, marginRight: 4 }}>Ticker :</Text>
                    <Text style={{ color: theme.colors.primary, fontWeight: 'bold', marginRight: 2 }}>{mintShort}</Text>
                    <TouchableOpacity
                      onPress={async () => { await Clipboard.setStringAsync(item.token_mint); }}
                      style={{ marginRight: 8 }}
                    >
                      <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 16 }}>📋</Text>
                    </TouchableOpacity>
                  </View>
                  {/* Plateforme */}
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
                    onPress={async () => {
                      let url = '';
                      if (isPump) url = 'https://pump.fun';
                      else if (isBonk) url = 'https://letsbonk.fun';
                      if (url) {
                        try {
                          await Linking.openURL(url);
                        } catch {
                          Alert.alert('Erreur', "Impossible d'ouvrir le site");
                        }
                      }
                    }}
                  >
                    {isPump ? 'pump.fun' : isBonk ? 'letsbonk' : item.platform}
                  </Chip>
                  {/* Montant SOL */}
                  <Text style={styles.amount}>{item.buy_amount_sol.toFixed(4)} SOL</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.user}>{item.user_address.slice(0, 6)}…</Text>
                  <Text style={styles.date}>{formatAgo(item.buy_at)}</Text>
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