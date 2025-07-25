const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const supabase = require('../lib/supabaseClient');
const { runWorker } = require('../worker'); // Importer la logique du worker renommée

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // Activation de CORS pour toutes les routes
app.use(express.json());

// Définir la route cron pour accepter les requêtes GET
app.get('/api/cron', async (req, res) => {
  console.log('Cron job started via GET request. Awaiting worker completion...');
  try {
    // Attendre la fin de l'exécution du worker.
    // C'est essentiel pour que Vercel ne tue pas le processus.
    await runWorker();
    
    // Une fois le worker terminé avec succès, mettre à jour le timestamp.
    const { error: updateError } = await supabase
      .from('metadata')
      .update({ trades_updated_at: new Date().toISOString() })
      .eq('id', 1);

    if (updateError) {
      console.error('Error updating trades_updated_at:', updateError);
      // Ne pas bloquer la réponse pour une erreur de timestamp
    } else {
      console.log('Successfully updated trades_updated_at timestamp.');
    }

    res.status(200).send('OK: Cron job finished successfully.');
  } catch (error) {
    console.error('Error during cron job execution:', error);
    res.status(500).send(`Server Error: Cron job failed. Reason: ${error.message}`);
  }
});

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
    const { currentUser, sortBy, period } = req.query;
    console.log(`Leaderboard requested with sort by: ${sortBy}, period: ${period}`);

    // Liste blanche des colonnes autorisées pour le tri
    const allowedSortColumns = {
        'degen_score': 'total_degen_score',
        'pnl': 'total_pnl_sol',
        'win_rate': 'win_rate'
    };
    // Par défaut, on trie par degen_score si le paramètre est invalide ou absent
    const sortColumn = allowedSortColumns[sortBy] || 'total_degen_score'; 

    // Choix de la vue selon la période
    const leaderboardView = period === '24h' ? 'degen_rank_24h' : 'degen_rank';

    try {
        let query = supabase
            .from(leaderboardView)
            .select('*');

        // Pour le tri par win_rate, on filtre les utilisateurs avec moins de 10 trades
        if (sortBy === 'win_rate') {
            query = query.gte('total_trades', 10);
        }

        const { data: cachedLeaderboard, error } = await query.order(sortColumn, { ascending: false }); // Tri dynamique

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

    try {
        // Étape 1: Récupérer les stats globales depuis la vue matérialisée
        const { data: globalStats, error: globalError } = await supabase
            .from('degen_rank')
            .select('*')
            .eq('user_address', userAddress)
            .single();

        if (globalError && globalError.code !== 'PGRST116') { // On ignore l'erreur si l'user n'est pas trouvé
            throw globalError;
        }

        // Étape 2: Calculer les stats par plateforme
        const platformStats = {};
        const platforms = ['pump', 'bonk'];

        for (const platform of platforms) {
            const tableName = `trades_${platform}`;
            const { data: trades, error: platformError } = await supabase
                .from(tableName)
                .select('pnl_sol, status')
                .eq('user_address', userAddress);

            if (platformError) {
                console.error(`Error fetching platform stats for ${platform}:`, platformError);
                continue; // On continue même si une plateforme échoue
            }

            if (trades) {
                const stats = trades.reduce((acc, trade) => {
                    acc.pnl += trade.pnl_sol;
                    if (trade.status === 'WIN') {
                        acc.wins++;
                    } else {
                        acc.losses++;
                    }
                    return acc;
                }, { pnl: 0, wins: 0, losses: 0 });
                platformStats[platform] = stats;
            }
        }

        // Si globalStats est null (user non trouvé), on renvoie une structure vide
        if (!globalStats) {
            return res.status(200).json({
                globalStats: {
                    total_wins: 0,
                    total_losses: 0,
                    total_pnl_sol: 0,
                    win_rate: 0,
                    last_scanned_at: null,
                },
                platformStats,
            });
        }

        // Étape 3: Combiner et renvoyer la réponse
        res.status(200).json({ globalStats, platformStats });
        
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
                .select('token_mint, pnl_sol, status, last_sell_at, degen_score')
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

// Route pour déclencher manuellement le rafraîchissement d'un utilisateur
app.post('/user/:userAddress/refresh', async (req, res) => {
    const { userAddress } = req.params;

    try {
        console.log(`Manual refresh requested for user: ${userAddress}.`);

        // Check if user exists and get last manual refresh time
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('last_manual_refresh_at')
            .eq('address', userAddress)
            .single();

        if (userError) {
            console.error(`User not found: ${userAddress}`);
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if 24 hours have passed since last manual refresh
        const now = new Date();
        const lastRefresh = user.last_manual_refresh_at ? new Date(user.last_manual_refresh_at) : null;
        const hoursSinceLastRefresh = lastRefresh ? (now - lastRefresh) / (1000 * 60 * 60) : 24;

        if (hoursSinceLastRefresh < 24) {
            const remainingHours = Math.ceil(24 - hoursSinceLastRefresh);
            console.log(`Manual refresh blocked for ${userAddress}. Last refresh: ${lastRefresh}, Hours since: ${hoursSinceLastRefresh.toFixed(1)}`);
            return res.status(429).json({ 
                error: 'Manual refresh limit reached',
                message: `You can only refresh your stats manually once every 24 hours. Please wait ${remainingHours} more hour(s). Your stats are automatically updated daily.`,
                lastRefresh: lastRefresh,
                nextAvailable: new Date(lastRefresh.getTime() + 24 * 60 * 60 * 1000)
            });
        }

        // Update last_manual_refresh_at before starting the worker
        const { error: updateError } = await supabase
            .from('users')
            .update({ last_manual_refresh_at: now.toISOString() })
            .eq('address', userAddress);

        if (updateError) {
            console.error(`Failed to update last_manual_refresh_at for ${userAddress}:`, updateError);
            return res.status(500).json({ error: 'Failed to update refresh timestamp' });
        }

        // Launch the worker in background for incremental scan
        runWorker(userAddress, 'incremental').catch(err => {
            console.error(`[BACKGROUND] Error during manual refresh for ${userAddress}:`, err);
        });

        res.status(202).json({ 
            message: 'Manual refresh initiated successfully. Your stats will be updated shortly.',
            nextAvailable: new Date(now.getTime() + 24 * 60 * 60 * 1000)
        });

    } catch (error) {
        console.error(`Error during manual refresh for ${userAddress}:`, error.message);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});


// Route pour connecter un utilisateur
app.post('/user/connect', async (req, res) => {
    const { userAddress } = req.body;

    if (!userAddress) {
        return res.status(400).json({ error: 'userAddress is required' });
    }

    try {
        // Étape 1 : Vérifier si l'utilisateur existe déjà
        const { data: existingUser, error: selectError } = await supabase
            .from('users')
            .select('address')
            .eq('address', userAddress)
            .single();

        if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = 0 ligne retournée, ce n'est pas une erreur ici
            throw selectError;
        }

        // Étape 2 : Décider de la suite
        if (existingUser) {
            // L'utilisateur existe déjà, on ne fait rien.
            console.log(`User ${userAddress} already exists. No scan initiated.`);
            return res.status(200).json({ message: 'User already exists. Welcome back!' });
        } else {
            // L'utilisateur est nouveau, on le crée et on lance le scan.
            console.log(`New user detected: ${userAddress}. Creating user and initiating scan...`);
            const { error: insertError } = await supabase
                .from('users')
                .insert([{ address: userAddress, last_scanned_at: new Date().toISOString() }]);

            if (insertError) {
                throw insertError;
            }

            // On lance le worker en arrière-plan pour ne pas bloquer la réponse.
            // Le frontend n'a pas besoin d'attendre la fin du scan.
            runWorker(userAddress).then(async () => {
                // Après le scan, insérer le snapshot dans rank_history
                // Les vues matérialisées degen_rank et degen_rank_24h sont rafraîchies automatiquement par le worker.
                console.log('✅ Both materialized views degen_rank and degen_rank_24h have been refreshed by the worker.');
                try {
                    const { spawn } = require('child_process');
                    const path = require('path');
                    
                    console.log(`📸 Insertion du snapshot dans rank_history pour ${userAddress}...`);
                    
                    const insertSnapshotProcess = spawn('node', [
                        path.join(__dirname, '../scripts/insertRankSnapshot.js'),
                        userAddress
                    ], {
                        stdio: 'inherit',
                        cwd: path.join(__dirname, '../scripts')
                    });

                    insertSnapshotProcess.on('close', (code) => {
                        if (code === 0) {
                            console.log(`✅ Snapshot rank_history inséré avec succès pour ${userAddress}.`);
                        } else {
                            console.error(`❌ Échec de l'insertion du snapshot pour ${userAddress} (code: ${code})`);
                        }
                    });
                } catch (error) {
                    console.error(`❌ Échec de l'insertion du snapshot dans rank_history pour ${userAddress}:`, error.message);
                }
            }).catch(err => {
                console.error(`[BACKGROUND] Error during initial scan for ${userAddress}:`, err);
            });

            console.log(`User ${userAddress} created. Initial scan initiated in the background.`);
            return res.status(201).json({ message: 'User created successfully. Scan initiated.' });
        }

    } catch (error) {
        console.error(`Error during user connect for ${userAddress}:`, error.message);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

// Suppression complète d'un utilisateur (RGPD)
app.delete('/user/:userAddress', async (req, res) => {
  const { userAddress } = req.params;
  try {
    // Supprimer les trades dans trades_bonk
    const { error: errorBonk } = await supabase
      .from('trades_bonk')
      .delete()
      .eq('user_address', userAddress);
    if (errorBonk) throw errorBonk;

    // Supprimer les trades dans trades_pump
    const { error: errorPump } = await supabase
      .from('trades_pump')
      .delete()
      .eq('user_address', userAddress);
    if (errorPump) throw errorPump;

    // Supprimer l'utilisateur de la table users
    const { error: errorUser } = await supabase
      .from('users')
      .delete()
      .eq('address', userAddress);
    if (errorUser) throw errorUser;

    // Rafraîchir la vue matérialisée degen_rank
    const { error: errorRefresh } = await supabase.rpc('refresh_degen_rank');
    if (errorRefresh) throw errorRefresh;

    res.status(200).json({ success: true, message: 'User and all related data deleted.' });
  } catch (error) {
    console.error('Error deleting user and related data:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});


// --- ENDPOINT POUR LE CRON JOB ---
app.get('/api/cron/run-worker', async (req, res) => {
    // Sécurisation de l'endpoint
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).send('Unauthorized');
    }
  
    console.log("Cron job received. Attempting to run the full worker process and awaiting completion...");
    
    try {
      // On AWAIT maintenant le worker. La réponse ne sera envoyée qu'après la fin.
      await runWorker();
      console.log("Worker process completed successfully.");
      // On ne met PAS à jour le timestamp ici, c'est déjà fait dans la chaîne de promesses du worker.
      res.status(200).send('Success: Worker process finished.');
    } catch (err) {
      console.error("Worker process failed during execution.", err);
      res.status(500).send(`Server Error: Worker process failed. ${err.message}`);
    }
});

// Route pour récupérer l'évolution du rang d'un utilisateur
app.get('/user/:userAddress/rank-evolution', async (req, res) => {
    const { userAddress } = req.params;
    
    try {
        // Récupérer le rang actuel depuis degen_rank
        const { data: currentRank, error: currentError } = await supabase
            .from('degen_rank')
            .select('rank')
            .eq('user_address', userAddress)
            .single();

        if (currentError) {
            if (currentError.code === 'PGRST116') {
                return res.status(404).json({ error: 'User not found in current ranking' });
            }
            throw currentError;
        }

        // Récupérer le rang d'hier depuis rank_history
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const { data: previousRank, error: previousError } = await supabase
            .from('rank_history')
            .select('rank')
            .eq('user_address', userAddress)
            .eq('snapshot_date', yesterdayStr)
            .single();

        let evolution = 0;
        let evolutionType = 'same';

        if (previousError && previousError.code !== 'PGRST116') {
            throw previousError;
        }

        if (previousRank) {
            evolution = previousRank.rank - currentRank.rank;
            if (evolution > 0) {
                evolutionType = 'up';
            } else if (evolution < 0) {
                evolutionType = 'down';
            } else {
                evolutionType = 'same';
            }
        }

        res.status(200).json({
            currentRank: currentRank.rank,
            previousRank: previousRank ? previousRank.rank : null,
            evolution: evolution,
            evolutionType: evolutionType
        });

    } catch (error) {
        console.error(`Error fetching rank evolution for ${userAddress}:`, error.message);
        res.status(500).json({ error: 'Failed to fetch rank evolution' });
    }
});

// Route pour récupérer l'historique des scores d'un utilisateur
app.get('/user/:userAddress/score-history', async (req, res) => {
    const { userAddress } = req.params;
    
    try {
        // Récupérer l'historique des scores depuis rank_history
        const { data: scoreHistory, error } = await supabase
            .from('rank_history')
            .select('snapshot_date, total_degen_score, rank')
            .eq('user_address', userAddress)
            .order('snapshot_date', { ascending: true });

        if (error) {
            throw error;
        }

        // Formater les données pour le graphique
        const formattedData = scoreHistory.map(entry => ({
            date: entry.snapshot_date,
            score: entry.total_degen_score || 0,
            rank: entry.rank
        }));

        res.status(200).json(formattedData);

    } catch (error) {
        console.error(`Error fetching score history for ${userAddress}:`, error.message);
        res.status(500).json({ error: 'Failed to fetch score history' });
    }
});

// Route pour récupérer le statut du système (timestamps de mise à jour)
app.get('/status', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('system_status')
            .select('last_global_update_at, recent_top10_buys_refreshed_at')
            .eq('id', 1)
            .single();
        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching system status:', error.message);
        res.status(500).json({ error: 'Failed to fetch system status' });
    }
});

// Endpoint pour exposer les derniers buy in des top 10
app.get('/recent-top10-buys', async (req, res) => {
  const period = req.query.period === '24h' ? '24h' : 'yearly';
  const limit = parseInt(req.query.limit, 10) || 100;
  try {
    const { data, error } = await supabase
      .from('recent_top10_buys')
      .select('*')
      .eq('leaderboard_period', period)
      .order('buy_amount_sol', { ascending: false })
      .order('buy_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    res.status(200).json(data);
  } catch (e) {
    console.error('Error fetching recent top10 buys:', e.message);
    res.status(500).json({ error: 'Failed to fetch recent top10 buys' });
  }
});

// Endpoint pour rafraîchir les recent_top10_buys (limite 15min)
app.post('/refresh-recent-top10-buys', async (req, res) => {
  try {
    // 1. Récupérer la dernière date de refresh
    const { data: status, error: statusError } = await supabase
      .from('system_status')
      .select('recent_top10_buys_refreshed_at')
      .eq('id', 1)
      .single();
    if (statusError) throw statusError;
    const lastRefresh = status?.recent_top10_buys_refreshed_at ? new Date(status.recent_top10_buys_refreshed_at) : null;
    const now = new Date();
    const MINUTES_LIMIT = 15;
    let canRefresh = true;
    let minutesLeft = 0;
    if (lastRefresh) {
      const diffMs = now - lastRefresh;
      const diffMin = diffMs / (1000 * 60);
      if (diffMin < MINUTES_LIMIT) {
        canRefresh = false;
        minutesLeft = Math.ceil(MINUTES_LIMIT - diffMin);
      }
    }
    if (!canRefresh) {
      return res.status(429).json({
        error: 'Refresh limit',
        message: `You can only refresh every ${MINUTES_LIMIT} minutes. Please wait ${minutesLeft} more minute(s).`,
        nextAvailable: lastRefresh ? new Date(lastRefresh.getTime() + MINUTES_LIMIT * 60 * 1000) : null
      });
    }
    // 2. Lancer le script de refresh réellement
    const { spawn } = require('child_process');
    const fetchScript = spawn('node', ['scripts/fetchRecentTop10Buys.js'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    fetchScript.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ fetchRecentTop10Buys.js failed with code', code);
        return res.status(500).json({ error: 'Failed to refresh recent_top10_buys (script error)' });
      } else {
        console.log('✅ fetchRecentTop10Buys.js executed successfully.');
        // 3. Mettre à jour la date de refresh
        supabase
          .from('system_status')
          .update({ recent_top10_buys_refreshed_at: now.toISOString() })
          .eq('id', 1)
          .then(({ error: updateError }) => {
            if (updateError) {
              console.error('Error updating refresh timestamp:', updateError);
              return res.status(500).json({ error: 'Failed to update refresh timestamp' });
            }
            res.status(202).json({
              message: 'Recent top 10 buys refresh initiated.',
              refreshedAt: now.toISOString(),
              nextAvailable: new Date(now.getTime() + MINUTES_LIMIT * 60 * 1000)
            });
          });
      }
    });
  } catch (error) {
    console.error('Error during recent_top10_buys refresh:', error.message);
    res.status(500).json({ error: 'Failed to refresh recent_top10_buys' });
  }
});

// On n'écoute plus ici, on exporte pour Vercel
// app.listen(port, () => {
//     console.log(`Server is running on port ${port}`);
// });

// Quand on déploie sur Vercel, on n'écoute pas sur un port, on exporte l'app Express.
module.exports = app;

// Ce bloc ne sera exécuté que si le script est lancé directement (ex: `node api/index.js`)
// Il ne sera pas exécuté par Vercel, qui utilise l'export ci-dessus.
if (require.main === module) {
  app.listen(port, () => {
    console.log(`✅ Server is running on http://localhost:${port}`);
  });
}

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