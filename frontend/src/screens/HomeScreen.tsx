import React, { useEffect, useState, useCallback } from "react";
import { ScrollView, StyleSheet, View, ActivityIndicator, Text, Linking, RefreshControl, Platform } from "react-native";
import { Text as PaperText, useTheme, Button, SegmentedButtons } from "react-native-paper";
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { getGlobalLeaderboard } from "../data/platforms/common-platform-access";
import { GlobalLeaderboardFeature } from "../components/leaderboard/GlobalLeaderboardFeature";
import { LeaderboardList } from "../components/leaderboard/LeaderboardList";
import { useAuthorization } from "../utils/useAuthorization";
import { SignInFeature } from "../components/sign-in/sign-in-feature";
import Constants from 'expo-constants';
import { HomeScreenNavigationProp } from "../navigators/HomeNavigator";
import ShimmerTitle from "../components/gyro-title/GyroTitle";
import { GlowingCard } from "../components/card/GlowingCard";
// import { ellipsify } from "../../utils/ellipsify";

// Pour le test en web, on utilise une adresse mockée car la connexion n'est pas possible.
// const MOCK_USER_ADDRESS = "3Dimjf2UDeZvsSuUYU22ovZ6uvF8z6KUnXMmokQuYfi2";

export function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [sortBy, setSortBy] = useState('degen_score');
  const { selectedAccount } = useAuthorization();
  const userAddress = selectedAccount?.publicKey.toBase58();
  // const userAddress = MOCK_USER_ADDRESS;

  const API_ENDPOINT = Constants.expoConfig?.extra?.apiEndpoint;

  useEffect(() => {
    const registerUser = async () => {
      if (userAddress && API_ENDPOINT) {
        try {
          console.log(`Registering user ${userAddress}...`);
          const response = await fetch(`${API_ENDPOINT}/user/connect`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ address: userAddress }),
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to register user');
          }
          console.log("User registered or already exists.");
        } catch (error) {
          console.error("Error connecting user:", error);
        }
      }
    };

    registerUser();
  }, [userAddress, API_ENDPOINT]);

  const { data: leaderboardData, isLoading, isError, error, isRefetching } = useQuery({
    queryKey: ['globalLeaderboard', userAddress, sortBy],
    queryFn: () => getGlobalLeaderboard(userAddress, sortBy),
  });

  // On trouve les données de l'utilisateur courant dans le classement
  const currentUserData = leaderboardData?.find(entry => entry.user_address === userAddress);
  const currentUserIndex = leaderboardData?.findIndex(entry => entry.user_address === userAddress) ?? -1;
  const totalUsers = leaderboardData?.length || 0;

  // On prépare les données pour la section "Your Position"
  const yourPositionData = leaderboardData && currentUserIndex !== -1
    ? leaderboardData.slice(Math.max(0, currentUserIndex - 3), currentUserIndex + 4)
    : [];

  const onPostToX = async () => {
    if (!currentUserData) return;

    const text = `I'm rank #${currentUserData.rank} on DegenRank with a degen score of ${currentUserData.degen_score} points! See how you stack up. #DegenRank #Solana\n\nJoin me by downloading the app here: [LINK_TO_UPDATE]`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Failed to open URL:', error);
      // Vous pouvez décommenter cette ligne pour afficher une alerte à l'utilisateur
      // Alert.alert("Error", "Could not open Twitter. Please make sure the app is installed or try again.");
    }
  };

  const handleRefresh = useCallback(() => {
    // Implement refresh logic here
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    screenContentContainer: {
      padding: 16,
    },
    headerContainer: {
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 24,
    },
    cardContainer: {
      height: 200, // Hauteur fixe pour la scène 3D
      marginBottom: 24,
    },
    summaryContainer: {
      alignItems: 'center',
      paddingVertical: 20,
      borderRadius: 16, 
      backgroundColor: theme.colors.surface,
    },
    actionButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 24,
    },
    actionButton: {
      flex: 1,
      marginHorizontal: 8,
    },
    postToXButton: {
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    signInContainer: {
      paddingVertical: 32,
      alignItems: 'center',
    },
    leaderboardHeader: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontWeight: 'bold',
      textAlign: 'center',
      // Effet de lueur sur le texte, plus subtil
      textShadowColor: theme.colors.primary,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 5,
    },
    segmentedButtonsContainer: {
      marginBottom: 16,
    },
    leaderboardContainer: {
      // Le style du conteneur du classement
    },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.screenContentContainer}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />}
    >
      <View style={styles.headerContainer}>
        <ShimmerTitle>DegenRank</ShimmerTitle>
      </View>

      {isLoading && <ActivityIndicator size="large" />}
      
      {isError && <Text>Error loading data. {error.message}</Text>}

      {leaderboardData && (
        <>
          {/* Section Résumé Utilisateur - Conditionnelle */}
          {userAddress && currentUserData && (
            <>
              <View style={styles.cardContainer}>
                <GlowingCard>
                  <PaperText variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>
                    {currentUserData?.degen_score ?? '--'} pts
                  </PaperText>
                  <PaperText variant="titleMedium" style={{ color: theme.colors.onSurface, marginTop: 4 }}>
                    Rank: {currentUserData?.rank ?? 'N/A'} / {totalUsers}
                  </PaperText>
                </GlowingCard>
              </View>
              <View style={styles.actionButtonsContainer}>
                <Button 
                  icon="chart-line" 
                  mode="contained-tonal" 
                  onPress={() => navigation.navigate('Details', { userAddress: userAddress })}
                  style={styles.actionButton}
                >
                  My Stats
                </Button>
                <Button 
                  icon="twitter" 
                  mode="contained-tonal" 
                  onPress={onPostToX}
                  style={[styles.actionButton, styles.postToXButton]}
                  disabled={!currentUserData}
                >
                  Post to X
                </Button>
              </View>
            </>
          )}

          {/* Si non connecté, afficher les boutons de connexion */}
          {!userAddress && !isLoading && (
            <View style={styles.signInContainer}>
              <PaperText variant="bodyLarge" style={{textAlign: 'center', marginBottom: 16}}>
                Connect your wallet to see your rank and position.
              </PaperText>
              <SignInFeature />
            </View>
          )}

          <View style={styles.leaderboardHeader}>
            <PaperText variant="headlineSmall" style={styles.sectionTitle}>
              Leaderboard
            </PaperText>
          </View>
          
          <SegmentedButtons
            value={sortBy}
            onValueChange={setSortBy}
            style={{ marginBottom: 16 }}
            buttons={[
              { value: 'degen_score', label: 'Score' },
              { value: 'pnl', label: 'PNL (SOL)' },
              { value: 'win_rate', label: 'Win Rate' },
            ]}
          />

          {/* Liste du classement global (Top 10) - Toujours visible */}
          <GlobalLeaderboardFeature data={leaderboardData?.slice(0, 10) ?? []} />

          {/* Section "Your Position" - Conditionnelle */}
          {userAddress && currentUserData && (
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
          )}
        </>
      )}
    </ScrollView>
  );
}
