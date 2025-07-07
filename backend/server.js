const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const supabase = require('./lib/supabaseClient');
const { runWorkerLogic } = require('./worker'); // Importer la logique du worker

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // Activation de CORS pour toutes les routes
app.use(express.json());

// Helper function pour calculer le rang d'un utilisateur en temps réel
async function calculateUserRank(userAddress) {
  let totalDegenScore = 0;
  let totalPnlSol = 0;
  let totalWins = 0;
  let totalLosses = 0;

  for (const platform of ['pump', 'bonk']) {
    const tableName = `trades_${platform}`;
    const { data, error } = await supabase
      .from(tableName)
      .select('degen_score, pnl_sol, status')
      .eq('user_address', userAddress);

    if (error) {
      console.error(`Error fetching user data from ${tableName} for rank calculation:`, error);
      continue;
    }

    if (data) {
      data.forEach(trade => {
        totalDegenScore += trade.degen_score;
        totalPnlSol += trade.pnl_sol;
        if (trade.status === 'WIN') {
          totalWins++;
        } else {
          totalLosses++;
        }
      });
    }
  }

  return {
    user_address: userAddress,
    total_degen_score: totalDegenScore,
    total_pnl_sol: totalPnlSol,
    total_wins: totalWins,
    total_losses: totalLosses,
  };
}

// Route pour récupérer le classement global depuis la vue
app.get('/leaderboard/global', async (req, res) => {
    const { currentUser } = req.query;

    try {
        const { data: cachedLeaderboard, error } = await supabase
            .from('degen_rank') // On interroge notre nouvelle vue
            .select('*');

        if (error) {
            throw error;
        }

        if (currentUser) {
            console.log(`Fetching fresh data for user: ${currentUser}`);
            const currentUserFreshData = await calculateUserRank(currentUser);
            
            // On cherche si l'utilisateur est déjà dans le classement cache
            const userIndex = cachedLeaderboard.findIndex(u => u.user_address === currentUser);
            
            if (userIndex !== -1) {
                // Si oui, on met à jour ses données
                cachedLeaderboard[userIndex] = { ...cachedLeaderboard[userIndex], ...currentUserFreshData };
            } else {
                // Sinon (nouvel utilisateur), on l'ajoute
                cachedLeaderboard.push(currentUserFreshData);
            }

            // Étape cruciale : re-trier le classement par score
            cachedLeaderboard.sort((a, b) => b.total_degen_score - a.total_degen_score);
            
            // Et on ré-attribue les rangs
            const finalLeaderboard = cachedLeaderboard.map((user, index) => ({
                ...user,
                rank: index + 1
            }));
            
            return res.status(200).json(finalLeaderboard);
        }

        res.status(200).json(cachedLeaderboard);

    } catch (error) {
        console.error('Error fetching global leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch global leaderboard' });
    }
});

// Route pour récupérer le leaderboard d'une plateforme
app.get('/leaderboard/:platform', async (req, res) => {
    const { platform } = req.params;
    const validPlatforms = ['pump', 'bonk'];

    if (!validPlatforms.includes(platform)) {
        return res.status(400).json({ error: 'Invalid platform specified.' });
    }

    const tableName = `trades_${platform}`;

    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            // On trie désormais par le degen_score, du plus haut au plus bas
            .order('degen_score', { ascending: false });

        if (error) {
            // "throw error" enverra au bloc catch
            throw error;
        }

        res.status(200).json(data);

    } catch (error) {
        console.error(`Error fetching leaderboard from ${tableName}:`, error.message);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

// Route pour récupérer les statistiques d'un utilisateur
app.get('/user/:userAddress/stats', async (req, res) => {
    const { userAddress } = req.params;
    const platforms = ['pump', 'bonk'];
    const stats = {};

    try {
        for (const platform of platforms) {
            const tableName = `trades_${platform}`;
            const { data, error } = await supabase
                .from(tableName)
                // On sélectionne pnl_sol et status pour déterminer win/loss
                .select('pnl_sol, status')
                .eq('user_address', userAddress);

            if (error) {
                console.error(`Error fetching user stats from ${tableName} for ${userAddress}:`, error.message);
                continue; 
            }

            if (data && data.length > 0) {
                // On se base sur le champ 'status' qui vient de la DB
                const wins = data.filter(d => d.status === 'WIN').length;
                const losses = data.length - wins;
                const totalPnl = data.reduce((acc, curr) => acc + curr.pnl_sol, 0);

                stats[platform] = {
                    wins,
                    losses,
                    pnl: totalPnl // C'est maintenant le pnl en SOL
                };
            } else {
                stats[platform] = { wins: 0, losses: 0, pnl: 0 };
            }
        }

        res.status(200).json(stats);
        
    } catch (error) {
        console.error(`An unexpected error occurred while fetching user stats for ${userAddress}:`, error.message);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

// Route pour récupérer l'historique des trades d'un utilisateur
app.get('/user/:userAddress/history', async (req, res) => {
    const { userAddress } = req.params;
    const platforms = ['pump', 'bonk'];
    let history = [];

    try {
        for (const platform of platforms) {
            const tableName = `trades_${platform}`;
            const { data, error } = await supabase
                .from(tableName)
                .select('token_mint, pnl_sol, status, last_sell_at')
                .eq('user_address', userAddress);

            if (error) {
                console.error(`Error fetching user history from ${tableName} for ${userAddress}:`, error.message);
                continue;
            }

            if (data) {
                const platformData = data.map(trade => ({ 
                    ...trade, 
                    platform: trade.platform || platform,
                    is_win: trade.status === 'WIN',
                    token_name: trade.token_mint, // On unifie le nom
                }));
                history.push(...platformData);
            }
        }

        // Trier par la date de vente, du plus récent au plus ancien
        history.sort((a, b) => new Date(b.last_sell_at) - new Date(a.last_sell_at));

        const recentHistory = history.slice(0, 20);

        res.status(200).json(recentHistory);

    } catch (error) {
        console.error(`An unexpected error occurred while fetching user history for ${userAddress}:`, error.message);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

// Nouvelle route pour gérer la connexion d'un utilisateur
app.post('/user/connect', async (req, res) => {
  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'User address is required' });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({ address: address }, { onConflict: 'address' });

    if (error) {
      // Gérer les erreurs potentielles de la base de données
      console.error('Supabase error on user connect:', error.message);
      return res.status(500).json({ error: 'Failed to save user address' });
    }

    res.status(200).json({ message: 'User connected successfully' });
  } catch (error) {
    console.error('Server error on user connect:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// Nouvelle route pour le cron job
app.post('/api/cron/run-worker', async (req, res) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET is not set in environment variables.");
    return res.status(500).json({ error: 'Internal server configuration error' });
  }
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // On n'attend pas la fin du worker pour répondre, car il peut être long.
    // Le cron job n'a besoin que de savoir si la tâche a bien été lancée.
    runWorkerLogic();
    res.status(202).json({ message: 'Worker logic initiated.' });
  } catch (error) {
    console.error('Failed to initiate worker logic:', error);
    res.status(500).json({ error: 'Failed to start worker logic' });
  }
});

app.listen(port, () => {
    console.log(`API Server listening on port ${port}`);
}); 