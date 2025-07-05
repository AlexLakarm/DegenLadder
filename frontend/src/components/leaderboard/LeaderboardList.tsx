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
          key={item.address} // Utiliser l'adresse comme clé est plus robuste
          item={item}
          isCurrentUser={isCurrentUser(item)}
        />
      ))}
    </View>
  );
} 