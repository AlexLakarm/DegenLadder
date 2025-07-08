import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, Animated } from 'react-native';
import { Gyroscope } from 'expo-sensors';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../theme';

const GyroTitle = () => {
  const theme = useAppTheme();
  const [subscription, setSubscription] = useState(null);
  const animatedValue = new Animated.Value(0);

  useEffect(() => {
    Gyroscope.isAvailableAsync().then(isAvailable => {
      if (isAvailable) {
        const sub = Gyroscope.addListener(gyroscopeData => {
          // Utiliser la rotation sur l'axe y pour un effet de balayage gauche-droite
          // On normalise et on lisse la valeur
          const { y } = gyroscopeData;
          Animated.spring(animatedValue, {
            toValue: y,
            speed: 20,
            bounciness: 10,
            useNativeDriver: false, 
          }).start();
        });
        setSubscription(sub);
      }
    });

    return () => {
      subscription && subscription.remove();
    };
  }, []);

  const translateX = animatedValue.interpolate({
    inputRange: [-1, 1],
    outputRange: [-30, 30], // Le dégradé se déplacera de -30px à 30px
    extrapolate: 'clamp',
  });

  const gradientColors = [
    'transparent',
    'rgba(255, 255, 255, 0.4)', // Reflet blanc/chrome
    'transparent',
  ];

  return (
    <Text style={[styles.title, { color: theme.colors.primary }]}>
      DegenRank
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        />
      </Animated.View>
    </Text>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden', // Important pour masquer le dégradé qui dépasse
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    width: '30%', // Largeur du reflet
    left: '35%',
  },
});

export default GyroTitle; 