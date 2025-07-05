// L'API Key Helius n'est plus nécessaire ici
// const HELIUS_API_KEY = ...

// INTERFACES MISES À JOUR
export interface LeaderboardEntry {
  rank: number;
  rankChange24h: 'up' | 'down' | 'same'; // Pour l'instant, on laisse 'same'
  user_address: string;
  name: string; // On le construira côté client
  pnl_sol: number;
  status: 'WIN' | 'LOSS';
  // On peut ajouter d'autres champs si nécessaire
  winningTrades?: number; // Ces champs ne sont plus directement dans la réponse principale
  losingTrades?: number;  // On pourrait les calculer ou les ajouter à l'API plus tard
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
    const userStats: { [address: string]: { totalPnl: number; wins: number; losses: number; }} = {};

    dataFromApi.forEach((trade: any) => {
        if (!userStats[trade.user_address]) {
            userStats[trade.user_address] = { totalPnl: 0, wins: 0, losses: 0 };
        }
        userStats[trade.user_address].totalPnl += trade.pnl_sol;
        if(trade.status === 'WIN') {
            userStats[trade.user_address].wins++;
        } else {
            userStats[trade.user_address].losses++;
        }
    });

    // Trier les utilisateurs par PnL total
    const sortedUsers = Object.keys(userStats).sort((a, b) => userStats[b].totalPnl - userStats[a].totalPnl);

    // Créer le leaderboard final
    const finalLeaderboard: LeaderboardEntry[] = sortedUsers.map((address, index) => ({
      rank: index + 1,
      rankChange24h: 'same',
      user_address: address,
      name: `User ${address.substring(0, 4)}...`,
      pnl_sol: userStats[address].totalPnl,
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