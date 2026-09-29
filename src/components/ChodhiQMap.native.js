import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Text from './AppText';
import MapView, { Marker } from 'react-native-maps';
import {
  MapPin,
  Utensils,
  Store,
  Scissors,
  Building2,
  Hotel,
  PartyPopper,
  LayoutGrid,
} from 'lucide-react-native';
import Constants from 'expo-constants';

const CATEGORY_ICONS = {
  restaurants: Utensils,
  grocery: Store,
  beauty: Scissors,
  property: Building2,
  events: PartyPopper,
  hotels: Hotel,
};

export default function ChodhiQMap({
  providers,
  selected,
  onSelect,
  palette,
  location,
  onRegionChange,
  mapType = 'standard',
}) {
  const mapsEnabled = Constants.expoConfig?.extra?.googleMapsEnabled === true;
  const mapRef = useRef(null);
  const coordinates = useMemo(
    () =>
      providers
        .filter(
          (provider) =>
            Number.isFinite(provider.baseLatitude) && Number.isFinite(provider.baseLongitude),
        )
        .map((provider) => ({
          provider,
          latitude: provider.baseLatitude,
          longitude: provider.baseLongitude,
        })),
    [providers],
  );
  const groupedCoordinates = useMemo(() => {
    const groups = new Map();
    for (const point of coordinates) {
      const key = `${point.latitude.toFixed(3)}:${point.longitude.toFixed(3)}`;
      groups.set(key, [...(groups.get(key) || []), point]);
    }
    return [...groups.values()];
  }, [coordinates]);
  useEffect(() => {
    if (!mapsEnabled || !mapRef.current || !coordinates.length) return;
    mapRef.current.fitToCoordinates(
      coordinates.map((item) => ({ latitude: item.latitude, longitude: item.longitude })),
      {
        edgePadding: { top: 150, right: 48, bottom: 170, left: 48 },
        animated: true,
      },
    );
  }, [coordinates, mapsEnabled]);
  useEffect(() => {
    if (!mapsEnabled || !mapRef.current || !location) return;
    mapRef.current.animateToRegion(location, 450);
  }, [location?.latitude, location?.longitude, mapsEnabled]);
  const validProviders = coordinates.map((item) => item.provider);
  if (!mapsEnabled) {
    return (
      <View style={[styles.fallback, { backgroundColor: palette.surfaceAlt }]}>
        <Text style={[styles.fallbackLabel, { color: palette.text2 }]}>
          Map preview is unavailable. Enable the map provider to browse real business locations.
        </Text>
        {validProviders.slice(0, 60).map((provider) => {
          const active = selected?.id === provider.id;
          const Icon =
            CATEGORY_ICONS[String(provider.categoryId || '').toLowerCase()] || LayoutGrid;
          return (
            <Text
              key={provider.id}
              style={[styles.fallbackBusiness, { color: active ? palette.primary : palette.text2 }]}
              onPress={() => onSelect(provider)}
            >
              {Icon === LayoutGrid ? '•' : '•'} {provider.name}
            </Text>
          );
        })}
      </View>
    );
  }
  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={
        location || { latitude: 53.1, longitude: -1.65, latitudeDelta: 7.4, longitudeDelta: 7.4 }
      }
      mapType={mapType}
      showsUserLocation
      showsMyLocationButton={false}
      toolbarEnabled={false}
      onRegionChangeComplete={onRegionChange}
      mapPadding={{ top: 150, right: 12, bottom: 190, left: 12 }}
    >
      {groupedCoordinates.map((cluster) => {
        const provider = cluster.find((item) => item.id === selected?.id) || cluster[0];
        const latitude = cluster.reduce((sum, item) => sum + item.baseLatitude, 0) / cluster.length;
        const longitude =
          cluster.reduce((sum, item) => sum + item.baseLongitude, 0) / cluster.length;
        const active = selected?.id === provider.id;
        const Icon = CATEGORY_ICONS[String(provider.categoryId || '').toLowerCase()] || LayoutGrid;
        return (
          <Marker
            key={cluster.map((item) => item.id).join('-')}
            coordinate={{ latitude, longitude }}
            title={provider.name}
            description={`${provider.category} · ${provider.baseCity}`}
            onPress={() => {
              if (cluster.length > 1)
                mapRef.current?.animateToRegion(
                  { latitude, longitude, latitudeDelta: 0.045, longitudeDelta: 0.045 },
                  350,
                );
              onSelect(provider);
            }}
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
              {cluster.length > 1 ? (
                <Text style={styles.clusterText}>{cluster.length}</Text>
              ) : (
                <Icon size={17} color="#FFFFFF" strokeWidth={2.4} />
              )}
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  fallback: { ...StyleSheet.absoluteFillObject, padding: 30, justifyContent: 'center', gap: 8 },
  fallbackLabel: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  fallbackBusiness: { fontSize: 12, textAlign: 'center' },
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
  clusterText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
});
