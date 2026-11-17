const POSITION_TIMEOUT_MS = 15000;
const GEOCODE_TIMEOUT_MS = 5000;

function withTimeout(work, timeoutMs, message) {
  let timer;
  return Promise.race([
    Promise.resolve(work),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

export async function getDeviceLocation(locationApi) {
  const permission = await withTimeout(
    locationApi.requestForegroundPermissionsAsync(),
    POSITION_TIMEOUT_MS,
    'Location permission request timed out. Please try again.',
  );
  if (!permission.granted) {
    const error = new Error('Allow location access in your device settings, then try again.');
    error.code = 'LOCATION_PERMISSION_DENIED';
    throw error;
  }

  const position = await withTimeout(
    locationApi.getCurrentPositionAsync({
      accuracy: locationApi.Accuracy.Balanced,
      mayShowUserSettingsDialog: true,
    }),
    POSITION_TIMEOUT_MS,
    'Your location is taking too long to load. Check that device location is on and try again.',
  );
  const latitude = Number(position.coords.latitude);
  const longitude = Number(position.coords.longitude);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < 49.8 ||
    latitude > 60.9 ||
    longitude < -8.7 ||
    longitude > 1.8
  ) {
    const error = new Error('Your device location is unavailable or outside the UK.');
    error.code = 'LOCATION_OUTSIDE_UK';
    throw error;
  }
  const coordinates = { latitude, longitude };

  try {
    const places = await withTimeout(
      locationApi.reverseGeocodeAsync(position.coords),
      GEOCODE_TIMEOUT_MS,
      'Location name lookup timed out.',
    );
    const place = places[0] || {};
    return {
      ...coordinates,
      city: place.city || place.subregion || place.region || null,
    };
  } catch (error) {
    console.warn(
      'Current coordinates found, but the area name could not be resolved.',
      error.message,
    );
    return { ...coordinates, city: null };
  }
}
