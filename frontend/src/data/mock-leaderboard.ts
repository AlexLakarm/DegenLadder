export interface LeaderboardEntry {
  rank: number;
  address: string;
  name: string;
  totalProfit: number;
  winningTrades: number;
  losingTrades: number;
  rankChange24h: number;
}

// Our current user's address for highlighting purposes.
// In a real app, this would come from the connected wallet.
export const currentUserAddress = "8G...s7"; 

export const mockLeaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    address: 'DEGEN...',
    name: 'Degen #1',
    totalProfit: 150.5,
    winningTrades: 25,
    losingTrades: 5,
    rankChange24h: 2,
  },
  {
    rank: 2,
    address: 'DEGEN...',
    name: 'Degen #2',
    totalProfit: 120.2,
    winningTrades: 18,
    losingTrades: 10,
    rankChange24h: -1,
  },
  { rank: 3, address: "H5...zI", name: "RugSurvivor", totalProfit: 92109, winningTrades: 0, losingTrades: 0, rankChange24h: 0 },
  { rank: 4, address: "J7...aO", name: "DiamondHandz", totalProfit: 88765, winningTrades: 0, losingTrades: 0, rankChange24h: 5 },
  { rank: 5, address: "L9...bP", name: "PaperHandz", totalProfit: 85432, winningTrades: 0, losingTrades: 0, rankChange24h: -2 },
  { rank: 6, address: "N1...cQ", name: "MoonShotter", totalProfit: 82109, winningTrades: 0, losingTrades: 0, rankChange24h: 12 },
  { rank: 7, address: "P3...dR", name: "PumpMaster", totalProfit: 78765, winningTrades: 0, losingTrades: 0, rankChange24h: -4 },
  { rank: 8, address: "R5...eS", name: "DumpMaster", totalProfit: 75432, winningTrades: 0, losingTrades: 0, rankChange24h: 1 },
  { rank: 9, address: "T7...fT", name: "Ser", totalProfit: 72109, winningTrades: 0, losingTrades: 0, rankChange24h: 8 },
  { rank: 10, address: "V9...gU", name: "Gm", totalProfit: 68765, winningTrades: 0, losingTrades: 0, rankChange24h: -3 },
  { rank: 11, address: "X1...hV", name: "Wagmi", totalProfit: 65432, winningTrades: 0, losingTrades: 0, rankChange24h: 22 },
  { rank: 12, address: "Z3...iW", name: "Ngmi", totalProfit: 62109, winningTrades: 0, losingTrades: 0, rankChange24h: -10 },
  { rank: 13, address: "B5...jX", name: "Fren", totalProfit: 58765, winningTrades: 0, losingTrades: 0, rankChange24h: 7 },
  { rank: 14, address: "D7...kY", name: "Based", totalProfit: 55432, winningTrades: 0, losingTrades: 0, rankChange24h: 2 },
  { rank: 15, address: currentUserAddress, name: "You", totalProfit: 52109, winningTrades: 0, losingTrades: 0, rankChange24h: 15 },
  { rank: 16, address: "H1...mB", name: "Cope", totalProfit: 48765, winningTrades: 0, losingTrades: 0, rankChange24h: -8 },
  { rank: 17, address: "J3...nC", name: "Seethe", totalProfit: 45432, winningTrades: 0, losingTrades: 0, rankChange24h: -5 },
  { rank: 18, address: "L5...oD", name: "Mald", totalProfit: 42109, winningTrades: 0, losingTrades: 0, rankChange24h: 18 },
  { rank: 19, address: "N7...pE", name: "Shill", totalProfit: 38765, winningTrades: 0, losingTrades: 0, rankChange24h: -11 },
  { rank: 20, address: "P9...qF", name: "Fud", totalProfit: 35432, winningTrades: 0, losingTrades: 0, rankChange24h: 3 },
]; 