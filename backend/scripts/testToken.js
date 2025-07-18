require('dotenv').config();
const axios = require('axios');

// Script pour tester un token spécifique avec une adresse spécifique
// Usage: node scripts/testToken.js <wallet_address> <token_mint>

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

async function getAllTransactions(address) {
  const apiBase = process.env.SOLANA_ENV === 'devnet' 
    ? 'https://api-devnet.helius.xyz' 
    : 'https://api.helius.xyz';
  const url = `${apiBase}/v0/addresses/${address}/transactions?api-key=${HELIUS_API_KEY}`;
  const transactions = [];
  let lastSignature = null;

  while (true) {
    const fetchUrl = lastSignature ? `${url}&before=${lastSignature}` : url;
    const { data } = await axios.get(fetchUrl);
    if (!data || data.length === 0) break;
    transactions.push(...data);
    lastSignature = data[data.length - 1].signature;
    console.log(`📥 Récupéré ${transactions.length} transactions...`);
  }
  return transactions;
}

async function analyzeTokenTrades(walletAddress, tokenMint) {
  console.log(`\n🔍 Analyse du wallet: ${walletAddress}`);
  console.log(`🔍 Token mint: ${tokenMint}\n`);

  const allTransactions = await getAllTransactions(walletAddress);
  console.log(`\nTotal transactions trouvées: ${allTransactions.length}\n`);

  let totalSolSpent = 0;
  let totalSolReceived = 0;
  const buyTransactions = [];
  const sellTransactions = [];

  for (const tx of allTransactions) {
    if (tx.error) continue;

    const tokenTransfers = tx.tokenTransfers ?? [];
    if (tokenTransfers.length === 0) continue;

    // Vérifier si cette transaction concerne notre token
    const hasTargetToken = tokenTransfers.some(t => t.mint === tokenMint);
    if (!hasTargetToken) continue;

    const SOL_MINT = "So11111111111111111111111111111111111111112";
    let solIn = 0;
    let solOut = 0;

    // Analyser les transferts SOL natifs
    const nativeTransfers = tx.nativeTransfers ?? [];
    for (const transfer of nativeTransfers) {
      if (transfer.fromUserAccount === walletAddress) {
        solOut += transfer.amount;
      }
      if (transfer.toUserAccount === walletAddress) {
        solIn += transfer.amount;
      }
    }

    // Déterminer si c'est un achat ou une vente
    let transactionType = 'UNKNOWN';
    let solSpent = 0;
    let solReceived = 0;

    // Vérifier la direction du transfert de tokens
    const tokenTransfer = tokenTransfers.find(t => t.mint === tokenMint);
    if (tokenTransfer) {
      if (tokenTransfer.toUserAccount === walletAddress) {
        // Achat: tokens reçus, SOL dépensé
        transactionType = 'BUY';
        solSpent = solOut / 1e9;
        solReceived = 0;
        totalSolSpent += solSpent;
        buyTransactions.push(tx.signature);
      } else if (tokenTransfer.fromUserAccount === walletAddress) {
        // Vente: tokens envoyés, SOL reçu
        transactionType = 'SELL';
        solSpent = 0;
        solReceived = solIn / 1e9;
        totalSolReceived += solReceived;
        sellTransactions.push(tx.signature);
      }
    }

    console.log(`--- Transaction ${tx.signature} ---`);
    console.log(`Type: ${transactionType}`);
    console.log(`Date: ${tx.timestamp}`);
    console.log(`SOL in: ${solIn/1e9} | SOL out: ${solOut/1e9}`);
    console.log(`Token transfers: ${JSON.stringify(tokenTransfers.filter(t => t.mint === tokenMint), null, 2)}`);
    console.log(`Native transfers: ${JSON.stringify(nativeTransfers, null, 2)}`);
    console.log(`Fee: ${tx.fee/1e9} SOL`);
    
    if (transactionType === 'BUY') {
      console.log(`Achat détecté: SOL dépensé += ${solSpent}`);
    } else if (transactionType === 'SELL') {
      console.log(`Vente détectée: SOL reçu += ${solReceived}`);
    }
    console.log('');
  }

  const pnl = totalSolReceived - totalSolSpent;
  
  console.log(`\n📊 RÉSULTATS FINAUX:`);
  console.log(`Nombre d'achats: ${buyTransactions.length}`);
  console.log(`Nombre de ventes: ${sellTransactions.length}`);
  console.log(`SOL total dépensé: ${totalSolSpent.toFixed(8)}`);
  console.log(`SOL total reçu: ${totalSolReceived.toFixed(8)}`);
  console.log(`PNL calculé: ${pnl.toFixed(8)} SOL`);
  console.log(`Status: ${pnl > 0 ? 'WIN 🟢' : 'LOSS 🔴'}`);
  
  if (buyTransactions.length > 0 && sellTransactions.length > 0) {
    console.log(`\n✅ Trade complet détecté !`);
  } else {
    console.log(`\n⚠️  Trade incomplet - manque d'achats ou de ventes`);
  }

  return {
    pnl,
    totalSolSpent,
    totalSolReceived,
    buyTransactions: buyTransactions.length,
    sellTransactions: sellTransactions.length,
    isComplete: buyTransactions.length > 0 && sellTransactions.length > 0
  };
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.log('❌ Usage: node scripts/testToken.js <wallet_address> <token_mint>');
    console.log('Exemple: node scripts/testToken.js HRFekhACsTUj9tRNHR8VfgBSYZp4BodaQwrqfpSePkMT 9GtvcnDUvGsuibktxiMjLQ2yyBq5akUahuBs8yANbonk');
    process.exit(1);
  }

  const [walletAddress, tokenMint] = args;
  
  try {
    await analyzeTokenTrades(walletAddress, tokenMint);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { analyzeTokenTrades }; 