import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcon from "@expo/vector-icons/MaterialCommunityIcons";

interface RankEvolutionTestProps {
  evolution: 'up' | 'down' | 'same' | number;
}

export function RankEvolutionTest({ evolution }: RankEvolutionTestProps) {
  const theme = useTheme();

  const renderEvolution = () => {
    if (evolution === 'same' || evolution === 0) {
      return (
        <View style={styles.evolutionContainer}>
          <MaterialCommunityIcon 
            name="minus" 
            size={12} 
            color={theme.colors.onSurfaceVariant} 
          />
          <Text style={[styles.evolutionText, { color: theme.colors.onSurfaceVariant }]}>
            Stable
          </Text>
        </View>
      );
    }
    
    if (evolution === 'up' || (typeof evolution === 'number' && evolution > 0)) {
      return (
        <View style={styles.evolutionContainer}>
          <MaterialCommunityIcon 
            name="trending-up" 
            size={12} 
            color={theme.colors.primary} 
          />
          {typeof evolution === 'number' && (
            <Text style={[styles.evolutionText, { color: theme.colors.primary }]}>
              +{evolution}
            </Text>
          )}
        </View>
      );
    }
    
    if (evolution === 'down' || (typeof evolution === 'number' && evolution < 0)) {
      return (
        <View style={styles.evolutionContainer}>
          <MaterialCommunityIcon 
            name="trending-down" 
            size={12} 
            color={theme.colors.error} 
          />
          {typeof evolution === 'number' && (
            <Text style={[styles.evolutionText, { color: theme.colors.error }]}>
              {evolution}
            </Text>
          )}
        </View>
      );
    }
    
    return null;
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>
        Test d'évolution du rang: {JSON.stringify(evolution)}
      </Text>
      {renderEvolution()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  evolutionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  evolutionText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
}); 