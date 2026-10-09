import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import useReducedMotion from '../hooks/useMotionPreferences';

export default function HeroBackdrop({ sources, active, children, style }) {
  const reduced = useReducedMotion();
  const fades = useRef(
    sources.map((_, index) => new Animated.Value(index === active ? 1 : 0)),
  ).current;
  useEffect(() => {
    const animation = Animated.parallel(
      fades.map((opacity, index) =>
        Animated.timing(opacity, {
          toValue: index === active ? 1 : 0,
          duration: reduced ? 0 : 1100,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
    );
    animation.start();
    return () => animation.stop();
  }, [active, reduced, fades]);
  return (
    <View style={style}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {sources.map((source, index) => (
          <Animated.Image
            key={index}
            source={source}
            resizeMode="cover"
            style={[
              StyleSheet.absoluteFill,
              { width: '100%', height: '100%', opacity: fades[index] },
            ]}
          />
        ))}
      </View>
      {children}
    </View>
  );
}
