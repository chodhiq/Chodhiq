import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Text from './AppText';
import { MapPin } from 'lucide-react-native';

export default function ChodhiQMap({ providers, selected, onSelect, palette }) {
  const mappable = providers.filter(
    (provider) => Number.isFinite(provider.baseLatitude) && Number.isFinite(provider.baseLongitude),
  );
  return (
    <View style={[styles.map, { backgroundColor: palette.surfaceAlt }]}>
      <Text style={[styles.label, { color: palette.text2 }]}>
        Interactive map requires the native map provider
      </Text>
      <Text style={{ color: palette.text2, textAlign: 'center', marginTop: 36 }}>
        {mappable.length
          ? 'Open the native map view to explore these locations.'
          : 'No businesses with location data in this area yet.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, position: 'relative' },
  label: { position: 'absolute', top: '42%', alignSelf: 'center', letterSpacing: 3 },
  marker: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
