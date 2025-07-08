import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useAppTheme } from '../../theme';

type ShimmerTitleProps = {
  children: React.ReactNode;
};

const ShimmerTitle: React.FC<ShimmerTitleProps> = ({ children }) => {
  const theme = useAppTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [viewWidth, setViewWidth] = useState(0);

  useEffect(() => {
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 2500, // Durée de l'animation
        easing: Easing.linear,
        useNativeDriver: false, // Doit être false pour les dégradés et MaskView
      })
    ).start();
  }, [animatedValue]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-viewWidth, viewWidth],
  });

  const gradientColors = [
    'transparent',
    'rgba(255, 255, 255, 0.5)',
    'transparent',
  ] as const;

  return (
    <MaskedView
      style={styles.maskedView}
      onLayout={(event) => setViewWidth(event.nativeEvent.layout.width)}
      maskElement={
        <Text style={[styles.title, { backgroundColor: 'transparent' }]}>
          {children}
        </Text>
      }
    >
      <Text style={[styles.title, { color: theme.colors.primary }]}>
        {children}
      </Text>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </MaskedView>
  );
};

const styles = StyleSheet.create({
  maskedView: {
    height: 60,
    width: '100%',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ShimmerTitle; 