const express = require('express');
const cors = require('cors');
const supabase = require('./lib/supabaseClient');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // Activation de CORS pour toutes les routes
app.use(express.json());

// Route pour récupérer le classement global depuis la vue
app.get('/leaderboard/global', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('degen_rank') // On interroge notre nouvelle vue
            .select('*');

        if (error) {
            throw error;
        }

        res.status(200).json(data);

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

app.listen(port, () => {
    console.log(`API Server listening on port ${port}`);
}); 