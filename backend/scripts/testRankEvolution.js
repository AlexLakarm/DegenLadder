const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement SUPABASE_URL ou SUPABASE_KEY manquantes.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRankEvolution() {
  console.log('🧪 Test de l\'évolution du rang...\n');
  
  try {
    // Récupérer quelques utilisateurs de degen_rank
    const { data: users, error } = await supabase
      .from('degen_rank')
      .select('user_address, rank')
      .order('rank', { ascending: true })
      .limit(5);

    if (error) {
      throw new Error(`Erreur lors de la récupération des utilisateurs: ${error.message}`);
    }

    console.log(`📊 Test avec ${users.length} utilisateurs:\n`);

    for (const user of users) {
      console.log(`👤 Utilisateur: ${user.user_address.substring(0, 8)}...`);
      console.log(`   Rang actuel: ${user.rank}`);
      
      // Simuler l'appel à l'endpoint
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const { data: previousRank, error: previousError } = await supabase
        .from('rank_history')
        .select('rank')
        .eq('user_address', user.user_address)
        .eq('snapshot_date', yesterdayStr)
        .single();

      if (previousError && previousError.code !== 'PGRST116') {
        console.log(`   ❌ Erreur: ${previousError.message}`);
      } else if (previousRank) {
        const evolution = previousRank.rank - user.rank;
        const evolutionType = evolution > 0 ? 'up' : evolution < 0 ? 'down' : 'same';
        console.log(`   Rang hier: ${previousRank.rank}`);
        console.log(`   Évolution: ${evolution} (${evolutionType})`);
      } else {
        console.log(`   Rang hier: Pas de données`);
        console.log(`   Évolution: 0 (same)`);
      }
      console.log('');
    }

    console.log('✅ Test terminé avec succès!');
    console.log('💡 Note: Les évolutions sont "same" car nous n\'avons qu\'une seule date de snapshot.');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    process.exit(1);
  }
}

// Exécuter le test
testRankEvolution(); 