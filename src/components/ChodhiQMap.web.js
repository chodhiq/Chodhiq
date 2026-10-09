import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { openStreetMapHtml } from '../lib/openStreetMap';

export default function ChodhiQMap({ providers, location, onSelect, onRegionChange, mapType }) {
  const frame = useRef(null);
  const html = useMemo(
    () => openStreetMapHtml(providers, location, mapType),
    [providers, location?.latitude, location?.longitude, mapType],
  );
  useEffect(() => {
    const receive = (event) => {
      if (event.source !== frame.current?.contentWindow) return;
      const message = event.data;
      if (message?.type === 'select') {
        const provider = providers.find((item) => String(item.id) === message.id);
        if (provider) onSelect(provider);
      }
      if (message?.type === 'region') onRegionChange?.(message.region);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [providers, onSelect, onRegionChange]);
  return (
    <View style={StyleSheet.absoluteFill}>
      {React.createElement('iframe', {
        ref: frame,
        title: 'Nearby businesses map',
        srcDoc: html,
        style: { width: '100%', height: '100%', border: 0 },
        sandbox: 'allow-scripts allow-popups allow-popups-to-escape-sandbox',
      })}
    </View>
  );
}
