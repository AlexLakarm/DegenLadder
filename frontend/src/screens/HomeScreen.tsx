import React from "react";
import { ScrollView, StyleSheet, View, ActivityIndicator, Text } from "react-native";
import { Text as PaperText, useTheme } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { getGlobalLeaderboard } from "../data/platforms/common-platform-access";
import { GlobalLeaderboardFeature } from "../components/leaderboard/GlobalLeaderboardFeature";
import { LeaderboardList } from "../components/leaderboard/LeaderboardList";
// import { useAuthorization } from "../utils/useAuthorization";
import { SignInFeature } from "../components/sign-in/sign-in-feature";

// Pour le test en web, on utilise une adresse mockée car la connexion n'est pas possible.
const MOCK_USER_ADDRESS = "3Dimjf2UDeZvsSuUYU22ovZ6uvF8z6KUnXMmokQuYfi2";

export function HomeScreen() {
  const theme = useTheme();
  // const { selectedAccount } = useAuthorization();
  // const userAddress = selectedAccount?.publicKey.toBase58();
  const userAddress = MOCK_USER_ADDRESS;

  const { data: leaderboardData, isLoading, isError } = useQuery({
    queryKey: ['globalLeaderboard'],
    queryFn: getGlobalLeaderboard,
  });

  // On trouve les données de l'utilisateur courant dans le classement
  const currentUserData = leaderboardData?.find(entry => entry.user_address === userAddress);
  const currentUserIndex = leaderboardData?.findIndex(entry => entry.user_address === userAddress) ?? -1;
  const totalUsers = leaderboardData?.length || 0;

  // On prépare les données pour la section "Your Position"
  const yourPositionData = leaderboardData && currentUserIndex !== -1
    ? leaderboardData.slice(Math.max(0, currentUserIndex - 3), currentUserIndex + 4)
    : [];

  return (
    <ScrollView style={styles.screenContainer}>
      <View style={styles.headerContainer}>
        <PaperText
          style={{ fontWeight: "bold", marginBottom: 12 }}
          variant="displaySmall"
        >
          DegenRank
        </PaperText>
      </View>

      {isLoading && <ActivityIndicator size="large" />}
      
      {isError && <Text>Error loading data.</Text>}

      {leaderboardData && (
        <>
          {/* Section Résumé Utilisateur - Toujours visible pour le test */}
          <View style={[styles.summaryContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
            <PaperText variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurfaceVariant }}>
              {currentUserData?.degen_score ?? '--'} pts
            </PaperText>
            <PaperText variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Rank: {currentUserData?.rank ?? 'N/A'} / {totalUsers}
            </PaperText>
          </View>

          {/* Titre Leaderboard */}
          <PaperText variant="headlineSmall" style={styles.sectionTitle}>
            Leaderboard
          </PaperText>

          {/* Liste du classement global (Top 10) - Toujours visible */}
          <GlobalLeaderboardFeature data={leaderboardData.slice(0, 10)} />

          {/* Section "Your Position" - Toujours visible pour le test */}
          <>
            {/* Titre Your Position */}
            <PaperText variant="headlineSmall" style={styles.sectionTitle}>
              Your Position
            </PaperText>

            {/* Section de la position de l'utilisateur */}
            {yourPositionData.length > 0 ? (
              <LeaderboardList data={yourPositionData} currentUserAddress={userAddress} />
            ) : (
              <Text style={{textAlign: 'center', marginVertical: 20}}>
                Your rank will appear here once you start trading.
              </Text>
            )}
          </>
        </>
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
  },
  summaryContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 16,
  },
  signInContainer: {
    alignItems: 'center',
    marginVertical: 40,
  }
});
