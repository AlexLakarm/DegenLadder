import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Constants from "expo-constants";

const screenWidth = Dimensions.get('window').width;

interface ScoreHistoryEntry {
  date: string;
  score: number;
  rank: number;
}

interface ScoreEvolutionChartProps {
  userAddress: string;
}

export function ScoreEvolutionChart({ userAddress }: ScoreEvolutionChartProps) {
  const [chartData, setChartData] = useState<ScoreHistoryEntry[]>([]);

  const { data: scoreHistory, isLoading, error } = useQuery({
    queryKey: ['scoreHistory', userAddress],
    queryFn: async () => {
      const API_ENDPOINT = Constants.expoConfig?.extra?.apiEndpoint;
      const response = await fetch(`${API_ENDPOINT}/user/${userAddress}/score-history`);
      if (!response.ok) {
        throw new Error('Failed to fetch score history');
      }
      return response.json() as ScoreHistoryEntry[];
    },
    enabled: !!userAddress,
  });

  useEffect(() => {
    if (scoreHistory && scoreHistory.length > 0) {
      // Prendre seulement les 30 dernières dates
      const last30Entries = scoreHistory.slice(-30);
      setChartData(last30Entries);
    }
  }, [scoreHistory]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Évolution du Score</Text>
        <Text style={styles.loading}>Chargement...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Évolution du Score</Text>
        <Text style={styles.error}>Erreur lors du chargement</Text>
      </View>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Évolution du Score</Text>
        <Text style={styles.noData}>Aucune donnée disponible</Text>
      </View>
    );
  }

  const maxScore = Math.max(...chartData.map(entry => entry.score));
  const minScore = Math.min(...chartData.map(entry => entry.score));
  const scoreRange = maxScore - minScore;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartContainer}>
        <View style={styles.chart}>
          {chartData.map((entry, index) => {
            const date = new Date(entry.date);
            const heightPercentage = scoreRange > 0 ? ((entry.score - minScore) / scoreRange) * 100 : 50;
            
            return (
              <View key={index} style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: Math.max(20, heightPercentage * 1.5), // Minimum 20px height
                      backgroundColor: '#10b981' // Emerald green 500
                    }
                  ]} 
                />
                <Text style={styles.barLabel}>{`${date.getDate()}/${date.getMonth() + 1}`}</Text>
                <Text style={styles.barValue}>{entry.score}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginTop: 0,
    marginBottom: 16,
  },

  chartContainer: {
    marginVertical: 8,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 8,
  },
  barContainer: {
    alignItems: 'center',
    marginHorizontal: 4,
    minWidth: 40,
  },
  bar: {
    width: 30,
    borderRadius: 4,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
  },
  barValue: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 2,
  },
  loading: {
    color: '#9ca3af',
    textAlign: 'center',
    padding: 20,
  },
  error: {
    color: '#ef4444',
    textAlign: 'center',
    padding: 20,
  },
  noData: {
    color: '#9ca3af',
    textAlign: 'center',
    padding: 20,
  },
}); 