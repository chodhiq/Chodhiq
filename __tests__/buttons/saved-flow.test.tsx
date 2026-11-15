import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { HomeBusinessCard } from '../../src/components/HomeComponents';
import { showButtonToast, subscribeToButtonToasts } from '../../src/lib/buttonToast';
import { resetTestState, testProvider } from './helpers';

describe('saved business state and feedback', () => {
  beforeEach(() => resetTestState());

  test('provider cards keep the heart icon for both saved states', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const view = await render(
      <HomeBusinessCard
        palette={globalThis.__CHODHIQ_TEST_PALETTE__}
        provider={testProvider}
        saved={false}
        onSave={onSave}
      />,
    );

    const saveButton = view.getByRole('button', { name: 'Save Test Barber' });
    expect(saveButton.props.accessibilityState.selected).toBe(false);
    await fireEvent.press(saveButton);
    expect(
      view.getByRole('button', { name: 'Save Test Barber' }).props.accessibilityState.selected,
    ).toBe(false);

    view.unmount();
    const savedView = await render(
      <HomeBusinessCard
        palette={globalThis.__CHODHIQ_TEST_PALETTE__}
        provider={testProvider}
        saved
        onSave={onSave}
      />,
    );
    expect(
      savedView.getByRole('button', { name: 'Remove Test Barber from saved' }).props
        .accessibilityState.selected,
    ).toBe(true);
  });

  test('identical button toasts are debounced', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToButtonToasts(listener);
    const now = jest.spyOn(Date, 'now');
    now.mockReturnValue(10_000);

    try {
      showButtonToast('Saved flow duplicate test');
      now.mockReturnValue(10_100);
      showButtonToast('Saved flow duplicate test');
      expect(listener).toHaveBeenCalledTimes(1);

      now.mockReturnValue(11_201);
      showButtonToast('Saved flow duplicate test');
      expect(listener).toHaveBeenCalledTimes(2);
    } finally {
      unsubscribe();
      now.mockRestore();
    }
  });
});
