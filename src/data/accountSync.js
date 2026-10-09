export function remoteProfilePayload(userId, profile) {
  return {
    id: userId,
    full_name: profile.name,
    phone: profile.phone,
    city: profile.location,
  };
}
