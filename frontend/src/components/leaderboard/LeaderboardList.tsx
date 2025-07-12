import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LeaderboardItem } from './LeaderboardItem';
import { LeaderboardEntry, useSystemStatus } from '../../data/leaderboard-data-access';

interface LeaderboardListProps {
  data: LeaderboardEntry[];
  currentUserAddress?: string;
}

export function LeaderboardList({ data, currentUserAddress }: LeaderboardListProps) {
  const { data: status } = useSystemStatus();

  const isCurrentUser = (item: LeaderboardEntry) => {
    return item.user_address === currentUserAddress;
  };

  return (
    <View style={{ marginVertical: 20 }}>
      {/* Le titre est dans HomeScreen, nous ajoutons juste le timestamp ici */}
      {status?.leaderboard_updated_at && (
        <Text style={styles.updatedAtText}>
          Last update: {new Date(status.leaderboard_updated_at).toLocaleString()}
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