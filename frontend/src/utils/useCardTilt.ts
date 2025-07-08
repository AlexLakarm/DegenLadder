import { Gyroscope } from 'expo-sensors';
import { useEffect, useState } from 'react';

export function useCardTilt() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    Gyroscope.setUpdateInterval(16);
    const sub = Gyroscope.addListener(({ x, y }) => {
      // The values are swapped (y for rotateX and x for rotateY) to feel more natural
      // The values are multiplied by 15 to amplify the effect (less than before)
      // The values are clamped between -10 and 10 degrees to avoid extreme rotations
      setTilt({
        x: Math.min(Math.max(y * 15, -10), 10),
        y: Math.min(Math.max(x * 15, -10), 10),
      });
    });
    return () => sub.remove();
  }, []);

  return tilt;
} 