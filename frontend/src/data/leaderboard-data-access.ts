import { useQuery } from "@tanstack/react-query";
import { getFullPumpLeaderboard } from "./platforms/pump-data-access";
import { getFullBonkLeaderboard } from "./platforms/bonk-data-access";
export { type LeaderboardEntry } from './platforms/common-platform-access';

// Hook de requête générique
export function useLeaderboard(platform: 'pump' | 'bonk') {
  return useQuery({
    queryKey: ['leaderboard', platform],
    queryFn: () => platform === 'pump' ? getFullPumpLeaderboard() : getFullBonkLeaderboard(),
  });
}
