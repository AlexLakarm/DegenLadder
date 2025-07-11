import { useQuery } from "@tanstack/react-query";
import { getLeaderboardFromApi } from "./platforms/common-platform-access";
export { type LeaderboardEntry } from './platforms/common-platform-access';

// Hook de requête générique
export function useLeaderboard(platform: 'pump' | 'bonk') {
  return useQuery({
    queryKey: ['leaderboard', platform],
    queryFn: () => getLeaderboardFromApi(platform),
  });
}
 