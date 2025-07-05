import React from "react";
import { ScrollView, StyleSheet, View, Platform } from "react-native";
import { Text } from "react-native-paper";

import { Section } from "../Section";
import { useAuthorization } from "../utils/useAuthorization";
import { AccountDetailFeature } from "../components/account/account-detail-feature";
import { SignInFeature } from "../components/sign-in/sign-in-feature";
import { LeaderboardFeature } from "../components/leaderboard/LeaderboardFeature";
import { GyroTitle } from "../components/gyro-title/GyroTitle";

// --- DEV ONLY ---
// Set this to true to force the "connected" view on the web for UI development
const FORCE_CONNECTED_VIEW = true;
// ----------------

export function HomeScreen() {
  const { selectedAccount } = useAuthorization();

  // On web, we can force the connected view for development
  const isConnected = !!selectedAccount || (Platform.OS === 'web' && FORCE_CONNECTED_VIEW);

  return (
    <ScrollView style={styles.screenContainer}>
      {Platform.OS === 'web' ? (
        <View style={styles.headerContainer}>
          <Text
            style={{ fontWeight: "bold", marginBottom: 12 }}
            variant="displaySmall"
          >
            DegenRank
          </Text>
        </View>
      ) : (
        <GyroTitle />
      )}
      {isConnected ? (
        <>
          <AccountDetailFeature isConnected={isConnected} />
          <LeaderboardFeature />
        </>
      ) : (
        <SignInFeature />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    padding: 16,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 16,
  }
});
