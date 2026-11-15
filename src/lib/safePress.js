import * as Sentry from '@sentry/react-native';
import { captureError } from './sentryUtils';
import { getActiveScreenName } from './activeScreen';
import { showButtonToast } from './buttonToast';
import { getButtonKillSwitch } from './remoteButtonConfig';

const inFlightButtons = new Set();
const FRIENDLY_ERROR = "We couldn't complete that action. Please try again.";
const UNAVAILABLE_MESSAGE = 'This feature is temporarily unavailable. Please try again later.';

/**
 * @param {((...args: any[]) => unknown) | undefined} fn
 * @param {{
 *   buttonName?: string,
 *   featureKey?: string,
 *   screenName?: string,
 *   onStatusChange?: (status: 'idle' | 'loading' | 'success' | 'error') => void
 * }} options
 */
export function safePress(
  fn,
  { buttonName = 'Action', featureKey = buttonName, screenName, onStatusChange } = {},
) {
  return async (...args) => {
    const currentScreen = screenName || getActiveScreenName();
    const lockKey = `${currentScreen}:${buttonName}`;
    if (inFlightButtons.has(lockKey)) return;
    inFlightButtons.add(lockKey);
    const reportContext = { button: buttonName, screen: currentScreen };

    Sentry.addBreadcrumb({
      category: 'ui.button',
      message: `Button pressed: ${buttonName}`,
      data: reportContext,
      level: 'info',
    });
    onStatusChange?.('loading');

    let status = 'success';
    try {
      const killSwitch = getButtonKillSwitch(featureKey);
      if (killSwitch?.disabled) {
        status = 'error';
        showButtonToast(killSwitch.message || UNAVAILABLE_MESSAGE);
        return;
      }
      await fn?.(...args);
    } catch (error) {
      status = 'error';
      captureError(error, { ...reportContext, operation: 'button_press' });
      showButtonToast(
        FRIENDLY_ERROR,
        fn
          ? () => safePress(fn, { buttonName, featureKey, screenName, onStatusChange })(...args)
          : null,
      );
    } finally {
      onStatusChange?.(status);
      inFlightButtons.delete(lockKey);
    }
  };
}
