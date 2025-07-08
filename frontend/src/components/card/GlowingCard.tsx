import React from 'react';
import { Canvas } from '@react-three/fiber/native';
import { motion } from 'framer-motion-3d';

export function GlowingCard() {
  return (
    <Canvas style={{ flex: 1 }}>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <motion.mesh
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </motion.mesh>
    </Canvas>
  );
} 