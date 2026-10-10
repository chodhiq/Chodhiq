import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { WebView } from 'react-native-webview';
import Text from './AppText';
import { openStreetMapHtml } from '../lib/openStreetMap';

export default function OpenStreetMap({
  providers,
  location,
  onSelect,
  onRegionChange,
  palette,
  mapType,
}) {
  const [failed, setFailed] = useState(false);
  const [tileWarning, setTileWarning] = useState(false);
  const [revision, setRevision] = useState(0);
  const html = useMemo(
    () => openStreetMapHtml(providers, location, mapType),
    [providers, location?.latitude, location?.longitude, mapType],
  );
  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        key={revision}
        originWhitelist={['about:blank']}
        source={{ html }}
        style={{ flex: 1, backgroundColor: palette.surfaceAlt }}
        javaScriptEnabled
        onError={() => setFailed(true)}
        onRenderProcessGone={() => setFailed(true)}
        onContentProcessDidTerminate={() => setFailed(true)}
        onMessage={({ nativeEvent }) => {
          try {
            const message = JSON.parse(nativeEvent.data);
            if (message.type === 'error') setFailed(true);
            if (message.type === 'warning') setTileWarning(true);
            if (message.type === 'select') {
              const provider = providers.find((item) => String(item.id) === message.id);
              if (provider) onSelect(provider);
            }
            if (message.type === 'region') onRegionChange?.(message.region);
          } catch {
            setFailed(true);
          }
        }}
      />
      {tileWarning && !failed && (
        <View
          style={{
            position: 'absolute',
            top: 12,
            left: 16,
            right: 16,
            borderRadius: 12,
            padding: 12,
            backgroundColor: palette.surface,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: palette.text, flex: 1, marginRight: 8 }}>
            Some map tiles could not load. Check your connection.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setTileWarning(false);
              setRevision((value) => value + 1);
            }}
          >
            <Text style={{ color: palette.primary, fontWeight: '700' }}>Retry</Text>
          </Pressable>
        </View>
      )}
      {failed && (
        <View
          style={{
            position: 'absolute',
            top: '45%',
            left: 24,
            right: 24,
            borderRadius: 18,
            padding: 18,
            backgroundColor: palette.surface,
            gap: 12,
          }}
        >
          <Text style={{ color: palette.text, textAlign: 'center' }}>
            Map connection interrupted. Check your internet connection.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setFailed(false);
              setTileWarning(false);
              setRevision((value) => value + 1);
            }}
            style={{ padding: 12, alignItems: 'center' }}
          >
            <Text style={{ color: palette.primary, fontWeight: '700' }}>Retry map</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
