export interface LeaderboardEntry {
  rank: number;
  user_address: string;
  name: string;
  pnl_sol: number;
  degen_score: number;
  winningTrades: number;
  losingTrades: number;
  rankChange24h: 'up' | 'down' | 'same' | number; // 'up', 'down', 'same' ou nombre pour l'évolution exacte
  status: 'WIN' | 'LOSS';
} 