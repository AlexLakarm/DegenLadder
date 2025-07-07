import Constants from 'expo-constants';

// L'API Key Helius n'est plus nécessaire ici
// const HELIUS_API_KEY = ...

// INTERFACES MISES À JOUR
export interface LeaderboardEntry {
  rank: number;
  rankChange24h: 'up' | 'down' | 'same'; // Pour l'instant, on laisse 'same'
  user_address: string;
  name: string; // On le construira côté client
  pnl_sol: number;
  degen_score: number; // Ajout du degen_score
  status: 'WIN' | 'LOSS';
  // On peut ajouter d'autres champs si nécessaire
  winningTrades: number; // Ces champs ne sont plus directement dans la réponse principale
  losingTrades: number;  // On pourrait les calculer ou les ajouter à l'API plus tard
}

// L'ancienne interface PlatformActivity n'est plus utilisée
/*
export interface PlatformActivity {
  ...
}
*/

// On ne garde que la fonction principale qui appelle l'API
export async function getLeaderboardFromApi(platform: 'pump' | 'bonk'): Promise<LeaderboardEntry[]> {
  // Pour le développement, on pointe vers localhost.
  // Pour la production, ce sera l'URL de notre serveur déployé.
  const API_URL = `http://localhost:3000/leaderboard/${platform}`;

  console.log(`Fetching leaderboard for "${platform}" from API: ${API_URL}`);

  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API returned an error: ${errorData.error || response.statusText}`);
    }

    const dataFromApi = await response.json();

    // L'API renvoie les données brutes. On les transforme en LeaderboardEntry.
    const leaderboard: LeaderboardEntry[] = dataFromApi.map((entry: any, index: number) => {
      // Calcul du nombre de trades gagnants/perdants si nécessaire.
      // Pour l'instant, on se base sur les données de l'API.
      // Ici, on va devoir regrouper par `user_address` pour calculer le W/L ratio total.
      return {
        ...entry, // Copie les champs comme user_address, pnl_sol, status
        rank: index + 1,
        name: `User ${entry.user_address.substring(0, 4)}...`,
        rankChange24h: 'same',
      };
    });
    
    // Après avoir mappé, nous devons agréger les résultats par utilisateur.
    const userStats: { [address: string]: { totalPnl: number; totalDegenScore: number; wins: number; losses: number; }} = {};

    dataFromApi.forEach((trade: any) => {
        if (!userStats[trade.user_address]) {
            userStats[trade.user_address] = { totalPnl: 0, totalDegenScore: 0, wins: 0, losses: 0 };
        }
        userStats[trade.user_address].totalPnl += trade.pnl_sol;
        userStats[trade.user_address].totalDegenScore += trade.degen_score; // On somme les scores
        if(trade.status === 'WIN') {
            userStats[trade.user_address].wins++;
        } else {
            userStats[trade.user_address].losses++;
        }
    });

    // Trier les utilisateurs par PnL total
    const sortedUsers = Object.keys(userStats).sort((a, b) => userStats[b].totalDegenScore - userStats[a].totalDegenScore);

    // Créer le leaderboard final
    const finalLeaderboard: LeaderboardEntry[] = sortedUsers.map((address, index) => ({
      rank: index + 1,
      rankChange24h: 'same',
      user_address: address,
      name: `User ${address.substring(0, 4)}...`,
      pnl_sol: userStats[address].totalPnl,
      degen_score: userStats[address].totalDegenScore, // On ajoute le score total
      winningTrades: userStats[address].wins,
      losingTrades: userStats[address].losses,
      status: userStats[address].totalPnl > 0 ? 'WIN' : 'LOSS', // Status global
    }));


    console.log(`Successfully fetched and processed ${finalLeaderboard.length} leaderboard entries.`);
    return finalLeaderboard;

  } catch (error) {
    console.error(`Failed to fetch leaderboard from API for "${platform}":`, error);
    // Retourner un tableau vide en cas d'erreur pour que l'UI ne crashe pas.
    return [];
  }
} 

// Nouvelle fonction pour le classement global
export async function getGlobalLeaderboard(currentUserAddress?: string, sortBy: string = 'degen_score'): Promise<LeaderboardEntry[]> {
  try {
    const API_ENDPOINT = Constants.expoConfig?.extra?.apiEndpoint;
    if (!API_ENDPOINT) {
      throw new Error("API endpoint is not configured");
    }

    let API_URL = `${API_ENDPOINT}/leaderboard/global?sortBy=${sortBy}`;
    if (currentUserAddress) {
      API_URL += `&currentUser=${currentUserAddress}`;
    }

    const response = await fetch(API_URL);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const dataFromApi = await response.json();
    
    // La vue SQL nous donne la plupart des champs, on doit juste les mapper correctement
    const leaderboard: LeaderboardEntry[] = dataFromApi.map((entry: any) => ({
      rank: entry.rank,
      user_address: entry.user_address,
      name: `User ${entry.user_address.substring(0, 4)}...`,
      pnl_sol: entry.total_pnl_sol,
      degen_score: entry.total_degen_score,
      winningTrades: entry.total_wins,
      losingTrades: entry.total_losses,
      rankChange24h: 'same', // Logique à ajouter plus tard
      status: entry.total_pnl_sol > 0 ? 'WIN' : 'LOSS',
    }));

    return leaderboard;

  } catch (error) {
    console.error("Failed to fetch global leaderboard from API:", error);
    throw error;
  }
}