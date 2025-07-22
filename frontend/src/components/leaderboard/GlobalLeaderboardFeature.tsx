import React from "react";
import { View } from "react-native";
import { LeaderboardList } from "./LeaderboardList";
import { LeaderboardEntry } from "../../data/platforms/common-platform-access";

interface GlobalLeaderboardFeatureProps {
  data: LeaderboardEntry[];
  sortBy?: string; // Nouveau prop pour le mode de tri
  showRankChange?: boolean;
}

export function GlobalLeaderboardFeature({ data, sortBy = 'degen_score', showRankChange = true }: GlobalLeaderboardFeatureProps) {
  return (
    <View>
      <LeaderboardList data={data} sortBy={sortBy} showRankChange={showRankChange} />
    </View>
  );
}