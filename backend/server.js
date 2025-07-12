const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const supabase = require('./lib/supabaseClient');
const { runWorker } = require('./worker'); // Importer la logique du worker renommée

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
    const { currentUser, sortBy } = req.query;
    console.log(`Leaderboard requested with sort by: ${sortBy}`);

    // Liste blanche des colonnes autorisées pour le tri
    const allowedSortColumns = {
        'degen_score': 'total_degen_score',
        'pnl': 'total_pnl_sol',
        'win_rate': 'win_rate'
    };
    // Par défaut, on trie par degen_score si le paramètre est invalide ou absent
    const sortColumn = allowedSortColumns[sortBy] || 'total_degen_score'; 

    try {
        const { data: cachedLeaderboard, error } = await supabase
            .from('degen_rank') // On interroge notre nouvelle vue
            .select('*')
            .order(sortColumn, { ascending: false }); // Tri dynamique

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

            // Étape cruciale : re-trier le classement par le critère de tri demandé
            cachedLeaderboard.sort((a, b) => (b[sortColumn] || 0) - (a[sortColumn] || 0));
            
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

// Route pour vérifier si un utilisateur existe
app.get('/user/:address/exists', async (req, res) => {
    const { address } = req.params;
  
    if (!address) {
      return res.status(400).json({ error: 'User address is required.' });
    }
  
    try {
      const { data, error } = await supabase
        .from('users')
        .select('address')
        .eq('address', address)
        .single(); // .single() retourne une erreur si aucune ligne n'est trouvée
  
      if (error) {
        // Cette erreur inclut le cas "PGRST116" (aucune ligne trouvée), ce qui est ce que nous voulons
        return res.status(404).json({ exists: false, message: 'User not found in the database.' });
      }
  
      if (data) {
        return res.status(200).json({ exists: true });
      }
    } catch (error) {
      console.error(`Error checking if user exists for address ${address}:`, error.message);
      res.status(500).json({ exists: false, error: 'An internal server error occurred.' });
    }
});

// Route pour l'enregistrement ou la connexion d'un utilisateur
app.post('/user/connect', async (req, res) => {
    const { address } = req.body;
  
    if (!address) {
      return res.status(400).json({ error: 'User address is required.' });
    }
  
    try {
      // Upsert pour éviter les doublons. 
      // Si l'adresse existe, rien ne se passe. Sinon, elle est insérée.
      const { data, error } = await supabase
        .from('users')
        .upsert({ address: address }, { onConflict: 'address' });
  
      if (error) {
        throw error;
      }
  
      console.log(`User connected successfully: ${address}.`);
      
      // Lancer le scan initial pour ce nouvel utilisateur en tâche de fond.
      // On n'utilise PAS 'await' pour que la réponse soit immédiate.
      console.log(`Initiating initial scan for address: ${address}`);
      runWorker(address);
  
      res.status(200).json({ message: 'User connected successfully.' });
  
    } catch (error) {
      console.error('Error in /user/connect:', error);
      res.status(500).json({ error: 'An internal server error occurred.' });
    }
  });


// --- ENDPOINT POUR LE CRON JOB ---
app.post('/api/cron/run-worker', (req, res) => {
    // Sécurisation de l'endpoint
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).send('Unauthorized');
    }
  
    // On lance la logique du worker en tâche de fond
    console.log("Cron job received. Worker logic initiated for all users.");
    runWorker() // Appel sans adresse pour le scan global
      .then(() => {
        console.log("BACKGROUND: Global worker scan completed successfully.");
        console.log("BACKGROUND: Attempting to update trades_updated_at timestamp...");
        // Mise à jour du timestamp dans la nouvelle table et colonne
        return supabase
          .from('system_status')
          .update({ trades_updated_at: new Date().toISOString() })
          .eq('id', true)
          .select(); // Ajouter .select() pour que Supabase retourne la ligne mise à jour
      })
      .then((response) => {
        // La réponse de Supabase contient { data, error }
        if (response.error) {
          console.error("BACKGROUND: Supabase update failed!", response.error);
        } else {
          console.log("BACKGROUND: trades_updated_at timestamp updated successfully.");
          console.log("BACKGROUND: Updated data:", response.data);
        }
      })
      .catch(err => {
        // Ce catch interceptera maintenant les erreurs venant de runWorker()
        console.error("BACKGROUND: Worker process failed and timestamp was NOT updated.", err);
      });
  
    res.status(202).send('Accepted: Worker process started.');
});


// Route pour récupérer le statut du système (timestamps de mise à jour)
app.get('/status', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('system_status')
            .select('trades_updated_at, leaderboard_updated_at')
            .eq('id', true)
            .single(); // Il n'y a qu'une seule ligne

        if (error) throw error;

        res.status(200).json(data);

    } catch (error) {
        console.error('Error fetching system status:', error.message);
        res.status(500).json({ error: 'Failed to fetch system status' });
    }
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// --- ANCIENNE LOGIQUE DE WORKER AUTONOME MISE EN COMMENTAIRE ---
// setInterval(async () => {
//     console.log('--- Starting periodic worker logic ---');
//     try {
//         await runWorkerLogic();
//         console.log('--- Finished periodic worker logic ---');
//     } catch (error) {
//         console.error('Error during periodic worker execution:', error);
//     }
// }, 10 * 60 * 1000); // Toutes les 10 minutes 