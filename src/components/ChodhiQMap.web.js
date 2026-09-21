import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MapPin } from 'lucide-react-native';

export default function ChodhiQMap({ providers, selected, onSelect, palette }) {
  return (
    <View style={[styles.map, { backgroundColor: palette.surfaceAlt }]}>
      <Text style={[styles.label, { color: palette.text2 }]}>UNITED KINGDOM</Text>
      {providers.map((provider, index) => (
        <TouchableOpacity
          key={provider.id}
          accessibilityRole="button"
          accessibilityLabel={`Select ${provider.name} on map`}
          onPress={() => onSelect(provider)}
          style={[
            styles.marker,
            {
              left: `${16 + ((index * 13) % 68)}%`,
              top: `${16 + ((index * 17) % 56)}%`,
              backgroundColor: selected?.id === provider.id ? palette.primary : palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <MapPin size={16} color={selected?.id === provider.id ? '#FFFFFF' : palette.primary} />
        </TouchableOpacity>
      ))}
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
