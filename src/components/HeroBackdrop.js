import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import useEffectsLevel from '../hooks/useEffectsLevel';

export default function HeroBackdrop({ sources, active, children, style }) {
  const canAnimate = useEffectsLevel() === 'full';
  const fades = useRef(
    sources.map((_, index) => new Animated.Value(index === active ? 1 : 0)),
  ).current;
  useEffect(() => {
    if (!canAnimate) {
      fades.forEach((value, index) => {
        value.stopAnimation();
        value.setValue(index === active ? 1 : 0);
      });
      return undefined;
    }
    const animation = Animated.parallel(
      fades.map((opacity, index) =>
        Animated.timing(opacity, {
          toValue: index === active ? 1 : 0,
          duration: 1100,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
    );
    animation.start();
    return () => animation.stop();
  }, [active, canAnimate, fades]);
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
