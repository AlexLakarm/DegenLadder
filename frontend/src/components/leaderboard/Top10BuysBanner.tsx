import React, { useRef, useEffect, useState } from 'react';
import { View, Animated, Text, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { useTheme } from 'react-native-paper';

export function Top10BuysBanner({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const marqueeText = '🔥 Last buys from the Top 10 ! 👀 Tap to discover what the top wallets are aping ! 🚀 ';
  const [textWidth, setTextWidth] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (textWidth === 0) return;
    animatedValue.setValue(0);
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: -textWidth,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start();
  }, [textWidth]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ marginBottom: 16 }}>
      <View style={{
        backgroundColor: theme.colors.primaryContainer,
        borderRadius: 8,
        paddingVertical: 0,
        overflow: 'hidden',
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        {textWidth === 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: '100%' }}>
            <Text
              onLayout={e => setTextWidth(e.nativeEvent.layout.width)}
              style={{
                fontWeight: 'bold',
                color: theme.colors.primary,
                fontSize: 16,
                textAlign: 'center',
              }}
            >
              {marqueeText}
            </Text>
          </ScrollView>
        ) : (
          <View style={{ width: '100%', overflow: 'hidden', flexDirection: 'row', alignItems: 'center' }}>
            <Animated.View
              style={{
                flexDirection: 'row',
                transform: [{ translateX: animatedValue }],
                width: textWidth * 2,
              }}
            >
              <Text
                style={{
                  fontWeight: 'bold',
                  color: theme.colors.primary,
                  fontSize: 16,
                  width: textWidth,
                }}
                numberOfLines={1}
                ellipsizeMode="clip"
              >
                {marqueeText}
              </Text>
              <Text
                style={{
                  fontWeight: 'bold',
                  color: theme.colors.primary,
                  fontSize: 16,
                  width: textWidth,
                }}
                numberOfLines={1}
                ellipsizeMode="clip"
              >
                {marqueeText}
              </Text>
            </Animated.View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
} 