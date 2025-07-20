const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement SUPABASE_URL ou SUPABASE_KEY manquantes.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertRankSnapshot(addresses = []) {
  console.log('📸 Insertion du snapshot de rang dans rank_history...');
  
  try {
    // Date d'aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    
    // Si des adresses spécifiques sont fournies, on les utilise
    // Sinon, on prend tous les utilisateurs de degen_rank
    let degenRankData;
    
    if (addresses.length > 0) {
      console.log(`🎯 Insertion pour ${addresses.length} adresse(s) spécifique(s)...`);
      const { data, error } = await supabase
        .from('degen_rank')
        .select('user_address, rank, total_degen_score')
        .in('user_address', addresses)
        .order('rank', { ascending: true });
      
      if (error) {
        throw new Error(`Erreur lors de la récupération des données: ${error.message}`);
      }
      degenRankData = data;
    } else {
      console.log('🌍 Insertion pour tous les utilisateurs...');
      const { data, error } = await supabase
        .from('degen_rank')
        .select('user_address, rank, total_degen_score')
        .order('rank', { ascending: true });
      
      if (error) {
        throw new Error(`Erreur lors de la récupération des données: ${error.message}`);
      }
      degenRankData = data;
    }

    if (!degenRankData || degenRankData.length === 0) {
      console.log('⚠️  Aucune donnée trouvée dans degen_rank');
      return;
    }

    console.log(`📊 ${degenRankData.length} utilisateurs trouvés`);

    // Préparer les données pour l'insertion
    const rankHistoryData = degenRankData.map(user => ({
      user_address: user.user_address,
      rank: user.rank,
      total_degen_score: user.total_degen_score,
      snapshot_date: today
    }));

    // Insérer les données dans rank_history
    const { data: insertData, error: insertError } = await supabase
      .from('rank_history')
      .upsert(rankHistoryData, {
        onConflict: 'user_address, snapshot_date'
      })
      .select();

    if (insertError) {
      throw new Error(`Erreur lors de l'insertion dans rank_history: ${insertError.message}`);
    }

    console.log(`✅ ${insertData.length} enregistrements insérés/mis à jour dans rank_history`);
    console.log(`📅 Date du snapshot: ${today}`);

    // Afficher quelques exemples
    if (insertData.length > 0) {
      console.log('\n📋 Exemples d\'enregistrements:');
      insertData.slice(0, 5).forEach((record, index) => {
        console.log(`  ${index + 1}. User ${record.user_address.substring(0, 8)}...: Rank ${record.rank} (${record.total_degen_score} pts)`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion du snapshot:', error.message);
    process.exit(1);
  }
}

// Récupérer les adresses depuis les arguments de ligne de commande
const addresses = process.argv.slice(2);

// Exécuter le script
insertRankSnapshot(addresses); 