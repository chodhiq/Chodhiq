import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { MapPin } from 'lucide-react-native';
import Constants from 'expo-constants';

const CITY_COORDINATES = {
  london: { latitude: 51.5074, longitude: -0.1278 },
  birmingham: { latitude: 52.4862, longitude: -1.8904 },
  manchester: { latitude: 53.4808, longitude: -2.2426 },
  leicester: { latitude: 52.6369, longitude: -1.1398 },
  coventry: { latitude: 52.4068, longitude: -1.5197 },
  nottingham: { latitude: 52.9548, longitude: -1.1581 },
  bristol: { latitude: 51.4545, longitude: -2.5879 },
  leeds: { latitude: 53.8008, longitude: -1.5491 },
};

function coordinatesFor(provider, index) {
  const city = String(provider.baseCity || '')
    .trim()
    .toLowerCase();
  const known = CITY_COORDINATES[city] || CITY_COORDINATES.leicester;
  const offset = (index % 4) * 0.008;
  return { latitude: known.latitude + offset, longitude: known.longitude - offset };
}

export default function ChodhiQMap({ providers, selected, onSelect, palette }) {
  const mapsEnabled = Constants.expoConfig?.extra?.googleMapsEnabled === true;
  if (!mapsEnabled) {
    return (
      <View style={[styles.fallback, { backgroundColor: palette.surfaceAlt }]}>
        <View style={[styles.park, styles.parkOne, { backgroundColor: palette.primarySoft }]} />
        <View style={[styles.park, styles.parkTwo, { backgroundColor: palette.primarySoft }]} />
        {[18, 38, 58, 78].map((position) => (
          <View
            key={`road-h-${position}`}
            style={[styles.roadHorizontal, { top: `${position}%` }]}
          />
        ))}
        {[17, 42, 68, 86].map((position) => (
          <View
            key={`road-v-${position}`}
            style={[styles.roadVertical, { left: `${position}%` }]}
          />
        ))}
        {providers.slice(0, 7).map((provider, index) => {
          const active = selected?.id === provider.id;
          return (
            <View
              key={provider.id}
              style={[
                styles.fallbackMarkerPosition,
                fallbackPositions[index % fallbackPositions.length],
              ]}
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Select ${provider.name}`}
                style={[
                  styles.marker,
                  {
                    backgroundColor: active ? palette.primary : palette.surface,
                    borderColor: palette.primary,
                  },
                ]}
                onPress={() => onSelect(provider)}
              >
                <MapPin size={18} color={active ? '#FFFFFF' : palette.primary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          );
        })}
        <View style={[styles.mapNotice, { backgroundColor: palette.surface }]}>
          <Text style={[styles.mapNoticeTitle, { color: palette.text }]}>
            Explore nearby providers
          </Text>
          <Text style={[styles.mapNoticeText, { color: palette.text2 }]}>Location preview</Text>
        </View>
      </View>
    );
  }
  return (
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={{
        latitude: 53.1,
        longitude: -1.65,
        latitudeDelta: 7.4,
        longitudeDelta: 7.4,
      }}
      showsUserLocation
      showsMyLocationButton
      toolbarEnabled={false}
    >
      {providers.map((provider, index) => {
        const active = selected?.id === provider.id;
        return (
          <Marker
            key={provider.id}
            coordinate={coordinatesFor(provider, index)}
            title={provider.name}
            description={`${provider.category} · ${provider.baseCity}`}
            onPress={() => onSelect(provider)}
            tracksViewChanges={false}
          >
            <View
              style={[
                styles.marker,
                {
                  backgroundColor: active ? palette.primary : palette.surface,
                  borderColor: active ? palette.primary : palette.border,
                },
              ]}
            >
              <MapPin size={18} color={active ? '#FFFFFF' : palette.primary} strokeWidth={2.5} />
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}

const fallbackPositions = [
  { left: '20%', top: '26%' },
  { left: '54%', top: '22%' },
  { left: '73%', top: '39%' },
  { left: '34%', top: '48%' },
  { left: '61%', top: '60%' },
  { left: '17%', top: '68%' },
  { left: '78%', top: '72%' },
];

const styles = StyleSheet.create({
  fallback: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  roadHorizontal: {
    position: 'absolute',
    left: -20,
    right: -20,
    height: 12,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '-5deg' }],
  },
  roadVertical: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 10,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '8deg' }],
  },
  park: { position: 'absolute', borderRadius: 28, opacity: 0.72 },
  parkOne: { width: 120, height: 90, right: 18, top: 130, transform: [{ rotate: '-12deg' }] },
  parkTwo: { width: 100, height: 130, left: 22, bottom: 105, transform: [{ rotate: '16deg' }] },
  fallbackMarkerPosition: { position: 'absolute' },
  mapNotice: {
    position: 'absolute',
    left: 16,
    bottom: 132,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  mapNoticeTitle: { fontSize: 12, fontWeight: '700' },
  mapNoticeText: { fontSize: 10, marginTop: 2 },
  marker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#101817',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 7,
    elevation: 4,
  },
});
