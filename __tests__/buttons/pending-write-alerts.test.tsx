import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AppAlert } from '../../src/components/AppDialog';
import PendingWriteAlerts from '../../src/components/PendingWriteAlerts';

describe('pending write alerts', () => {
  afterEach(() => jest.restoreAllMocks());

  test('shows retry and discard for a failed post and keeps the queued content available', async () => {
    const queuedPost = {
      id: 'queued-1',
      operation: 'community_post',
      payload: { remote: { body: 'Retain this post' }, localId: 'local-1', _sync: { status: 'failed' } },
    };
    const retry = jest.fn().mockResolvedValue(undefined);
    const discard = jest.fn().mockResolvedValue(undefined);
    const alert = jest.spyOn(AppAlert, 'alert').mockImplementation(() => undefined);
    render(
      <PendingWriteAlerts
        failedOperations={[queuedPost]}
        onRetry={retry}
        onDiscard={discard}
        onSignIn={jest.fn()}
      />,
    );

    await waitFor(() => expect(alert).toHaveBeenCalled());
    const [, message, buttons] = alert.mock.calls[0];
    expect(message).toBe("Your post couldn't be sent. Retry / Discard");
    expect(buttons.map((button) => button.text)).toEqual(['Retry', 'Discard']);
    buttons[0].onPress();
    expect(retry).toHaveBeenCalledWith('queued-1');
    expect(queuedPost.payload.remote.body).toBe('Retain this post');
    buttons[1].onPress();
    expect(discard).toHaveBeenCalledWith('queued-1');
  });

  test('permanent quote failure exposes Retry and retains the queued request', async () => {
    const queued = {
      id: 'quote-op',
      operation: 'quote_request',
      payload: {
        user_id: 'member-1',
        message: 'Please send a quote',
        _sync: { status: 'failed' },
      },
    };
    const alert = jest.spyOn(AppAlert, 'alert').mockImplementation(() => undefined);
    const retry = jest.fn().mockResolvedValue(undefined);
    const discard = jest.fn().mockResolvedValue(undefined);
    render(
      <PendingWriteAlerts
        failedOperations={[queued]}
        onRetry={retry}
        onDiscard={discard}
        onSignIn={jest.fn()}
      />,
    );

    await waitFor(() => expect(alert).toHaveBeenCalled());
    expect(alert.mock.calls[0][1]).toBe("Your quote request couldn't be sent. Retry / Discard");
    expect(queued.payload.message).toBe('Please send a quote');
    alert.mock.calls[0][2][0].onPress();
    expect(retry).toHaveBeenCalledWith('quote-op');
  });

  test('expired-session drafts prompt the user to sign in again', async () => {
    const alert = jest.spyOn(AppAlert, 'alert').mockImplementation(() => undefined);
    render(
      <PendingWriteAlerts
        authWritePrompt={{ operation: 'review_create', payload: { comment: 'Keep me' }, draftId: 'draft-1' }}
        onRetry={jest.fn()}
        onDiscard={jest.fn()}
        onSignIn={jest.fn()}
        onClearAuthPrompt={jest.fn()}
      />,
    );
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        'Please sign in again',
        expect.stringContaining('resume after you sign in'),
        expect.any(Array),
      ),
    );
  });
});
