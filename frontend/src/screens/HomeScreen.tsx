import React, { useEffect, useState, useCallback } from "react";
import { ScrollView, StyleSheet, View, ActivityIndicator, Text, Linking, RefreshControl } from "react-native";
import { Text as PaperText, useTheme, Button, SegmentedButtons } from "react-native-paper";
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { getGlobalLeaderboard } from "../data/platforms/common-platform-access";
import { LeaderboardList } from "../components/leaderboard/LeaderboardList";
import { useAuthorization } from "../utils/useAuthorization";
import { SignInFeature } from "../components/sign-in/sign-in-feature";
import Constants from 'expo-constants';
import { HomeNavigationProp } from "../navigators/HomeNavigator";
import AppTitle from "../components/gyro-title/AppTitle";
import { GlowingCard } from "../components/card/GlowingCard";
import { SearchUserFeature } from "../components/search/SearchUserFeature";
import { ellipsify } from "../utils/ellipsify";
import { GlobalLeaderboardFeature } from "../components/leaderboard/GlobalLeaderboardFeature";

// Pour le test en web, on utilise une adresse mockée car la connexion n'est pas possible.
// const MOCK_USER_ADDRESS = "3Dimjf2UDeZvsSuUYU22ovZ6uvF8z6KUnXMmokQuYfi2";

export function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<HomeNavigationProp>();
  const [sortBy, setSortBy] = useState('degen_score');
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0); // Nouveau state pour la pagination
  const { selectedAccount } = useAuthorization();
  const userAddress = selectedAccount?.publicKey.toBase58();

  const API_ENDPOINT = Constants.expoConfig?.extra?.apiEndpoint;

  // Constantes pour la pagination
  const ITEMS_PER_PAGE = 10;

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
            body: JSON.stringify({ userAddress: userAddress }),
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

  // On trouve l'utilisateur courant dans le classement
  const currentUserData = leaderboardData?.find(entry => entry.user_address === userAddress);
  const currentUserIndex = leaderboardData?.findIndex(entry => entry.user_address === userAddress) ?? -1;
  const totalUsers = leaderboardData?.length || 0;

  // On prépare les données pour la section "Your Position"
  const yourPositionData = leaderboardData && currentUserIndex !== -1
    ? leaderboardData.slice(Math.max(0, currentUserIndex - 3), currentUserIndex + 4)
    : [];

  // On prépare les données pour la section du résultat de recherche
  const searchedUserIndex = searchQuery ? leaderboardData?.findIndex(entry => entry.user_address === searchQuery) ?? -1 : -1;
  const searchResultData = leaderboardData && searchedUserIndex !== -1
    ? leaderboardData.slice(Math.max(0, searchedUserIndex - 3), searchedUserIndex + 4)
    : [];
    
  const onPostToX = async () => {
    if (!currentUserData) return;

    const text = `I'm rank #${currentUserData.rank} on DegenLadder with a degen score of ${currentUserData.degen_score} points! See how you stack up. #DegenLadder #Solana\n\nJoin me by downloading the app here: [LINK_TO_UPDATE]`;
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

  // Logique de pagination
  const totalPages = leaderboardData ? Math.ceil(leaderboardData.length / ITEMS_PER_PAGE) : 0;
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPageData = leaderboardData ? leaderboardData.slice(startIndex, endIndex) : [];

  // Fonctions de navigation
  const goToPage = (page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Reset à la page 0 quand on change de tri ou de recherche
  useEffect(() => {
    setCurrentPage(0);
  }, [sortBy, searchQuery]);

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
      color: theme.colors.onSurface, // On utilise la couleur standard du thème
      // On retire l'effet de lueur verte
      // textShadowColor: theme.colors.primary,
      // textShadowOffset: { width: 0, height: 0 },
      // textShadowRadius: 5,
    },
    segmentedButtonsContainer: {
      marginBottom: 16,
    },
    leaderboardContainer: {
      // Le style du conteneur du classement
    },
    disclaimerContainer: {
      marginTop: 32,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    disclaimerText: {
      fontSize: 12,
      color: '#a1a1aa', // zinc-400
      textAlign: 'center',
      lineHeight: 18,
    },
    paginationContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 16,
      gap: 8,
    },
    paginationInfo: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      marginHorizontal: 16,
    },
    pageButton: {
      minWidth: 40,
    },
    winRateInfo: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      fontStyle: 'italic',
      marginBottom: 8,
    },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.screenContentContainer}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />}
    >
      <View style={styles.headerContainer}>
        <AppTitle>DegenLadder</AppTitle>
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
            <SearchUserFeature onUserFound={setSearchQuery} />
          </View>
          
          {searchQuery && (
            <Button 
              icon="close-circle-outline" 
              mode="text" 
              onPress={() => setSearchQuery(null)}
              style={{ marginBottom: 10 }}
            >
              Clear search for "{ellipsify(searchQuery)}"
            </Button>
          )}

          <SegmentedButtons
            value={sortBy}
            onValueChange={setSortBy}
            style={{ marginBottom: 16 }}
            buttons={[
              { value: 'degen_score', label: 'Score' },
              { value: 'pnl', label: 'PNL (SOL)' },
              { value: 'win_rate', label: 'Win Rate *' },
            ]}
          />

          {/* Message d'information pour Win Rate */}
          {sortBy === 'win_rate' && (
            <Text style={styles.winRateInfo}>
              * Minimum 10 trades required to appear in this ranking
            </Text>
          )}

          {/* Leaderboard avec pagination */}
          <GlobalLeaderboardFeature data={currentPageData} sortBy={sortBy} />

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={styles.paginationContainer}>
              <Button
                icon="chevron-left"
                mode="outlined"
                onPress={goToPreviousPage}
                disabled={currentPage === 0}
                style={styles.pageButton}
              >
                Préc
              </Button>
              
              <Text style={styles.paginationInfo}>
                Page {currentPage + 1} sur {totalPages}
              </Text>
              
              <Button
                icon="chevron-right"
                mode="outlined"
                onPress={goToNextPage}
                disabled={currentPage === totalPages - 1}
                style={styles.pageButton}
              >
                Suiv
              </Button>
            </View>
          )}

          {/* My Position (autour de l'utilisateur connecté) */}
          {userAddress && currentUserData && (
            <>
              <PaperText variant="headlineSmall" style={[styles.sectionTitle, { marginTop: 32 }]}>My Position</PaperText>
              <LeaderboardList data={leaderboardData.slice(Math.max(0, leaderboardData.findIndex(entry => entry.user_address === userAddress) - 3), leaderboardData.findIndex(entry => entry.user_address === userAddress) + 4)} currentUserAddress={userAddress} sortBy={sortBy} />
            </>
          )}

          {/* Disclaimer Section */}
          <View style={styles.disclaimerContainer}>
            <Text style={styles.disclaimerText}>
              Disclaimer: The information provided in this application is for informational purposes only and does not constitute financial advice. All data is sourced from the public Solana blockchain. Trading cryptocurrencies involves significant risk.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}
