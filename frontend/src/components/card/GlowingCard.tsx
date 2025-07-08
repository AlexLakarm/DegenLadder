import React, { useState } from 'react';
import { View, StyleSheet, Platform, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCardTilt } from '../../utils/useCardTilt';
import { useAppTheme } from '../../theme';
import {
  Canvas,
  Rect,
  useClockValue,
  useComputedValue,
  Paint,
  Group,
  BlurMask,
} from '@shopify/react-native-skia';

type GlowingCardProps = {
  children: React.ReactNode;
};

export function GlowingCard({ children }: GlowingCardProps) {
  const tilt = useCardTilt();
  const theme = useAppTheme();
  const [cardDimensions, setCardDimensions] = useState({ width: 0, height: 0 });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCardDimensions({ width, height });
  };

  // Skia shimmer animation
  const clock = useClockValue();
  const shimmerX = useComputedValue(() => {
    if (cardDimensions.width === 0) return -100; // Don't animate if width is unknown
    return (clock.current % 4000) / 4000 * (cardDimensions.width + 100) - 100;
  }, [clock, cardDimensions.width]);

  const styles = StyleSheet.create({
    card: {
      width: '100%',
      height: '100%',
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden', // Important for containing Skia canvas and gradient
      ...Platform.select({
        android: {
          elevation: 10,
        },
        ios: {
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 15,
        },
      }),
    },
    gradient: {
      ...StyleSheet.absoluteFillObject,
    },
    canvas: {
      ...StyleSheet.absoluteFillObject,
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        // Make sure content is on top of the gradient and canvas
        zIndex: 1,
    }
  });

  return (
    <View 
      onLayout={onLayout}
      style={[styles.card, {
        transform: [
          { perspective: 1000 },
          { rotateX: `${tilt.x}deg` },
          { rotateY: `${tilt.y}deg` },
        ],
      }]}
    >
      <LinearGradient
        colors={[theme.colors.secondary, theme.colors.primaryContainer]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {cardDimensions.width > 0 && (
        <Canvas style={styles.canvas}>
          {/* Shimmer bar */}
          <Group>
            <Paint color="white" opacity={0.1}>
              <BlurMask blur={30} style="solid" />
            </Paint>
            <Rect
              x={shimmerX}
              y={-50}
              width={80}
              height={cardDimensions.height + 100}
              transform={[{ rotate: Math.PI / 12 }]}
              color="white"
            />
          </Group>
        </Canvas>
      )}

      <View style={styles.contentContainer}>
        {children}
      </View>
    </View>
  );
} 