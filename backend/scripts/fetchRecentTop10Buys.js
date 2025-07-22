require('dotenv').config(); // Charger .env AVANT tout autre import
const supabase = require('../lib/supabaseClient');
const axios = require('axios');

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const SOLANA_ENV = process.env.SOLANA_ENV || 'mainnet';
const API_BASE = SOLANA_ENV === 'devnet'
  ? 'https://api-devnet.helius.xyz'
  : 'https://api.helius.xyz';

const PERIODS = [
  { key: '24h', leaderboard: 'degen_rank_24h' },
  { key: 'yearly', leaderboard: 'degen_rank' },
];
const HOURS_WINDOW = 12;
const MAX_USERS = 10;
const PLATFORMS = ['pump', 'bonk'];
const SOL_MINT = 'So11111111111111111111111111111111111111112';

async function fetchTop10Addresses(leaderboardView) {
  const { data, error } = await supabase
    .from(leaderboardView)
    .select('user_address')
    .order('rank', { ascending: true })
    .limit(MAX_USERS);
  if (error) throw error;
  return data ? data.map(u => u.user_address) : [];
}

async function fetchRecentBuysForUser(address, sinceTimestamp) {
  const url = `${API_BASE}/v0/addresses/${address}/transactions?api-key=${HELIUS_API_KEY}`;
  let lastSignature = null;
  let buys = [];
  let keepFetching = true;

  while (keepFetching) {
    const fetchUrl = lastSignature ? `${url}&before=${lastSignature}` : url;
    const { data } = await axios.get(fetchUrl);
    if (!data || data.length === 0) break;

    for (const tx of data) {
      const txDate = new Date(tx.timestamp * 1000);
      if (txDate < sinceTimestamp) {
        keepFetching = false;
        break;
      }
      if (tx.error) continue;
      const tokenTransfers = tx.tokenTransfers || [];
      const nativeTransfers = tx.nativeTransfers || [];
      // On ne garde que les transferts où l'utilisateur reçoit un token pump/bonk
      for (const t of tokenTransfers) {
        // On détecte la plateforme par le mint
        const platform = t.mint.endsWith('pump') ? 'pump' : (t.mint.endsWith('bonk') ? 'bonk' : null);
        if (!platform) continue;
        if (t.toUserAccount !== address) continue; // On ne garde que les entrées (buy)
        // Calcul du montant SOL dépensé pour ce buy
        let solOut = 0;
        for (const nt of nativeTransfers) {
          if (nt.fromUserAccount === address) solOut += nt.amount;
        }
        if (tx.feePayer === address) solOut += tx.fee;
        const buyAmountSol = solOut / 1e9;
        if (buyAmountSol > 0) {
          buys.push({
            user_address: address,
            platform,
            token_mint: t.mint,
            buy_signature: tx.signature,
            buy_amount_sol: buyAmountSol,
            buy_at: txDate.toISOString().replace(/\.[0-9]{3}Z$/, 'Z'), // Forcer le format ISO UTC avec 'Z'
            token_name: null, // à enrichir si besoin
          });
        }
      }
    }
    lastSignature = data[data.length - 1].signature;
    // Pause pour éviter le rate limit
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return buys;
}

async function main() {
  console.log(`\n=== [${new Date().toISOString()}] Début du script fetchRecentTop10Buys.js ===`);
  try {
    const nowSystem = new Date();
    const nowUtc = new Date(nowSystem.toISOString());
    console.log(`Heure système locale : ${nowSystem.toString()}`);
    console.log(`Heure UTC : ${nowUtc.toISOString()}`);
    const since = new Date(Date.now() - HOURS_WINDOW * 60 * 60 * 1000);
    console.log(`Fenêtre since (ISO): ${since.toISOString()}`);
    console.log(`Fenêtre since (timestamp): ${since.getTime()}`);
    console.log(`Fenêtre since (locale): ${since.toString()}`);
    // Purge des anciens enregistrements
    await supabase
      .from('recent_top10_buys')
      .delete()
      .not('buy_at', 'gte', since.toISOString());

    let allBuys = [];
    for (const { key, leaderboard } of PERIODS) {
      console.log(`\n[${new Date().toISOString()}] Début du fetch pour la période '${key}' (${leaderboard})`);
      const addresses = await fetchTop10Addresses(leaderboard);
      for (const address of addresses) {
        console.log(`[${new Date().toISOString()}] Fetch des transactions pour l'adresse ${address}...`);
        const buys = await fetchRecentBuysForUser(address, since);
        if (buys.length > 0) {
          const firstBuy = buys[0];
          const lastBuy = buys[buys.length - 1];
          console.log(`[${new Date().toISOString()}] Premier buy pour ${address}: ${firstBuy.buy_at}`);
          console.log(`[${new Date().toISOString()}] Dernier buy pour ${address}: ${lastBuy.buy_at}`);
        }
        console.log(`[${new Date().toISOString()}] ${buys.length} buys trouvés pour ${address}`);
        for (const buy of buys) {
          allBuys.push({ ...buy, leaderboard_period: key });
        }
      }
    }

    if (allBuys.length > 0) {
      // Déduplication par (user_address, buy_signature, leaderboard_period)
      const uniqueBuysMap = new Map();
      for (const buy of allBuys) {
        const key = `${buy.user_address}_${buy.buy_signature}_${buy.leaderboard_period}`;
        if (!uniqueBuysMap.has(key)) {
          uniqueBuysMap.set(key, buy);
        }
      }
      const uniqueBuys = Array.from(uniqueBuysMap.values());
      // On supprime les doublons potentiels (par signature + période)
      for (const period of PERIODS) {
        await supabase
          .from('recent_top10_buys')
          .delete()
          .eq('leaderboard_period', period.key)
          .gte('buy_at', since.toISOString());
      }
      const { error: insertError } = await supabase
        .from('recent_top10_buys')
        .insert(uniqueBuys);
      if (insertError) throw insertError;
      console.log(`✅ ${uniqueBuys.length} unique buys inserted in recent_top10_buys.`);
    } else {
      console.log('Aucun buy à insérer.');
    }

    // Mettre à jour la date de dernier refresh dans system_status
    const { error: updateError } = await supabase
      .from('system_status')
      .update({ recent_top10_buys_refreshed_at: new Date().toISOString() })
      .eq('id', true);
    if (updateError) throw updateError;
    console.log('✅ system_status.recent_top10_buys_refreshed_at mis à jour.');
  } catch (e) {
    console.error('❌ Erreur lors du rafraîchissement des recent_top10_buys:', e.message);
    process.exit(1);
  }
  console.log(`\n=== [${new Date().toISOString()}] Fin du script fetchRecentTop10Buys.js ===`);
  process.exit(0);
}

main(); 