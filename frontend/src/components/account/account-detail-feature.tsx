import { Linking, View } from "react-native";
import { useTheme } from "react-native-paper";
import { useAuthorization } from "../../utils/useAuthorization";
import { mockLeaderboard } from "../../data/mock-leaderboard";

import {
  AccountInfo,
  AccountActions,
} from "./account-ui";
import { ellipsify } from "../../utils/ellipsify";
import { currentUserAddress } from "../../data/mock-leaderboard";

type AccountDetailFeatureProps = {
  isConnected: boolean;
};

export function AccountDetailFeature({
  isConnected,
}: AccountDetailFeatureProps) {

  const currentUser = mockLeaderboard.find(
    (u) => u.address === currentUserAddress
  );

  if (!isConnected || !currentUser) {
    return null;
  }

  const handleShare = () => {
    const text = `I'm ranked #${currentUser.rank} on DegenRank! Check out my profile on degenrank.xyz. #degenrank`;
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch((err) =>
      console.error("Failed to open URL:", err)
    );
  };

  return (
    <View>
      <AccountInfo
        address={ellipsify(currentUser.address)}
        rank={currentUser.rank}
        totalProfit={currentUser.totalProfit}
        winningTrades={currentUser.winningTrades}
        losingTrades={currentUser.losingTrades}
        rankChange24h={currentUser.rankChange24h}
      />
      <AccountActions onShare={handleShare} />
    </View>
  );
}
