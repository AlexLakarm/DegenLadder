import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '../../theme';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

type AppTitleProps = {
  children: React.ReactNode;
};

const AppTitle: React.FC<AppTitleProps> = ({ children }) => {
  const theme = useAppTheme();
  const animatedValue = useSharedValue(0);

  // Déclenche l'animation de glitch
  const triggerGlitch = () => {
    animatedValue.value = withSequence(
      withTiming(1, { duration: 60 }), // Phase d'apparition rapide
      withDelay(80, withTiming(0, { duration: 120 })) // Disparition un peu plus lente
    );
  };

  // Lance l'animation selon le cycle 1s -> 7s -> 1s -> ...
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let patternIndex = 0;
    const pattern = [1000, 7000, 1000, 7000]; // Le cycle des délais en ms

    const scheduleGlitch = () => {
      // On prend le délai actuel dans le cycle
      const delay = pattern[patternIndex];
      // On prépare l'index pour le prochain cycle
      patternIndex = (patternIndex + 1) % pattern.length;

      timeout = setTimeout(() => {
        triggerGlitch();
        scheduleGlitch(); // On planifie la prochaine animation
      }, delay);
    };

    scheduleGlitch(); // On lance le premier cycle

    return () => clearTimeout(timeout); // Nettoyage du timeout
  }, []);

  // Style pour la première couche de glitch (verte)
  const glitchLayer1 = useAnimatedStyle(() => {
    const opacity = animatedValue.value;
    const translateX = (Math.random() - 0.5) * 12 * animatedValue.value;
    const translateY = (Math.random() - 0.5) * 12 * animatedValue.value;
    return {
      opacity,
      transform: [{ translateX }, { translateY }],
    };
  });

  // Style pour la deuxième couche de glitch (magenta)
  const glitchLayer2 = useAnimatedStyle(() => {
    const opacity = animatedValue.value;
    const translateX = (Math.random() - 0.5) * 12 * animatedValue.value;
    const translateY = (Math.random() - 0.5) * 12 * animatedValue.value;
    return {
      opacity,
      transform: [{ translateX }, { translateY }],
    };
  });

  return (
    <View style={styles.container}>
      {/* Couche de base, toujours visible */}
      <Animated.Text style={[styles.title, { color: theme.colors.onSurface }]}>
        {children}
      </Animated.Text>
      {/* Couches de glitch, superposées et animées */}
      <Animated.Text style={[styles.title, styles.glitchText, { color: '#00ff00' }, glitchLayer1]}>
        {children}
      </Animated.Text>
      <Animated.Text style={[styles.title, styles.glitchText, { color: '#ff00ff' }, glitchLayer2]}>
        {children}
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: '300',
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  glitchText: {
    position: 'absolute', // Permet de superposer les textes
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
});

export default AppTitle; 