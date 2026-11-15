export interface ProviderCoordinates {
  latitude: number;
  longitude: number;
}

interface PostcodeLookupResponse {
  status?: number;
  result?: {
    latitude?: number;
    longitude?: number;
  } | null;
}

interface CoordinateRpcClient {
  rpc(
    functionName: string,
    args: Record<string, string | number>,
  ): PromiseLike<{ error: { message: string } | null }>;
}

export async function geocodeUkPostcode(postcode: string): Promise<ProviderCoordinates> {
  const normalized = postcode.trim().replace(/\s+/g, '');
  if (!normalized) throw new Error('Enter a UK postcode to find business coordinates.');

  const endpoint = `https://api.postcodes.io/postcodes/${encodeURIComponent(normalized)}`;
  let response = await fetch(endpoint);
  if (response.status === 404) {
    response = await fetch(
      `https://api.postcodes.io/terminated_postcodes/${encodeURIComponent(normalized)}`,
    );
  }
  if (!response.ok) throw new Error('The postcode could not be geocoded. Check it and try again.');

  const payload = (await response.json()) as PostcodeLookupResponse;
  const latitude = Number(payload.result?.latitude);
  const longitude = Number(payload.result?.longitude);
  if (
    payload.status !== 200 ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error('The postcode did not return valid coordinates.');
  }

  return { latitude, longitude };
}

export async function saveProviderCoordinates(
  client: CoordinateRpcClient,
  providerId: string,
  coordinates: ProviderCoordinates,
): Promise<void> {
  const { error } = await client.rpc('set_provider_coordinates', {
    target_provider: providerId,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  });
  if (error) throw error;
}
