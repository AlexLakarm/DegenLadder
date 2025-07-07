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
}

export function LeaderboardItem({ item, isCurrentUser = false }: LeaderboardItemProps) {
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

  return (
    <TouchableOpacity onPress={handlePress} style={containerStyle}>
      <View style={styles.rankContainer}>
        <Text style={[styles.rank, { color: theme.colors.onSurface }]}>
          #{item.rank}
        </Text>
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
        <Text style={[styles.score, { color: theme.colors.onSurface, fontWeight: 'bold' }]}>
          {item.degen_score} pts
        </Text>
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
    width: 60,
  },
  rank: {
    fontWeight: "bold",
    fontSize: 16,
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