import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { LeaderboardEntry } from "../../data/leaderboard-data-access";
import { ellipsify } from "../../utils/ellipsify";
import MaterialCommunityIcon from "@expo/vector-icons/MaterialCommunityIcons";

interface LeaderboardItemProps {
  item: LeaderboardEntry;
  isCurrentUser?: boolean;
}

export function LeaderboardItem({ item, isCurrentUser = false }: LeaderboardItemProps) {
  const theme = useTheme();
  const profit = item.pnl_sol;
  const displayProfit = typeof profit === 'number' && !isNaN(profit) ? profit.toFixed(4) : '...';

  const containerStyle = [
    styles.container,
    {
      backgroundColor: isCurrentUser
        ? theme.colors.primaryContainer
        : theme.colors.surface,
    },
  ];

  const getRankChangeColor = () => {
    if (item.rankChange24h === 'up') return "green";
    if (item.rankChange24h === 'down') return "red";
    return theme.colors.outline;
  };

  const getRankChangeIcon = () => {
    if (item.rankChange24h === 'up') return "arrow-up-thin";
    if (item.rankChange24h === 'down') return "arrow-down-thin";
    return "minus";
  }

  return (
    <View style={containerStyle}>
      <View style={styles.rankContainer}>
        <Text style={[styles.rank, { color: theme.colors.onSurface }]}>
          #{item.rank}
        </Text>
        {item.rankChange24h !== 'same' && (
           <View style={{ flexDirection: 'row', alignItems: 'center' }}>
             <MaterialCommunityIcon name={getRankChangeIcon()} color={getRankChangeColor()} size={14}/>
           </View>
        )}
      </View>
      <View style={styles.userInfo}>
        <Text
          style={[styles.name, { color: theme.colors.onSurface, fontWeight: isCurrentUser ? 'bold' : 'normal' }]}
          numberOfLines={1}
        >
          {item.name}
          <Text style={[styles.address, { color: theme.colors.outline }]}>
            {' '}({ellipsify(item.user_address)})
          </Text>
        </Text>
      </View>
      <View style={styles.scoreContainer}>
        <Text style={[styles.score, { color: profit > 0 ? 'green' : 'red', fontWeight: 'bold' }]}>
          {displayProfit} SOL
        </Text>
        <Text style={[styles.score, { fontSize: 12, color: theme.colors.outline, fontWeight: 'normal' }]}>
          ({item.degen_score} pts)
        </Text>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text style={{fontSize: 14}}>
            <Text style={{color: 'green'}}>{item.winningTrades} W</Text> / <Text style={{color: 'red'}}>{item.losingTrades} L</Text>
          </Text>
        </View>
      </View>
    </View>
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
    width: 90,
  },
  rank: {
    paddingRight: 6,
    fontWeight: "bold",
    fontSize: 16,
    lineHeight: 20,
  },
  rankChange: {
    fontSize: 12,
    fontWeight: "bold",
  },
  userInfo: {
    flex: 1,
    marginHorizontal: 0,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    lineHeight: 20,
  },
  address: {
    fontSize: 12,
    fontWeight: 'normal',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 16,
    lineHeight: 20,
  },
  trades: {
    fontSize: 12,
    color: 'grey',
  }
}); 