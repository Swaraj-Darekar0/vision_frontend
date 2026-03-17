import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const GuideDashedBox = () => (
  <View style={styles.container} pointerEvents="none">
    <View style={styles.box} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    width: '80%',
    aspectRatio: 3/4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
    borderRadius: 20,
  },
});
