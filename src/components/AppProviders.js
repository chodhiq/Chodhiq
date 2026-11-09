import React from 'react';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider } from '../context/AppStateContext';
import { ChodhiQThemeProvider } from '../context/ThemeContext';

export default function AppProviders({ children }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ChodhiQThemeProvider>
          <AppStateProvider>
            <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
          </AppStateProvider>
        </ChodhiQThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
