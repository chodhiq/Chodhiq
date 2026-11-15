import { supabase } from './supabase';

const CONFIG_KEY = 'button_kill_switches';
const REFRESH_INTERVAL_MS = 60_000;
let disabledButtons = {};
let lastRefreshAt = 0;
let refreshInFlight;

export async function refreshRemoteButtonConfig() {
  if (!supabase) {
    lastRefreshAt = Date.now();
    return;
  }
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const { data, error } = await supabase
      .from('app_config')
      .select('config_value')
      .eq('config_key', CONFIG_KEY)
      .maybeSingle();
    if (error) throw error;

    const next = data?.config_value?.disabled_buttons;
    disabledButtons = next && typeof next === 'object' && !Array.isArray(next) ? next : {};
    lastRefreshAt = Date.now();
  })()
    .catch((error) => {
      lastRefreshAt = Date.now();
      throw error;
    })
    .finally(() => {
      refreshInFlight = undefined;
    });

  return refreshInFlight;
}

export function getButtonKillSwitch(buttonName) {
  if (!buttonName) return null;
  if (Date.now() - lastRefreshAt >= REFRESH_INTERVAL_MS && !refreshInFlight) {
    lastRefreshAt = Date.now();
    refreshRemoteButtonConfig().catch((error) => {
      console.warn('Remote button availability could not be refreshed.', error?.message || error);
    });
  }

  const value = disabledButtons[buttonName];
  if (value === true) return { disabled: true };
  if (!value || typeof value !== 'object' || value.disabled !== true) return null;
  return { disabled: true, message: value.message };
}
