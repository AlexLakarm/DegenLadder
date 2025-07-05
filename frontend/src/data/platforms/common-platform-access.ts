import Constants from "expo-constants";

const HELIUS_API_KEY = Constants.expoConfig?.extra?.solanaRpcEndpoint
  .split("api-key=")[1];

// INTERFACES
export interface LeaderboardEntry {
  rank: number;
  rankChange24h: 'up' | 'down' | 'same';
  address: string;
  name: string;
  totalProfit: number;
  winningTrades: number;
  losingTrades: number;
}

export interface PlatformActivity {
  address: string;
  name: string;
  realizedPnl: number;
  winningTrades: number;
  losingTrades: number;
}

// LOGIQUE COMMUNE
async function getFullHistory(address: string) {
  const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${HELIUS_API_KEY}`;
  const transactions: any[] = [];
  let lastSignature: string | null = null;

  console.log("Starting full history fetch...");

  while (true) {
    const fetchUrl: string = lastSignature ? `${url}&before=${lastSignature}` : url;
    const response: Response = await fetch(fetchUrl);
    const data: any[] = await response.json();

    if (!response.ok) {
      console.error("API Error:", data);
      throw new Error(`Helius API error: ${response.status}`);
    }

    if (data.length === 0) {
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

export async function getPlatformActivity(address: string, platformSuffix: string): Promise<PlatformActivity> {
  console.log(`Analyzing history for ${address} on platform ".${platformSuffix}"...`);
  const allTransactions = await getFullHistory(address);

  const trades: { [mint: string]: { solSpent: number; solReceived: number; hasBought: boolean; hasSold: boolean; } } = {};

  for (const tx of allTransactions) {
    if (tx.error) continue;

    const tokenTransfers = tx.tokenTransfers ?? [];
    if (tokenTransfers.length === 0) continue;

    const SOL_MINT = "So11111111111111111111111111111111111111112";
    let solIn = 0;
    let solOut = 0;
    
    const hasWsolTransfer = tokenTransfers.some((t: any) => t.mint === SOL_MINT && (t.fromUserAccount === address || t.toUserAccount === address));

    if (hasWsolTransfer) {
      for (const transfer of tokenTransfers) {
        if (transfer.mint === SOL_MINT && transfer.tokenAmount) {
          let wsolAmountLamports = 0;
          if (typeof transfer.tokenAmount === 'object' && transfer.tokenAmount.amount) {
            wsolAmountLamports = Number(transfer.tokenAmount.amount);
          } else if (typeof transfer.tokenAmount === 'number') {
            wsolAmountLamports = transfer.tokenAmount * 1e9;
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

    const platformMintsInTx = [...new Set(tokenTransfers.map((t: any) => t.mint).filter((m: string) => m.endsWith(platformSuffix)))];

    for (const mint of platformMintsInTx) {
      const isBuy = tokenTransfers.some((t: any) => t.mint === mint && t.toUserAccount === address);
      const isSell = tokenTransfers.some((t: any) => t.mint === mint && t.fromUserAccount === address);
      if (isBuy && isSell) continue;

      const mintStr = mint as string;
      if (!(mintStr in trades)) {
        trades[mintStr] = { solSpent: 0, solReceived: 0, hasBought: false, hasSold: false };
      }
      if (isBuy) {
        trades[mintStr].solSpent += (solOut - solIn);
        trades[mintStr].hasBought = true;
      } else if (isSell) {
        trades[mintStr].solReceived += (solIn - solOut);
        trades[mintStr].hasSold = true;
      }
    }
  }
  
  console.log(`[${address.substring(0,4)}...] Final Trades Object for W/L:`, JSON.stringify(trades, null, 2));

  let winningTrades = 0;
  let losingTrades = 0;
  let totalProfitSol = 0;

  for (const mint in trades) {
    const trade = trades[mint];
    if (trade.hasBought && trade.hasSold) {
      const profit = trade.solReceived - trade.solSpent;
      if (profit > 0) {
        winningTrades++;
      } else {
        losingTrades++;
      }
      totalProfitSol += profit;
    }
  }
  
  const realizedPnlSol = totalProfitSol / 1e9;
  console.log(`[${address.substring(0, 4)}...] Realized P/L: ${realizedPnlSol.toFixed(4)} SOL. Wins: ${winningTrades}, Losses: ${losingTrades}`);

  return {
    address: address,
    name: `User ${address.substring(0, 4)}...`,
    realizedPnl: realizedPnlSol,
    winningTrades: winningTrades,
    losingTrades: losingTrades,
  };
}

export async function getFullLeaderboard(targetAddresses: string[], platformSuffix: string): Promise<LeaderboardEntry[]> {
  const activities: PlatformActivity[] = [];
  for (const addr of targetAddresses) {
    try {
      const activity = await getPlatformActivity(addr, platformSuffix);
      activities.push(activity);
    } catch (error) {
      console.error(`Failed to fetch activity for ${addr}:`, error);
    }
  }

  activities.sort((a, b) => b.realizedPnl - a.realizedPnl);

  const leaderboard: LeaderboardEntry[] = activities.map((activity, index) => ({
    ...activity,
    rank: index + 1,
    rankChange24h: 'same',
    totalProfit: activity.realizedPnl,
  }));

  return leaderboard;
} 