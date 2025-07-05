import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gyroscope } from 'expo-sensors';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

const CHROME_COLORS = ['#d4d4d4', '#fafafa', '#d4d4d4', '#a3a3a3', '#fafafa', '#a3a3a3'];
const TITLE_TEXT = 'DegenRank';
const GYRO_SENSITIVITY = 1.5;

export function GyroTitle() {
  // Shared values for the gradient's animated position
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  // Subscribe to gyroscope data
  React.useEffect(() => {
    const subscription = Gyroscope.addListener(({ x: gx, y: gy }) => {
      // Update shared values with timing for smooth animation
      x.value = withTiming(gy * GYRO_SENSITIVITY, { duration: 100 });
      y.value = withTiming(gx * GYRO_SENSITIVITY, { duration: 100 });
    });

    // Set gyroscope update interval
    Gyroscope.setUpdateInterval(16);

    // Unsubscribe on component unmount
    return () => subscription.remove();
  }, []);

  // Animated style for the gradient view
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: x.value * 20 }, { translateY: y.value * 20 }],
    };
  });

  return (
    <View style={styles.container}>
      <MaskedView
        style={styles.maskedView}
        maskElement={
          <View style={styles.maskContainer}>
            <Text style={styles.titleText}>{TITLE_TEXT}</Text>
          </View>
        }
      >
        <Animated.View style={[styles.gradientContainer, animatedStyle]}>
          <LinearGradient
            colors={CHROME_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          />
        </Animated.View>
      </MaskedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  maskedView: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  maskContainer: {
    backgroundColor: 'transparent',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'black',
  },
  gradientContainer: {
    flex: 1,
    width: '150%', // Make gradient larger than the text to see the movement
    height: '150%',
  },
  gradient: {
    flex: 1,
  },
}); 