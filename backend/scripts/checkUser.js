require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserData(walletAddress) {
  console.log(`🔍 Vérification des données pour: ${walletAddress}\n`);

  try {
    // Vérifier dans la table degen_rank
    const { data: degenRankData, error: degenRankError } = await supabase
      .from('degen_rank')
      .select('*')
      .eq('user_address', walletAddress);

    if (degenRankError) {
      console.log('❌ Erreur lors de la récupération des données degen_rank:', degenRankError.message);
    } else if (!degenRankData || degenRankData.length === 0) {
      console.log('ℹ️  Aucun résultat dans degen_rank pour cet utilisateur (aucun trade ou non classé).');
    } else if (degenRankData.length > 1) {
      console.log('⚠️  Plusieurs lignes trouvées dans degen_rank pour cet utilisateur (anomalie possible).');
      console.log(degenRankData);
    } else {
      const dr = degenRankData[0];
      console.log('📊 Données dans degen_rank:');
      console.log(`   - Rank: ${dr.rank}`);
      console.log(`   - Total PNL: ${dr.total_pnl_sol} SOL`);
      console.log(`   - Total trades: ${dr.total_trades}`);
      console.log(`   - Wins: ${dr.total_wins}`);
      console.log(`   - Losses: ${dr.total_losses}`);
      console.log(`   - Win rate: ${dr.win_rate}%`);
      console.log(`   - Degen score: ${dr.total_degen_score}`);
    }

    // Vérifier les trades pump
    let pumpCount = 0;
    try {
      const { count, error: pumpError } = await supabase
        .from('trades_pump')
        .select('id', { count: 'exact', head: true })
        .eq('user_address', walletAddress);
      if (pumpError) {
        console.log('❌ Erreur lors de la récupération des trades pump:', pumpError.message);
      } else {
        pumpCount = count ?? 0;
        console.log(`\n🟣 Trades pump trouvés: ${pumpCount}`);
      }
    } catch (e) {
      console.log('❌ Erreur lors du comptage des trades pump:', e.message);
    }
    if (pumpCount > 0) {
      const { data: pumpTrades, error: pumpError2 } = await supabase
        .from('trades_pump')
        .select('*')
        .eq('user_address', walletAddress)
        .limit(1000); // Pour éviter de charger toute la table si beaucoup de trades
      if (pumpError2) {
        console.log('❌ Erreur lors de la récupération des détails trades pump:', pumpError2.message);
      } else {
        const wins = pumpTrades.filter(t => t.pnl_sol > 0).length;
        const losses = pumpTrades.filter(t => t.pnl_sol <= 0).length;
        const totalPnl = pumpTrades.reduce((sum, t) => sum + (t.pnl_sol || 0), 0);
        console.log(`   - Wins (sur 1000 max): ${wins}`);
        console.log(`   - Losses (sur 1000 max): ${losses}`);
        console.log(`   - PNL total (sur 1000 max): ${totalPnl.toFixed(8)} SOL`);
      }
    }

    // Vérifier les trades bonk
    let bonkCount = 0;
    try {
      const { count, error: bonkError } = await supabase
        .from('trades_bonk')
        .select('id', { count: 'exact', head: true })
        .eq('user_address', walletAddress);
      if (bonkError) {
        console.log('❌ Erreur lors de la récupération des trades bonk:', bonkError.message);
      } else {
        bonkCount = count ?? 0;
        console.log(`\n🟡 Trades bonk trouvés: ${bonkCount}`);
      }
    } catch (e) {
      console.log('❌ Erreur lors du comptage des trades bonk:', e.message);
    }
    if (bonkCount > 0) {
      const { data: bonkTrades, error: bonkError2 } = await supabase
        .from('trades_bonk')
        .select('*')
        .eq('user_address', walletAddress)
        .limit(1000);
      if (bonkError2) {
        console.log('❌ Erreur lors de la récupération des détails trades bonk:', bonkError2.message);
      } else {
        const wins = bonkTrades.filter(t => t.pnl_sol > 0).length;
        const losses = bonkTrades.filter(t => t.pnl_sol <= 0).length;
        const totalPnl = bonkTrades.reduce((sum, t) => sum + (t.pnl_sol || 0), 0);
        console.log(`   - Wins (sur 1000 max): ${wins}`);
        console.log(`   - Losses (sur 1000 max): ${losses}`);
        console.log(`   - PNL total (sur 1000 max): ${totalPnl.toFixed(8)} SOL`);
      }
    }

    // Audit du score total dans trades_pump et trades_bonk
    try {
      const { data: pumpScores, error: pumpScoreErr } = await supabase
        .from('trades_pump')
        .select('degen_score')
        .eq('user_address', walletAddress);
      const { data: bonkScores, error: bonkScoreErr } = await supabase
        .from('trades_bonk')
        .select('degen_score')
        .eq('user_address', walletAddress);
      let totalScore = 0;
      if (!pumpScoreErr && pumpScores) {
        totalScore += pumpScores.reduce((sum, t) => sum + (t.degen_score || 0), 0);
      }
      if (!bonkScoreErr && bonkScores) {
        totalScore += bonkScores.reduce((sum, t) => sum + (t.degen_score || 0), 0);
      }
      console.log(`\n🧮 Somme brute des degen_score (pump+bonk) : ${totalScore}`);
    } catch (e) {
      console.log('❌ Erreur lors de l\'audit du score total:', e.message);
    }

    // Vérification des doublons dans trades_pump et trades_bonk
    try {
      const { data: pumpDupes, error: pumpDupesErr } = await supabase
        .from('trades_pump')
        .select('user_address, token_mint, count:id')
        .eq('user_address', walletAddress)
        .group('user_address, token_mint')
        .having('count:id', '>', 1);
      const { data: bonkDupes, error: bonkDupesErr } = await supabase
        .from('trades_bonk')
        .select('user_address, token_mint, count:id')
        .eq('user_address', walletAddress)
        .group('user_address, token_mint')
        .having('count:id', '>', 1);
      const pumpDupCount = pumpDupes ? pumpDupes.length : 0;
      const bonkDupCount = bonkDupes ? bonkDupes.length : 0;
      console.log(`\n🔎 Doublons trades_pump (user_address, token_mint > 1) : ${pumpDupCount}`);
      if (pumpDupCount > 0) console.log(pumpDupes);
      console.log(`🔎 Doublons trades_bonk (user_address, token_mint > 1) : ${bonkDupCount}`);
      if (bonkDupCount > 0) console.log(bonkDupes);
    } catch (e) {
      console.log('❌ Erreur lors de la vérification des doublons:', e.message);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 1) {
    console.log('❌ Usage: node scripts/checkUser.js <wallet_address>');
    console.log('Exemple: node scripts/checkUser.js H1Qxgjwhp1gnnwzMhVMmri1LKdtVQZCdGGR5X35pgeUK');
    process.exit(1);
  }

  const walletAddress = args[0];
  
  try {
    await checkUserData(walletAddress);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkUserData }; 