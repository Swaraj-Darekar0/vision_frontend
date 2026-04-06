import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const GRAIN_TEXTURE = require('../../../assets/images/Subtle grainy texture overlay.png');

interface DashboardGrainOverlayProps {
  opacity?: number;
}

export const DashboardGrainOverlay: React.FC<DashboardGrainOverlayProps> = ({
  opacity = 0.08,
}) => (
  <View pointerEvents="none" style={styles.container}>
    <Image
      source={GRAIN_TEXTURE}
      resizeMode="cover"
      style={[styles.texture, { opacity }]}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  texture: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
});
