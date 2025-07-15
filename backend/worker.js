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
  const apiBase = process.env.SOLANA_ENV === 'devnet' 
    ? 'https://api-devnet.helius.xyz' 
    : 'https://api.helius.xyz';
  const url = `${apiBase}/v0/addresses/${address}/transactions?api-key=${HELIUS_API_KEY}`;
  const transactions = [];
  let lastSignature = null;

  console.log(`Starting full history fetch from ${process.env.SOLANA_ENV === 'devnet' ? 'DEVNET' : 'MAINNET'}...`);

  while (true) {
    try {
      const fetchUrl = lastSignature ? `${url}&before=${lastSignature}` : url;
      // On utilise axios pour les requêtes HTTP
      const { data } = await axios.get(fetchUrl);
  
      if (!data || data.length === 0) {
        console.log("No more transactions found.");
        break;
      }
  
      transactions.push(...data);
      lastSignature = data[data.length - 1].signature;
      
      // Ajout d'une pause pour respecter les limites de l'API
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (transactions.length > 500) {
          console.log("Stopping fetch at 500 transactions for development purposes.");
          break;
      }
    } catch (error) {
      if (error.response && error.response.status === 429) {
        console.warn('Rate limited by Helius API. Waiting 1 second before retrying...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue; // Réessayer la même requête
      }
      // Pour les autres erreurs, on les lance pour être capturées plus haut
      throw error;
    }
  }

  console.log(`Finished fetching. Total transactions found: ${transactions.length}`);
  return transactions;
}

async function getRecentHistory(address, lastUpdateTimestamp) {
  const apiBase = process.env.SOLANA_ENV === 'devnet' 
    ? 'https://api-devnet.helius.xyz' 
    : 'https://api.helius.xyz';
  const url = `${apiBase}/v0/addresses/${address}/transactions?api-key=${HELIUS_API_KEY}`;
  const transactions = [];
  let lastSignature = null;
  const lastUpdateDate = new Date(lastUpdateTimestamp);

  console.log(`Starting recent history fetch from ${process.env.SOLANA_ENV === 'devnet' ? 'DEVNET' : 'MAINNET'} since ${lastUpdateTimestamp}...`);

  while (true) {
    try {
      const fetchUrl = lastSignature ? `${url}&before=${lastSignature}` : url;
      const { data } = await axios.get(fetchUrl);

      if (!data || data.length === 0) {
        console.log("No more new transactions found.");
        break;
      }

      const olderTxIndex = data.findIndex(tx => new Date(tx.timestamp * 1000) < lastUpdateDate);
      
      if (olderTxIndex !== -1) {
        transactions.push(...data.slice(0, olderTxIndex));
        console.log(`Found a transaction older than last update. Stopping fetch.`);
        break; 
      }
      
      transactions.push(...data);
      lastSignature = data[data.length - 1].signature;

      // Ajout d'une pause pour respecter les limites de l'API
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (transactions.length > 500) {
        console.log("Stopping fetch at 500 transactions for safety.");
        break;
      }

    } catch (error) {
      if (error.response && error.response.status === 429) {
        console.warn('Rate limited by Helius API. Waiting 1 second before retrying...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      throw error;
    }
  }

  console.log(`Finished fetching recent history. Total new transactions found: ${transactions.length}`);
  return transactions;
}


// La fonction getPlatformActivity est maintenant renommée en analyzeAndStoreTrades
// et elle prend en charge l'écriture dans la base de données.
async function analyzeAndStoreTrades(address, platform, lastUpdateTimestamp = null) {
  const platformSuffix = platform === 'pump' ? 'pump' : 'bonk';
  console.log(`Analyzing history for ${address} on platform ".${platformSuffix}"...`);
  
  const allTransactions = lastUpdateTimestamp 
    ? await getRecentHistory(address, lastUpdateTimestamp)
    : await getFullHistory(address);

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
      throw error;
    } else {
      console.log(`Données pour ${address} enregistrées dans ${tableName} avec succès !`);
    }
  } else {
    console.log(`\nNo new completed trades found for ${address} on this platform.`);
  }
}

// Nouvelle fonction pour récupérer tous les utilisateurs uniques depuis les tables de trades
async function getTrackedUsers() {
  console.log("[getTrackedUsers] Starting fetch for unique users from 'users' table...");
  
  const { data: users, error } = await supabase.from('users').select('address');

  if (error) {
    console.error("[getTrackedUsers] Error fetching users from Supabase:", error);
    return [];
  }

  const userAddresses = users.map(u => u.address);
  console.log(`[getTrackedUsers] Successfully fetched ${userAddresses.length} unique users.`);
  return userAddresses;
}

// --- POINT D'ENTRÉE DE LA LOGIQUE DU WORKER ---
// La fonction peut maintenant être ciblée sur un seul utilisateur
// ou fonctionner en mode global si aucun userAddress n'est fourni.
async function runWorker(userAddress = null) {
  // Vérification des variables d'environnement
  if (!HELIUS_API_KEY) {
    console.error("Erreur: Des variables d'environnement sont manquantes (HELIUS_API_KEY).");
    return;
  }

  console.log("--- Lancement du Worker ---");
  
  let usersToProcess = [];
  let lastUpdateTimestamp = null;

  if (userAddress) {
    console.log(`[runWorker] Target mode: Processing single user ${userAddress}`);
    usersToProcess.push(userAddress);
  } else {
    console.log("[runWorker] Global mode: Starting to fetch all tracked users.");
    usersToProcess = await getTrackedUsers();
    console.log(`[runWorker] Finished fetching users. Ready to process ${usersToProcess.length} users.`);

    // En mode global (cron), on récupère le timestamp de la dernière mise à jour
    const { data: appState, error } = await supabase.from('system_status').select('trades_updated_at').eq('id', 1).single();
    if (error) {
      console.error("Could not fetch last update timestamp, proceeding with full scan as a fallback.", error);
    } else {
      lastUpdateTimestamp = appState.trades_updated_at;
      console.log(`[runWorker] Will fetch transactions since last update at: ${lastUpdateTimestamp}`);
    }
  }

  if (usersToProcess.length === 0) {
    console.log("[runWorker] No users to process. Exiting worker.");
    return;
  }

  const CHUNK_SIZE = 4;
  const DELAY_BETWEEN_CHUNKS = 1000;
  let allResults = [];

  console.log(`[runWorker] Starting processing for ${usersToProcess.length} users in chunks of ${CHUNK_SIZE}...`);

  for (let i = 0; i < usersToProcess.length; i += CHUNK_SIZE) {
    const chunk = usersToProcess.slice(i, i + CHUNK_SIZE);
    console.log(`\n--- Processing chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(usersToProcess.length / CHUNK_SIZE)} with ${chunk.length} users (processing serially within chunk) ---`);
    
    // On traite les utilisateurs du lot un par un pour ne pas surcharger l'API
    for (const address of chunk) {
      console.log(`\n--- Début du traitement pour l'adresse: ${address} ---`);
      try {
        // On traite les plateformes en série pour respecter la limite de l'API Helius
        await analyzeAndStoreTrades(address, 'pump', lastUpdateTimestamp);
        
        // Pause supplémentaire entre les appels de plateformes pour garantir le respect des limites
        await new Promise(resolve => setTimeout(resolve, 1000));

        await analyzeAndStoreTrades(address, 'bonk', lastUpdateTimestamp);
        
        console.log(`--- Fin du traitement pour l'adresse: ${address} ---`);
        // On simule un résultat 'fulfilled' pour le comptage
        allResults.push({ status: 'fulfilled', value: { status: 'fulfilled', address } });
      } catch (error) {
        console.error(`Erreur lors du traitement de l'adresse ${address}:`, error.message);
        // On simule un résultat 'rejected' pour le comptage
        allResults.push({ status: 'fulfilled', value: { status: 'rejected', address, reason: error.message } });
      }
    }
    
    if (i + CHUNK_SIZE < usersToProcess.length) {
      console.log(`--- Chunk completed. Waiting ${DELAY_BETWEEN_CHUNKS}ms before next chunk... ---`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CHUNKS));
    }
  }

  console.log("\n[runWorker] All user processing tasks have completed.");
  
  let successfulUsers = 0;
  let failedUsers = 0;
  allResults.forEach(result => {
    if (result.status === 'fulfilled' && result.value.status === 'fulfilled') {
      successfulUsers++;
    } else {
      failedUsers++;
    }
  });

  console.log("\n--- Fin du Worker ---");
  console.log(`[runWorker] Execution summary: ${successfulUsers} users succeeded, ${failedUsers} users failed.`);

  try {
    const { data, error } = await supabase
      .from('system_status')
      .update({ trades_updated_at: new Date().toISOString() })
      .eq('id', 1);

    if (error) throw error;
    console.log("Successfully updated trades_updated_at timestamp.");
  } catch (error) {
    console.error("Error updating trades_updated_at:", error.message || error);
  }
}

module.exports = { runWorker, getFullHistory, analyzeAndStoreTrades }; 