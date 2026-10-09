import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { KeyboardFormContext } from '../context/KeyboardFormContext';
import { keyboardScrollAdjustment } from '../lib/keyboardGeometry';

// Only focus/keyboard/layout events measure inputs; typing never triggers measurements.
const KeyboardAwareScrollView = forwardRef(function KeyboardAwareScrollView(
  { horizontal, contentContainerStyle, onScroll, onLayout, onContentSizeChange, ...props },
  ref,
) {
  const focused = useIsFocused();
  const scroll = useRef(null);
  const offset = useRef(0);
  const keyboardTop = useRef(Keyboard.metrics?.()?.screenY ?? Infinity);
  const timer = useRef(null);
  const mounted = useRef(true);
  const ownsFocus = useRef(false);
  const [overlap, setOverlap] = useState(0);
  const attach = useCallback(
    (node) => {
      scroll.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  const revealInput = useCallback(() => {
    if (!focused || !ownsFocus.current || horizontal || Platform.OS === 'web') return;
    const input = TextInput.State.currentlyFocusedInput();
    const container = scroll.current?.getNativeScrollRef?.() || scroll.current;
    if (!input?.measureInWindow || !container?.measureInWindow) return;
    container.measureInWindow((_x, top, _width, height) => {
      if (height <= 0) return;
      input.measureInWindow((_ix, inputTop, _iw, inputHeight) => {
        if (
          !mounted.current ||
          !ownsFocus.current ||
          TextInput.State.currentlyFocusedInput() !== input
        )
          return;
        const result = keyboardScrollAdjustment({
          containerTop: top,
          containerHeight: height,
          inputTop,
          inputHeight,
          keyboardTop: keyboardTop.current,
          offset: offset.current,
        });
        setOverlap(result.overlap);
        if (result.needsScroll)
          requestAnimationFrame(() => {
            if (mounted.current) scroll.current?.scrollTo({ y: result.scrollY, animated: true });
          });
      });
    });
  }, [focused, horizontal]);
  const scheduleReveal = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(revealInput, 120);
  }, [revealInput]);
  const focusContext = useMemo(
    () => ({
      focus: () => {
        ownsFocus.current = true;
        keyboardTop.current = Keyboard.metrics?.()?.screenY ?? keyboardTop.current;
        scheduleReveal();
      },
      blur: () => {
        ownsFocus.current = false;
      },
    }),
    [scheduleReveal],
  );
  useEffect(() => {
    mounted.current = true;
    if (!focused || horizontal || Platform.OS === 'web')
      return () => {
        mounted.current = false;
      };
    const shown = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardTop.current = event.endCoordinates.screenY;
      scheduleReveal();
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = Infinity;
      setOverlap(0);
    });
    return () => {
      mounted.current = false;
      shown.remove();
      hidden.remove();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [focused, horizontal, scheduleReveal]);
  if (horizontal)
    return (
      <ScrollView
        {...props}
        horizontal
        ref={ref}
        onScroll={onScroll}
        onLayout={onLayout}
        contentContainerStyle={contentContainerStyle}
      />
    );
  const base = StyleSheet.flatten(contentContainerStyle) || {};
  return (
    <KeyboardFormContext.Provider value={focusContext}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        removeClippedSubviews={false}
        {...props}
        ref={attach}
        automaticallyAdjustKeyboardInsets={false}
        scrollEventThrottle={32}
        contentContainerStyle={[
          contentContainerStyle,
          {
            paddingBottom:
              (Number(base.paddingBottom ?? base.paddingVertical ?? base.padding) || 0) +
              overlap +
              20,
          },
        ]}
        onScroll={(event) => {
          offset.current = event.nativeEvent.contentOffset.y;
          onScroll?.(event);
        }}
        onLayout={(event) => {
          onLayout?.(event);
          if (ownsFocus.current) scheduleReveal();
        }}
        onContentSizeChange={(width, height) => {
          onContentSizeChange?.(width, height);
          if (ownsFocus.current) scheduleReveal();
        }}
      />
    </KeyboardFormContext.Provider>
  );
});
export default KeyboardAwareScrollView;
