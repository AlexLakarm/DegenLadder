import { useQuery } from "@tanstack/react-query";
import { getLeaderboardFromApi, API_ENDPOINT } from "./platforms/common-platform-access";
export { type LeaderboardEntry } from './platforms/common-platform-access';

// Hook de requête générique
export function useLeaderboard(platform: 'pump' | 'bonk') {
  return useQuery({
    queryKey: ['leaderboard', platform],
    queryFn: () => getLeaderboardFromApi(platform),
  });
}
 
export function useSystemStatus() {
  return useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      const response = await fetch(`${API_ENDPOINT}/status`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
  });
}
 