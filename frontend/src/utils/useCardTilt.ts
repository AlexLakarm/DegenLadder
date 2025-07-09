import { useMemo } from 'react';
import { PanResponder } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';

const MAX_ROTATION = 15; // en degrés

export const useCardTilt = (cardWidth: number, cardHeight: number) => {
  const touchX = useSharedValue(-1);
  const touchY = useSharedValue(-1);
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          touchX.value = locationX;
          touchY.value = locationY;

          const newRotateY = interpolate(
            locationX,
            [0, cardWidth],
            [-MAX_ROTATION, MAX_ROTATION]
          );
          const newRotateX = interpolate(
            locationY,
            [0, cardHeight],
            [MAX_ROTATION, -MAX_ROTATION]
          );

          rotateX.value = withSpring(newRotateX, { damping: 15, stiffness: 150 });
          rotateY.value = withSpring(newRotateY, { damping: 15, stiffness: 150 });
        },
        onPanResponderRelease: () => {
          touchX.value = -1;
          touchY.value = -1;
          rotateX.value = withSpring(0, { damping: 15, stiffness: 150 });
          rotateY.value = withSpring(0, { damping: 15, stiffness: 150 });
        },
        onPanResponderTerminate: () => {
          touchX.value = -1;
          touchY.value = -1;
          rotateX.value = withSpring(0);
          rotateY.value = withSpring(0);
        },
      }),
    [cardWidth, cardHeight]
  );

  const animatedStyle = useAnimatedStyle(() => {
    const rotateXVal = `${rotateX.value}deg`;
    const rotateYVal = `${rotateY.value}deg`;
    return {
      transform: [
        { perspective: 1000 }, // La perspective est cruciale pour l'effet 3D
        { rotateX: rotateXVal },
        { rotateY: rotateYVal },
      ],
    };
  });

  return { panResponder, animatedStyle, touchX, touchY };
}; 