import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LeaderboardItem } from './LeaderboardItem';
import { LeaderboardEntry, useSystemStatus } from '../../data/leaderboard-data-access';

interface LeaderboardListProps {
  data: LeaderboardEntry[];
  currentUserAddress?: string;
}

export function LeaderboardList({ data, currentUserAddress }: LeaderboardListProps) {
  const { data: status, isLoading } = useSystemStatus();

  const isCurrentUser = (item: LeaderboardEntry) => {
    return item.user_address === currentUserAddress;
  };

  return (
    <View style={{ marginVertical: 20 }}>
      {/* Affiche la date de la dernière mise à jour globale du classement */}
      {isLoading && <ActivityIndicator size="small" />}
      {status?.last_global_update_at && (
        <Text style={styles.updatedAtText}>
          Last update: {new Date(status.last_global_update_at).toLocaleString()}
        </Text>
      )}

      {data.map((item) => (
        <LeaderboardItem
          key={item.user_address} // Utiliser user_address comme clé
          item={item}
          isCurrentUser={isCurrentUser(item)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  updatedAtText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 12,
  },
});