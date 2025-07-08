import React from "react";
import { View } from "react-native";
import { LeaderboardList } from "./LeaderboardList";
import { LeaderboardEntry } from "../../data/platforms/common-platform-access";

interface GlobalLeaderboardFeatureProps {
  data: LeaderboardEntry[];
}

export function GlobalLeaderboardFeature({ data }: GlobalLeaderboardFeatureProps) {
  return (
    <View>
      <LeaderboardList data={data} />
    </View>
  );
}