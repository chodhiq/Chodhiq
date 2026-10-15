import { useEffect, useState } from 'react';
import { suggestUkAddresses, suggestUkPostcodes } from '../data/ukLocationLookup';

export default function useUkPostcodeSuggestions(query) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const value = String(query || '').trim();
    if (value.replace(/\s/g, '').length < 2) {
      setSuggestions([]);
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      Promise.all([
        suggestUkAddresses(value, controller.signal).catch((error) => {
          if (error.name === 'AbortError') throw error;
          return [];
        }),
        suggestUkPostcodes(value, controller.signal).catch((error) => {
          if (error.name === 'AbortError') throw error;
          return [];
        }),
      ])
        .then(([addresses, postcodes]) => {
          if (controller.signal.aborted) return;
          const addressOptions = addresses.map((address) => ({
            id: `address:${address.label}`,
            label: address.label,
            postcode: address.postcode,
            town: address.town,
            latitude: address.latitude,
            longitude: address.longitude,
            kind: 'address',
          }));
          const postcodeOptions = postcodes
            .filter((postcode) => !addressOptions.some((address) => address.postcode === postcode))
            .map((postcode) => ({
              id: `postcode:${postcode}`,
              label: postcode,
              postcode,
              town: '',
              latitude: null,
              longitude: null,
              kind: 'postcode',
            }));
          setSuggestions([...addressOptions, ...postcodeOptions].slice(0, 8));
        })
        .catch((error) => {
          if (error.name !== 'AbortError') setSuggestions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { suggestions, loading };
}
