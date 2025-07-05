import React from 'react';
import { View } from 'react-native';
import { LeaderboardItem } from './LeaderboardItem';
import { LeaderboardEntry } from '../../data/leaderboard-data-access';

interface LeaderboardListProps {
  data: LeaderboardEntry[];
}

export function LeaderboardList({ data }: LeaderboardListProps) {
  // Pour l'instant, on considère qu'aucun utilisateur n'est le "currentUser"
  // On pourra rendre ça dynamique plus tard si besoin.
  const isCurrentUser = (item: LeaderboardEntry) => false;

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