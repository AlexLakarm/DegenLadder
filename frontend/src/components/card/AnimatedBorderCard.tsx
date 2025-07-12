import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { useAppTheme } from '../../theme';

type AnimatedBorderCardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const DURATION = 4000; // Durée pour une rotation complète

export function AnimatedBorderCard({ children, style }: AnimatedBorderCardProps) {
  const theme = useAppTheme();
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Démarrage de l'animation en boucle
    rotation.value = withRepeat(
      withTiming(360, { duration: DURATION, easing: Easing.linear }),
      -1, // Répétition infinie
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const styles = StyleSheet.create({
    container: {
      borderRadius: 16,
      padding: 2.5, // Cette marge intérieure crée l'épaisseur de la bordure
      overflow: 'hidden',
      backgroundColor: 'transparent',
    },
    gradientWrapper: {
      ...StyleSheet.absoluteFillObject,
      width: '300%', // On le fait beaucoup plus grand pour ne pas voir les bords pendant la rotation
      height: '300%',
      left: '-100%',
      top: '-100%',
    },
    gradient: {
      flex: 1,
    },
    contentContainer: {
      backgroundColor: theme.colors.elevation.level2, // L'arrière-plan intérieur, un peu plus clair
      borderRadius: 14, // Légèrement plus petit pour laisser apparaître la bordure
      overflow: 'hidden',
    },
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.gradientWrapper, animatedStyle]}>
        <LinearGradient
          colors={['#9400D3', '#00FFA3', '#9400D3']} // Violet -> Vert -> Violet
          style={styles.gradient}
          start={{ x: 0.0, y: 0.5 }}
          end={{ x: 1.0, y: 0.5 }}
        />
      </Animated.View>
      <View style={styles.contentContainer}>
        {children}
      </View>
    </View>
  );
} 