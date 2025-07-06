import React from 'react';
import { View } from 'react-native';
import { LeaderboardItem } from './LeaderboardItem';
import { LeaderboardEntry } from '../../data/leaderboard-data-access';

interface LeaderboardListProps {
  data: LeaderboardEntry[];
  currentUserAddress?: string;
}

export function LeaderboardList({ data, currentUserAddress }: LeaderboardListProps) {
  const isCurrentUser = (item: LeaderboardEntry) => {
    return item.user_address === currentUserAddress;
  };

  return (
    <View style={{ marginVertical: 20 }}>
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