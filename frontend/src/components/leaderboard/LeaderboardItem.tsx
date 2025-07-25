import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useNavigation } from '@react-navigation/native';
import { LeaderboardEntry } from "../../data/leaderboard-data-access";
import { ellipsify } from "../../utils/ellipsify";
import MaterialCommunityIcon from "@expo/vector-icons/MaterialCommunityIcons";

interface LeaderboardItemProps {
  item: LeaderboardEntry;
  isCurrentUser?: boolean;
  sortBy?: string; // Nouveau prop pour connaître le mode de tri
  showRankChange?: boolean;
}

export function LeaderboardItem({ item, isCurrentUser = false, sortBy = 'degen_score', showRankChange = true }: LeaderboardItemProps) {
  const theme = useTheme();
  const navigation = useNavigation();

  const containerStyle = [
    styles.container,
    {
      backgroundColor: isCurrentUser
        ? theme.colors.primaryContainer
        : theme.colors.surface,
    },
  ];

  const handlePress = () => {
    // @ts-ignore - On sait que la navigation vers DetailsScreen existe
    navigation.navigate('Details', { userAddress: item.user_address });
  };

  // Fonction pour afficher l'évolution du rang
  const renderRankChange = () => {
    // Si on trie par autre chose que degen_score, on n'affiche pas l'évolution du rang
    // car elle est basée sur le rang par score, pas sur le rang actuel
    if (sortBy !== 'degen_score') {
      return null;
    }

    if (item.rankChange24h === 'same' || item.rankChange24h === 0) {
      return (
        <View style={styles.rankChangeContainer}>
          <MaterialCommunityIcon 
            name="minus" 
            size={12} 
            color={theme.colors.onSurfaceVariant} 
          />
        </View>
      );
    }
    
    if (item.rankChange24h === 'up' || (typeof item.rankChange24h === 'number' && item.rankChange24h > 0)) {
      return (
        <View style={styles.rankChangeContainer}>
          <MaterialCommunityIcon 
            name="trending-up" 
            size={12} 
            color={theme.colors.primary} 
          />
          {typeof item.rankChange24h === 'number' && (
            <Text style={[styles.rankChangeText, { color: theme.colors.primary }]}>+{item.rankChange24h}</Text>
          )}
        </View>
      );
    }
    
    if (item.rankChange24h === 'down' || (typeof item.rankChange24h === 'number' && item.rankChange24h < 0)) {
      return (
        <View style={styles.rankChangeContainer}>
          <MaterialCommunityIcon 
            name="trending-down" 
            size={12} 
            color={theme.colors.error} 
          />
          {typeof item.rankChange24h === 'number' && (
            <Text style={[styles.rankChangeText, { color: theme.colors.error }]}>{item.rankChange24h}</Text>
          )}
        </View>
      );
    }
    
    return null;
  };

  // Fonction pour afficher la valeur selon le mode de tri
  const renderValue = () => {
    switch (sortBy) {
      case 'pnl':
        return (
          <Text style={[styles.score, { 
            color: item.pnl_sol >= 0 ? theme.colors.primary : theme.colors.error, 
            fontWeight: 'bold' 
          }]}>
            {item.pnl_sol.toFixed(2)} SOL
          </Text>
        );
      case 'win_rate':
        const winRate = item.winningTrades + item.losingTrades > 0 
          ? (item.winningTrades / (item.winningTrades + item.losingTrades) * 100).toFixed(1)
          : '0.0';
        return (
          <Text style={[styles.score, { 
            color: parseFloat(winRate) >= 50 ? theme.colors.primary : theme.colors.error, 
            fontWeight: 'bold' 
          }]}>
            {winRate}%
          </Text>
        );
      default: // degen_score
        return (
          <Text style={[styles.score, { color: theme.colors.onSurface, fontWeight: 'bold' }]}>
            {item.degen_score} pts
          </Text>
        );
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={containerStyle}>
      <View style={styles.rankContainer}>
        <Text style={[styles.rank, { color: theme.colors.onSurface }]}>
          #{item.rank}
        </Text>
        {showRankChange && renderRankChange()}
      </View>
      <View style={styles.userInfo}>
        <Text
          style={[styles.name, { color: theme.colors.onSurface, fontWeight: isCurrentUser ? 'bold' : 'normal' }]}
          numberOfLines={1}
        >
          {ellipsify(item.user_address)}
        </Text>
      </View>
      <View style={styles.scoreContainer}>
        {renderValue()}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderRadius: 8,
  },
  rankContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: 80, // Augmenté pour accommoder l'évolution du rang
  },
  rank: {
    fontWeight: "bold",
    fontSize: 16,
  },
  rankChangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
  },
  rankChangeText: {
    fontSize: 10,
    fontWeight: "bold",
    marginLeft: 2,
  },
  userInfo: {
    flex: 1,
    marginHorizontal: 0,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 