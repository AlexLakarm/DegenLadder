const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const axios = require('axios');
const supabase = require('./lib/supabaseClient');

// Récupérer les clés d'API depuis les variables d'environnement
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
// SUPABASE_URL et SUPABASE_KEY sont maintenant gérés dans supabaseClient.js
// L'initialisation du client Supabase est aussi gérée là-bas.

// LOGIQUE COMMUNE (portée depuis le frontend)
async function getFullHistory(address) {
  const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${HELIUS_API_KEY}`;
  const transactions = [];
  let lastSignature = null;

  console.log("Starting full history fetch...");

  while (true) {
    const fetchUrl = lastSignature ? `${url}&before=${lastSignature}` : url;
    // On utilise axios pour les requêtes HTTP
    const { data } = await axios.get(fetchUrl);

    if (!data || data.length === 0) {
      console.log("No more transactions found.");
      break;
    }

    transactions.push(...data);
    lastSignature = data[data.length - 1].signature;
    console.log(`Fetched batch of ${data.length} transactions. Total: ${transactions.length}. Continuing...`);

    if (transactions.length > 500) {
        console.log("Stopping fetch at 500 transactions for development purposes.");
        break;
    }
  }

  console.log(`Finished fetching. Total transactions found: ${transactions.length}`);
  return transactions;
}

// La fonction getPlatformActivity est maintenant renommée en analyzeAndStoreTrades
// et elle prend en charge l'écriture dans la base de données.
async function analyzeAndStoreTrades(address, platform) {
  const platformSuffix = platform === 'pump' ? 'pump' : 'bonk';
  console.log(`Analyzing history for ${address} on platform ".${platformSuffix}"...`);
  const allTransactions = await getFullHistory(address);

  // Étape 1: Agréger toutes les données par token, comme avant.
  const tradesData = {};
  
  for (const tx of allTransactions) {
    if (tx.error) continue;

    const tokenTransfers = tx.tokenTransfers ?? [];
    if (tokenTransfers.length === 0) continue;

    const SOL_MINT = "So11111111111111111111111111111111111111112";
    let solIn = 0;
    let solOut = 0;
    
    const hasWsolTransfer = tokenTransfers.some((t) => t.mint === SOL_MINT && (t.fromUserAccount === address || t.toUserAccount === address));

    if (hasWsolTransfer) {
      for (const transfer of tokenTransfers) {
        if (transfer.mint === SOL_MINT && transfer.tokenAmount) {
          let wsolAmountLamports = 0;
          if (typeof transfer.tokenAmount.amount === 'string') { // Helius peut renvoyer une string
            wsolAmountLamports = Number(transfer.tokenAmount.amount);
          } else if (typeof transfer.tokenAmount.uiAmount === 'number') { // Ou un uiAmount
            wsolAmountLamports = transfer.tokenAmount.uiAmount * 1e9;
          }
          if (!isNaN(wsolAmountLamports)) {
            if (transfer.fromUserAccount === address) solOut += wsolAmountLamports;
            if (transfer.toUserAccount === address) solIn += wsolAmountLamports;
          }
        }
      }
    } else if (tx.nativeTransfers) {
      for (const transfer of tx.nativeTransfers) {
        if (transfer.fromUserAccount === address) solOut += transfer.amount;
        if (transfer.toUserAccount === address) solIn += transfer.amount;
      }
    }

    if (tx.feePayer === address) {
      solOut += tx.fee;
    }

    const platformMintsInTx = [...new Set(tokenTransfers.map((t) => t.mint).filter((m) => m && m.endsWith(platformSuffix)))];

    for (const mint of platformMintsInTx) {
      const isBuy = tokenTransfers.some((t) => t.mint === mint && t.toUserAccount === address);
      const isSell = tokenTransfers.some((t) => t.mint === mint && t.fromUserAccount === address);
      if (isBuy && isSell) continue;

      const mintStr = mint;
      if (!tradesData[mintStr]) {
        tradesData[mintStr] = { 
          solSpent: 0, solReceived: 0, 
          buyTransactions: [], sellTransactions: [],
          firstBuyAt: null, lastSellAt: null 
        };
      }
      
      const trade = tradesData[mintStr];
      if (isBuy) {
        trade.solSpent += (solOut - solIn);
        trade.buyTransactions.push(tx.signature);
        if (!trade.firstBuyAt) {
          trade.firstBuyAt = new Date(tx.timestamp * 1000).toISOString();
        }
      } else if (isSell) {
        trade.solReceived += (solIn - solOut);
        trade.sellTransactions.push(tx.signature);
        trade.lastSellAt = new Date(tx.timestamp * 1000).toISOString();
      }
    }
  }

  // Étape 2: Formater les données et les préparer pour l'insertion
  const tradesToUpsert = [];
  for (const mint in tradesData) {
    const trade = tradesData[mint];
    // On ne traite que les trades complets (au moins un achat et une vente)
    if (trade.buyTransactions.length > 0 && trade.sellTransactions.length > 0) {
      const pnl = trade.solReceived - trade.solSpent;
      const pnl_sol = pnl / 1e9;

      // Calcul du Degen Score
      let degen_score = pnl > 0 ? 10 : -10; // Points de base pour WIN/LOSS
      if (pnl_sol > 0) {
        // Ajout du bonus basé sur le PNL
        degen_score += 50 * Math.log(1 + pnl_sol);
      }

      tradesToUpsert.push({
        user_address: address,
        token_mint: mint,
        status: pnl > 0 ? 'WIN' : 'LOSS',
        pnl_sol: pnl_sol,
        degen_score: Math.round(degen_score), // On s'assure que le score est un entier
        sol_spent_lamports: trade.solSpent,
        sol_received_lamports: trade.solReceived,
        first_buy_at: trade.firstBuyAt,
        last_sell_at: trade.lastSellAt,
        first_buy_tx: trade.buyTransactions[0],
        last_sell_tx: trade.sellTransactions[trade.sellTransactions.length - 1],
        buy_transactions: trade.buyTransactions,
        sell_transactions: trade.sellTransactions,
      });
    }
  }

  // Étape 3: Insérer les données dans Supabase
  if (tradesToUpsert.length > 0) {
    console.log(`\nFound ${tradesToUpsert.length} completed trades to insert/update in Supabase...`);
    const tableName = `trades_${platform}`;
    
    const { data, error } = await supabase
      .from(tableName)
      .upsert(tradesToUpsert, {
        onConflict: 'user_address, token_mint' // Clé unique pour l'upsert
      });

    if (error) {
      console.error(`Erreur lors de l'upsert dans ${tableName}:`, error.message);
    } else {
      console.log(`Données pour ${address} enregistrées dans ${tableName} avec succès !`);
    }
  } else {
    console.log(`\nNo new completed trades found for ${address} on this platform.`);
  }
}

// Nouvelle fonction pour récupérer tous les utilisateurs uniques depuis les tables de trades
async function getTrackedUsers() {
  console.log("Fetching unique users from 'users' table...");
  
  const { data: users, error } = await supabase.from('users').select('address');

  if (error) {
    console.error("Error fetching users:", error);
    return [];
  }

  const userAddresses = users.map(u => u.address);
  console.log(`Found ${userAddresses.length} unique users to track.`);
  return userAddresses;
}

// --- POINT D'ENTRÉE DE LA LOGIQUE DU WORKER ---
// Renommée pour être plus explicite
async function runWorkerLogic() {
  // Vérification des variables d'environnement
  if (!HELIUS_API_KEY) {
    console.error("Erreur: Des variables d'environnement sont manquantes (HELIUS_API_KEY).");
    console.log("Veuillez vous assurer que votre fichier .env est correctement configuré.");
    return;
  }

  console.log("--- Worker logic starting ---");
  const usersToTrack = await getTrackedUsers();

  for (const user of usersToTrack) {
    console.log(`\n--- Processing user: ${user} ---`);
    // On analyse les trades pour les deux plateformes pour chaque utilisateur
  try {
      await analyzeAndStoreTrades(user, 'pump');
      await analyzeAndStoreTrades(user, 'bonk');
  } catch (error) {
      console.error(`Failed to process user ${user}. Error: ${error.message}`);
  }
}

  console.log("\n--- Worker logic finished a cycle ---");
}

// On exporte la logique pour pouvoir l'appeler depuis server.js
module.exports = {
  analyzeAndStoreTrades,
  getFullHistory,
  runWorkerLogic
}; 