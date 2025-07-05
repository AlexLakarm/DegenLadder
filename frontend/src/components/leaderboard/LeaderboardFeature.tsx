import { useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { useLeaderboard } from '../../data/leaderboard-data-access';
import { LeaderboardList } from './LeaderboardList';

type Platform = 'pump' | 'bonk';

export function LeaderboardFeature() {
  const [platform, setPlatform] = useState<Platform>('pump');
  const query = useLeaderboard(platform);

  return (
    <View>
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, platform === 'pump' && styles.activeTab]} 
          onPress={() => setPlatform('pump')}
        >
          <Text style={[styles.tabText, platform === 'pump' && styles.activeTabText]}>Pump.fun</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, platform === 'bonk' && styles.activeTab]} 
          onPress={() => setPlatform('bonk')}
        >
          <Text style={[styles.tabText, platform === 'bonk' && styles.activeTabText]}>LetsBonk</Text>
        </TouchableOpacity>
      </View>

      {query.isLoading && <ActivityIndicator />}
      {query.isError && (
        <Text>Error loading leaderboard. {String(query.error)}</Text>
      )}
      {query.isSuccess && (
        <View>
          <LeaderboardList data={query.data} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: '#f0f0f0',
  },
  activeTab: {
    backgroundColor: '#6200ee',
  },
  tabText: {
    fontWeight: 'bold',
    color: '#6200ee',
  },
  activeTabText: {
    color: '#ffffff',
  },
}); 