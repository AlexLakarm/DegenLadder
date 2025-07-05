import { LeaderboardEntry, getFullLeaderboard } from './common-platform-access';

const BONK_TARGET_ADDRESSES = [
  "3Dimjf2UDeZvsSuUYU22ovZ6uvF8z6KUnXMmokQuYfi2",
];

export async function getFullBonkLeaderboard(): Promise<LeaderboardEntry[]> {
  console.log(`Fetching letsbonk leaderboard for ${BONK_TARGET_ADDRESSES.length} addresses...`);
  return getFullLeaderboard(BONK_TARGET_ADDRESSES, 'bonk');
} 