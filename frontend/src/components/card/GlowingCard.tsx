import React, { useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../theme';
import {
  Canvas,
  Mask,
  Rect,
  LinearGradient,
  vec,
  RoundedRect, // On utilise RoundedRect pour le liseré
} from '@shopify/react-native-skia';
import Animated, {
  useDerivedValue,
} from 'react-native-reanimated';
import { useCardTilt } from '../../utils/useCardTilt';

type GlowingCardProps = {
  children: React.ReactNode;
};

export function GlowingCard({ children }: GlowingCardProps) {
  const theme = useAppTheme();
  const [cardDimensions, setCardDimensions] = useState({ width: 0, height: 0 });

  const { panResponder, animatedStyle, touchX, touchY } = useCardTilt(
    cardDimensions.width,
    cardDimensions.height
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCardDimensions({ width, height });
  };
  
  const gradientOrigin = useDerivedValue(() => {
    // Le reflet suit le doigt, et disparaît quand on ne touche pas
    if (touchX.value === -1 || touchY.value === -1) {
        return vec(cardDimensions.width * 2, cardDimensions.height * 2); 
    }
    return vec(touchX.value, touchY.value);
  }, [touchX, touchY, cardDimensions]);


  const styles = StyleSheet.create({
    card: {
      width: '100%',
      height: '100%',
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
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
        zIndex: 1,
    }
  });

  return (
    <Animated.View 
      onLayout={onLayout}
      style={[styles.card, animatedStyle]}
      {...panResponder.panHandlers}
    >
      <ExpoLinearGradient
        colors={[theme.colors.secondary, theme.colors.primaryContainer]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {cardDimensions.width > 0 && (
        <Canvas style={styles.canvas}>
          <Mask
            mask={
              <LinearGradient
                start={vec(0, 0)}
                end={vec(cardDimensions.width, cardDimensions.height)}
                colors={['rgba(0, 0, 0, 0.2)', 'rgba(0, 0, 0, 1)', 'rgba(0, 0, 0, 0.2)']}
              />
            }
          >
            <Rect
              x={0}
              y={0}
              width={cardDimensions.width}
              height={cardDimensions.height}
            >
              <LinearGradient
                origin={gradientOrigin}
                start={vec(0, 0)}
                end={vec(cardDimensions.width, 0)}
                colors={['rgba(255,255,255,0.4)', 'rgba(100,255,200,0.7)', 'rgba(255,255,255,0.4)']}
              />
            </Rect>
          </Mask>
          
          {/* Liseré intérieur noir */}
          <RoundedRect
            x={4}
            y={4}
            width={cardDimensions.width - 8}
            height={cardDimensions.height - 8}
            r={16} // Rayon ajusté à l'inset
            color="black"
            style="stroke"
            strokeWidth={1} // Liseré plus fin
          />
        </Canvas>
      )}

      <View style={styles.contentContainer}>
        {children}
      </View>
    </Animated.View>
  );
}