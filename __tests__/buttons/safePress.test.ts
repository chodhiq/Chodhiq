import { safePress } from '../../src/lib/safePress';

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('../../src/lib/activeScreen', () => ({
  getActiveScreenName: () => 'TestScreen',
}));

jest.mock('../../src/lib/buttonToast', () => ({
  showButtonToast: jest.fn(),
}));

jest.mock('../../src/lib/remoteButtonConfig', () => ({
  getButtonKillSwitch: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../src/lib/sentryUtils', () => ({
  captureError: jest.fn(),
}));

import * as Sentry from '@sentry/react-native';
import { captureError } from '../../src/lib/sentryUtils';
import { showButtonToast } from '../../src/lib/buttonToast';
import { getButtonKillSwitch } from '../../src/lib/remoteButtonConfig';

describe('safePress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getButtonKillSwitch).mockReturnValue(null);
  });

  it('records a breadcrumb and awaits a successful action', async () => {
    const action = jest.fn().mockResolvedValue(undefined);
    const onStatusChange = jest.fn();

    await safePress(action, { buttonName: 'btn-save', onStatusChange })('event');

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'ui.button',
        message: 'Button pressed: btn-save',
        data: { button: 'btn-save', screen: 'TestScreen' },
      }),
    );
    expect(action).toHaveBeenCalledWith('event');
    expect(onStatusChange.mock.calls.map(([status]) => status)).toEqual(['loading', 'success']);
  });

  it('ignores repeated taps while an action is in flight', async () => {
    let finishAction: (() => void) | undefined;
    const action = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finishAction = resolve;
        }),
    );
    const press = safePress(action, { buttonName: 'btn-double-tap' });

    const firstPress = press();
    await press();
    finishAction?.();
    await firstPress;

    expect(action).toHaveBeenCalledTimes(1);
    expect(Sentry.addBreadcrumb).toHaveBeenCalledTimes(1);
  });

  it('reports failures, shows a friendly toast, and clears loading', async () => {
    const error = new Error('backend failure');
    const onStatusChange = jest.fn();

    await safePress(() => Promise.reject(error), { buttonName: 'btn-submit', onStatusChange })();

    expect(captureError).toHaveBeenCalledWith(error, {
      button: 'btn-submit',
      screen: 'TestScreen',
      operation: 'button_press',
    });
    expect(showButtonToast).toHaveBeenCalledWith(
      "We couldn't complete that action. Please try again.",
      expect.any(Function),
    );
    expect(onStatusChange.mock.calls.map(([status]) => status)).toEqual(['loading', 'error']);
  });

  it('blocks a remotely disabled button and displays its message', async () => {
    jest.mocked(getButtonKillSwitch).mockReturnValue({
      disabled: true,
      message: 'Temporarily unavailable.',
    });
    const action = jest.fn();

    await safePress(action, { buttonName: 'btn-post' })();

    expect(action).not.toHaveBeenCalled();
    expect(showButtonToast).toHaveBeenCalledWith('Temporarily unavailable.');
  });
});
