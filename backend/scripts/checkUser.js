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
      .eq('user_address', walletAddress)
      .single();

    if (degenRankError) {
      console.log('❌ Erreur lors de la récupération des données degen_rank:', degenRankError.message);
    } else {
      console.log('📊 Données dans degen_rank:');
      console.log(`   - Rank: ${degenRankData.rank}`);
      console.log(`   - Total PNL: ${degenRankData.total_pnl_sol} SOL`);
      console.log(`   - Total trades: ${degenRankData.total_trades}`);
      console.log(`   - Wins: ${degenRankData.total_wins}`);
      console.log(`   - Losses: ${degenRankData.total_losses}`);
      console.log(`   - Win rate: ${degenRankData.win_rate}%`);
      console.log(`   - Degen score: ${degenRankData.total_degen_score}`);
    }

    // Vérifier les trades pump
    const { data: pumpTrades, error: pumpError } = await supabase
      .from('trades_pump')
      .select('*')
      .eq('user_address', walletAddress);

    if (pumpError) {
      console.log('❌ Erreur lors de la récupération des trades pump:', pumpError.message);
    } else {
      console.log(`\n🟣 Trades pump trouvés: ${pumpTrades.length}`);
      if (pumpTrades.length > 0) {
        const wins = pumpTrades.filter(t => t.pnl > 0).length;
        const losses = pumpTrades.filter(t => t.pnl <= 0).length;
        const totalPnl = pumpTrades.reduce((sum, t) => sum + t.pnl, 0);
        console.log(`   - Wins: ${wins}`);
        console.log(`   - Losses: ${losses}`);
        console.log(`   - PNL total: ${totalPnl.toFixed(8)} SOL`);
      }
    }

    // Vérifier les trades bonk
    const { data: bonkTrades, error: bonkError } = await supabase
      .from('trades_bonk')
      .select('*')
      .eq('user_address', walletAddress);

    if (bonkError) {
      console.log('❌ Erreur lors de la récupération des trades bonk:', bonkError.message);
    } else {
      console.log(`\n🟡 Trades bonk trouvés: ${bonkTrades.length}`);
      if (bonkTrades.length > 0) {
        const wins = bonkTrades.filter(t => t.pnl > 0).length;
        const losses = bonkTrades.filter(t => t.pnl <= 0).length;
        const totalPnl = bonkTrades.reduce((sum, t) => sum + t.pnl, 0);
        console.log(`   - Wins: ${wins}`);
        console.log(`   - Losses: ${losses}`);
        console.log(`   - PNL total: ${totalPnl.toFixed(8)} SOL`);
      }
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