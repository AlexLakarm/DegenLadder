const express = require('express');
const cors = require('cors');
const supabase = require('./lib/supabaseClient');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // Activation de CORS pour toutes les routes
app.use(express.json());

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

app.listen(port, () => {
    console.log(`API Server listening on port ${port}`);
}); 