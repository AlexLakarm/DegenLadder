import { LeaderboardEntry, getFullLeaderboard } from './common-platform-access';

const PUMP_TARGET_ADDRESSES = [
  "6guZ6HZYC5xZpVCV38bRN4ctZDjASGpS5A9RjH9En4UF",
  "714r169zqiSHiEVM2g9zVM5h8HJQSahdssWfBLnPA7pK",
  "9y71FvkZeEir3CVkuXJpuvNyRmxuPH2cXSwbYGW8DQoz",
];

export async function getFullPumpLeaderboard(): Promise<LeaderboardEntry[]> {
  console.log(`Fetching pump.fun leaderboard for ${PUMP_TARGET_ADDRESSES.length} addresses...`);
  return getFullLeaderboard(PUMP_TARGET_ADDRESSES, 'pump');
} 