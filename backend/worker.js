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

      // Suppression de la limite de 500 transactions (mode production)
      // if (transactions.length > 500) {
      //     console.log("Stopping fetch at 500 transactions for development purposes.");
      //     break;
      // }
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

      // Suppression de la limite de 500 transactions (mode production)
      // if (transactions.length > 500) {
      //   console.log("Stopping fetch at 500 transactions for safety.");
      //   break;
      // }

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
async function analyzeAndStoreTrades(address, platform, scanMode = 'full', lastUpdateTimestamp = null) {
  const platformSuffix = platform === 'pump' ? 'pump' : 'bonk';

  
  console.log(`Analyzing history for ${address} on platform ".${platformSuffix}"...`);
  
  const allTransactions = scanMode === 'incremental' && lastUpdateTimestamp 
    ? await getRecentHistory(address, lastUpdateTimestamp)
    : await getFullHistory(address);



  // Étape 1: Agréger toutes les données par token avec la logique exacte du script d'analyse détaillée
  const tradesData = {};
  
  for (const tx of allTransactions) {
    if (tx.error) continue;

    const tokenTransfers = tx.tokenTransfers || [];
    const nativeTransfers = tx.nativeTransfers || [];
    const SOL_MINT = "So11111111111111111111111111111111111111112";
    
    // Filtrer les transactions qui contiennent des tokens de la plateforme
    const platformMintsInTx = [...new Set(tokenTransfers.map((t) => t.mint).filter((m) => m && m.endsWith(platformSuffix)))];
    if (platformMintsInTx.length === 0) continue;



    // Pour chaque mint de la plateforme dans cette transaction
    for (const mint of platformMintsInTx) {
      const isBuy = tokenTransfers.some(t => t.mint === mint && t.toUserAccount === address);
      const isSell = tokenTransfers.some(t => t.mint === mint && t.fromUserAccount === address);
      if (!isBuy && !isSell) continue;

      const mintStr = mint;
      if (!tradesData[mintStr]) {
        tradesData[mintStr] = { 
          solSpent: 0, solReceived: 0, 
          buyTransactions: [], sellTransactions: [],
          firstBuyAt: null, lastSellAt: null 
        };
      }
      
      const trade = tradesData[mintStr];
      
      // Calculer le solde net de SOL pour cette transaction (logique exacte du script d'analyse)
      let solIn = 0, solOut = 0;
      
      // Transferts de tokens SOL (wrapped SOL)
      for (const t of tokenTransfers) {
        if (t.mint === SOL_MINT && t.fromUserAccount === address) {
          solOut += Number(t.tokenAmount.amount || 0);
        }
        if (t.mint === SOL_MINT && t.toUserAccount === address) {
          solIn += Number(t.tokenAmount.amount || 0);
        }
      }
      
      // Transferts natifs SOL
      for (const t of nativeTransfers) {
        if (t.fromUserAccount === address) solOut += t.amount;
        if (t.toUserAccount === address) solIn += t.amount;
      }
      
      // Frais de transaction
      if (tx.feePayer === address) solOut += tx.fee;


      
      if (isBuy) {
        trade.solSpent += (solOut - solIn);
        trade.buyTransactions.push(tx.signature);
        if (!trade.firstBuyAt) {
          trade.firstBuyAt = new Date(tx.timestamp * 1000).toISOString();
        }

      }
      if (isSell) {
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
      let pnl = trade.solReceived - trade.solSpent;
      let pnl_sol = pnl / 1e9;

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
  console.log('Fetching all tracked users from the database...');
  const { data, error } = await supabase
    .from('users')
    .select('address, last_scanned_at'); // On récupère aussi le timestamp
  
  if (error) {
    console.error('Error fetching tracked users:', error);
    return [];
  }
  return data;
}

// Modifié pour accepter un mode de scan
async function analyzeUserHistory(user, scanMode = 'full') {
  const { address, last_scanned_at } = user;
  console.log(`--- Début du traitement pour l'adresse: ${address} (mode: ${scanMode}) ---`);

  const lastUpdate = scanMode === 'incremental' ? last_scanned_at : null;

  try {
    // On analyse les plateformes en série pour réduire la charge sur l'API Helius
    await analyzeAndStoreTrades(address, 'pump', scanMode, lastUpdate);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Pause d'1 seconde entre les plateformes
    await analyzeAndStoreTrades(address, 'bonk', scanMode, lastUpdate);
    
    console.log(`--- Fin du traitement pour l'adresse: ${address} ---`);
    return { success: true, address };
  } catch (error) {
    console.error(`Erreur lors du traitement de l'adresse ${address}:`, error.message);
    return { success: false, address };
  }
}

async function processChunk(usersInChunk, scanMode, isSingleUserMode, globalLastUpdate) {
    let succeeded = 0;
    let failed = 0;

    for (const user of usersInChunk) {
        const { address, last_scanned_at } = user;
        const finalScanMode = isSingleUserMode ? scanMode : 'incremental';
        // Logique de fallback: on utilise le timestamp de l'utilisateur, ou le timestamp global, ou rien.
        const lastUpdateTimestamp = finalScanMode === 'incremental' ? (last_scanned_at || globalLastUpdate || null) : null;

        console.log(`--- Début du traitement pour l'adresse: ${address} (mode: ${finalScanMode}) ---`);
        
        try {
            await analyzeAndStoreTrades(address, 'pump', finalScanMode, lastUpdateTimestamp);
            await analyzeAndStoreTrades(address, 'bonk', finalScanMode, lastUpdateTimestamp);
            
            console.log(`--- Fin du traitement pour l'adresse: ${address} ---`);
            
            const { error: updateScanTimeError } = await supabase
                .from('users')
                .update({ last_scanned_at: new Date().toISOString() })
                .eq('address', address);

            if (updateScanTimeError) {
                console.error(`Failed to update last_scanned_at for ${address}:`, updateScanTimeError.message);
            }
            succeeded++;
        } catch (error) {
            console.error(`--- Erreur lors du traitement de l'adresse: ${address} ---`, error);
            failed++;
        }

        // On n'ajoute une pause qu'en mode global pour ne pas ralentir les scans uniques.
        if (!isSingleUserMode) {
            console.log('--- Pause inter-utilisateur (2s) ---');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    return { succeeded, failed };
}

async function refreshDegenRank() {
    console.log('\\nRefreshing materialized view: degen_rank...');
    const { error } = await supabase.rpc('refresh_degen_rank');
    if (error) {
        console.error('Failed to refresh materialized view:', error.message);
        throw error; // On propage l'erreur pour que l'appelant puisse la gérer
    } else {
        console.log('✅ Materialized view degen_rank has been refreshed successfully.');
    }
}

// --- POINT D'ENTRÉE DE LA LOGIQUE DU WORKER ---
// La fonction peut maintenant être ciblée sur un seul utilisateur
// ou fonctionner en mode global si aucun userAddress n'est fourni.
async function runWorker(userAddress = null, scanMode = 'full') {
  // Vérification des variables d'environnement
  if (!HELIUS_API_KEY) {
    throw new Error('HELIUS_API_KEY is not set in the environment variables.');
  }
  
  console.log('--- Lancement du Worker ---');
  
  let usersToProcess;
  let isSingleUserMode = false;
  let globalLastUpdate = null; // Pour stocker le timestamp global

  if (userAddress) {
    console.log(`[runWorker] Target mode: Processing single user ${userAddress}`);
    usersToProcess = [{ address: userAddress, last_scanned_at: null }];
    isSingleUserMode = true;

    const { data: user, error } = await supabase
      .from('users')
      .select('last_scanned_at')
      .eq('address', userAddress)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error(`Could not fetch last_scanned_at for ${userAddress}`, error);
    } else if (user) {
      usersToProcess[0].last_scanned_at = user.last_scanned_at;
    }
  } else {
    console.log('[runWorker] Global mode: Processing all tracked users...');
    usersToProcess = await getTrackedUsers();
    scanMode = 'incremental'; // Le mode global est toujours incrémental

    // En mode global, on récupère le timestamp de la dernière mise à jour réussie
    const { data: status, error: statusError } = await supabase
        .from('system_status')
        .select('last_global_update_at')
        .eq('id', 1)
        .single();
    if (statusError) {
        console.error('Could not fetch global last update timestamp. Scans might be less efficient.', statusError);
    } else {
        globalLastUpdate = status.last_global_update_at;
    }
  }

  if (!usersToProcess || usersToProcess.length === 0) {
    console.log('[runWorker] No users to process. Exiting.');
    console.log('--- Fin du Worker ---');
    return;
  }

  const chunkSize = 4;
  const chunks = [];
  for (let i = 0; i < usersToProcess.length; i += chunkSize) {
    chunks.push(usersToProcess.slice(i, i + chunkSize));
  }

  console.log(`[runWorker] Starting processing for ${usersToProcess.length} users in chunks of ${chunkSize}...`);

  let totalSucceeded = 0;
  let totalFailed = 0;

  for (let i = 0; i < chunks.length; i++) {
    console.log(`--- Processing chunk ${i + 1}/${chunks.length} with ${chunks[i].length} users (processing serially within chunk) ---`);
    const { succeeded, failed } = await processChunk(chunks[i], scanMode, isSingleUserMode, globalLastUpdate);
    totalSucceeded += succeeded;
    totalFailed += failed;

    // On n'ajoute une pause que s'il y a un autre chunk après
    if (i < chunks.length - 1) {
      console.log('--- Pause between chunks (2s) to avoid rate limiting ---');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('[runWorker] All user processing tasks have completed.');
  
  // Après le traitement de tous les utilisateurs
  const summary = {
    succeeded: totalSucceeded,
    failed: totalFailed,
    total: usersToProcess.length
  };
  console.log('[runWorker] Execution summary:', summary);

  if (isSingleUserMode) {
    console.log('[runWorker] Single user mode: Global timestamp not updated.');
    // Mettre à jour last_scanned_at pour l'utilisateur unique
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ last_scanned_at: new Date().toISOString() })
        .eq('address', userAddress);
      if (updateError) throw updateError;
      console.log(`Successfully updated last_scanned_at for user ${userAddress}.`);
    } catch (error) {
      console.error(`Failed to update last_scanned_at for ${userAddress}:`, error);
    }
  } else if (totalFailed === 0) {
    // En mode global, si tout a réussi, on met à jour le timestamp global
    try {
      const { error: updateError } = await supabase
        .from('system_status')
        .update({ last_global_update_at: new Date().toISOString() })
        .eq('id', 1);
      if (updateError) throw updateError;
      console.log('✅ Global timestamp (last_global_update_at) updated successfully!');
    } catch (error) {
      console.error('Failed to update global timestamp:', error);
    }
  } else {
    console.log(`[runWorker] Global scan finished with ${totalFailed} failures. Global timestamp not updated.`);
  }

  try {
    await refreshDegenRank();
  } catch (error) {
    console.error('An error occurred during degen_rank refresh:', error);
  }

  // Insertion du snapshot de rang dans rank_history (après refresh, avant purge)
  if (!isSingleUserMode) {
    try {
      const { error: snapshotError } = await supabase.rpc('insert_rank_snapshot');
      if (snapshotError) {
        console.error('❌ Error during rank_history snapshot insertion:', snapshotError.message);
      } else {
        console.log('✅ rank_history snapshot inserted for today.');
      }
    } catch (e) {
      console.error('❌ Exception during rank_history snapshot insertion:', e.message);
    }
  }

  // Purge de l'historique des rangs (rank_history) pour ne garder que 30 jours
  if (!isSingleUserMode) {
    try {
      const { error: purgeError } = await supabase.rpc('purge_rank_history');
      if (purgeError) {
        console.error('❌ Error during rank_history purge:', purgeError.message);
      } else {
        console.log('✅ rank_history purged (only last 30 days kept).');
      }
    } catch (e) {
      console.error('❌ Exception during rank_history purge:', e.message);
    }
  }
  
  console.log('--- Fin du Worker ---');
  return summary;
}

module.exports = {
  runWorker,
  refreshDegenRank,
  // On n'exporte plus les fonctions internes
};

// Point d'entrée principal si le script est exécuté directement
if (require.main === module) {
  const userAddress = process.argv[2];
  const scanMode = process.argv[3] || 'full';
  
  console.log('🚀 Starting worker with arguments:', { userAddress, scanMode });
  
  runWorker(userAddress, scanMode)
    .then(summary => {
      console.log('✅ Worker completed successfully:', summary);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Worker failed:', error);
      process.exit(1);
    });
} 