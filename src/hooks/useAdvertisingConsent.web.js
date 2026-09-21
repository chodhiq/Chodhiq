export function useAdvertisingConsent() {
  return {
    allowed: false,
    loaded: true,
    error: '',
    manageChoices: async () => {},
    refresh: async () => {},
  };
}
