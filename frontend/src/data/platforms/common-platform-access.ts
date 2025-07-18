import Constants from 'expo-constants';
import { LeaderboardEntry } from './types';

export const API_ENDPOINT = Constants.expoConfig?.extra?.apiEndpoint;

// L'API Key Helius n'est plus nécessaire ici
// const HELIUS_API_KEY = ...

const getApiUrl = (platform: 'pump' | 'bonk') => {
  const endpoint = API_ENDPOINT;
  if (!endpoint) {
    // Pour le développement local en web, on peut utiliser une valeur par défaut.
    // Attention: ceci ne marchera pas pour le mobile natif.
    if (process.env.NODE_ENV === 'development') {
      console.warn("API endpoint not found in app.json, using localhost as fallback for web development.");
      return `http://localhost:3000/leaderboard/${platform}`;
    }
    throw new Error('API endpoint is not defined in app.json extras.');
  }
  return `${endpoint}/leaderboard/${platform}`;
};


export const getLeaderboardFromApi = async (platform: 'pump' | 'bonk'): Promise<LeaderboardEntry[]> => {
  const API_URL = getApiUrl(platform);

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
};

// Fonction pour récupérer l'évolution du rang d'un utilisateur
async function getRankEvolution(userAddress: string): Promise<{ evolution: number; evolutionType: 'up' | 'down' | 'same' }> {
  try {
    if (!API_ENDPOINT) {
      throw new Error("API endpoint is not configured");
    }

    const response = await fetch(`${API_ENDPOINT}/user/${userAddress}/rank-evolution`);
    
    if (!response.ok) {
      // Si l'utilisateur n'est pas trouvé ou autre erreur, on retourne 'same'
      return { evolution: 0, evolutionType: 'same' as const };
    }

    const data = await response.json();
    return { 
      evolution: data.evolution, 
      evolutionType: data.evolutionType 
    };
  } catch (error) {
    console.error(`Failed to fetch rank evolution for ${userAddress}:`, error);
    return { evolution: 0, evolutionType: 'same' as const };
  }
}

// Nouvelle fonction pour le classement global
export async function getGlobalLeaderboard(currentUserAddress?: string, sortBy: string = 'degen_score'): Promise<LeaderboardEntry[]> {
  try {
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
    
    // Créer le leaderboard de base
    const leaderboard: LeaderboardEntry[] = dataFromApi.map((entry: any) => ({
      rank: entry.rank,
      user_address: entry.user_address,
      name: `User ${entry.user_address.substring(0, 4)}...`,
      pnl_sol: entry.total_pnl_sol,
      degen_score: entry.total_degen_score,
      winningTrades: entry.total_wins,
      losingTrades: entry.total_losses,
      rankChange24h: 'same', // Valeur par défaut
      status: entry.total_pnl_sol > 0 ? 'WIN' : 'LOSS',
    }));

    // Récupérer l'évolution du rang pour chaque utilisateur (limité aux 20 premiers pour les performances)
    const topUsers = leaderboard.slice(0, 20);
    const evolutionPromises = topUsers.map(async (entry) => {
      const evolution = await getRankEvolution(entry.user_address);
      return {
        userAddress: entry.user_address,
        evolution: evolution.evolution,
        evolutionType: evolution.evolutionType
      };
    });

    const evolutions = await Promise.all(evolutionPromises);
    
    // Mettre à jour le leaderboard avec les évolutions
    leaderboard.forEach(entry => {
      const evolution = evolutions.find(e => e.userAddress === entry.user_address);
      if (evolution) {
        entry.rankChange24h = evolution.evolutionType === 'same' ? 'same' : evolution.evolution;
      }
    });

    return leaderboard;

  } catch (error) {
    console.error("Failed to fetch global leaderboard from API:", error);
    throw error;
  }
} 