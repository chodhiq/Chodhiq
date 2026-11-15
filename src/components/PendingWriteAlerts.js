import { useEffect, useRef } from 'react';
import { AppAlert } from './AppDialog';

export default function PendingWriteAlerts({
  failedOperations = [],
  authRequiredOperations = [],
  authWritePrompt = null,
  onRetry,
  onDiscard,
  onSignIn,
  onClearAuthPrompt,
}) {
  const shownFailed = useRef(new Set());
  const shownAuth = useRef(new Set());

  useEffect(() => {
    const keyFor = (item) => `${item.id}:${item.payload?._sync?.retryVersion || 0}`;
    const active = new Set(failedOperations.map(keyFor));
    shownFailed.current = new Set([...shownFailed.current].filter((id) => active.has(id)));
    const item = failedOperations.find((operation) => !shownFailed.current.has(keyFor(operation)));
    if (!item) return;
    shownFailed.current.add(keyFor(item));
    const labels = {
      community_post: 'post',
      saved_item: 'saved item',
      quote_request: 'quote request',
      profile_update: 'profile changes',
      provider_report: 'provider report',
      review_create: 'review',
    };
    const label = labels[item.operation];
    const article =
      label === 'saved item'
        ? 'Your saved item'
        : label === 'quote request'
          ? 'Your quote request'
          : label === 'profile changes'
            ? 'Your profile changes'
            : `Your ${label || 'saved change'}`;
    AppAlert.alert(
      label ? `${label[0].toUpperCase()}${label.slice(1)} not sent` : 'Change not sent',
      label
        ? `${article} couldn't be sent. Retry / Discard`
        : "Your saved change couldn't be sent. Retry / Discard",
      [
        { text: 'Retry', onPress: () => void onRetry(item.id) },
        { text: 'Discard', style: 'destructive', onPress: () => void onDiscard(item.id) },
      ],
    );
  }, [failedOperations, onDiscard, onRetry]);

  useEffect(() => {
    const active = new Set(authRequiredOperations.map((item) => item.id));
    shownAuth.current = new Set([...shownAuth.current].filter((id) => active.has(id)));
    const item = authRequiredOperations.find((operation) => !shownAuth.current.has(operation.id));
    if (!item) return;
    shownAuth.current.add(item.id);
    AppAlert.alert('Please sign in again', 'Your saved write will resume after you sign in.', [
      { text: 'Sign in again', onPress: onSignIn },
      { text: 'Later', style: 'cancel' },
    ]);
  }, [authRequiredOperations, onSignIn]);

  useEffect(() => {
    if (!authWritePrompt) return;
    AppAlert.alert(
      'Please sign in again',
      'Your draft is saved and this write will resume after you sign in.',
      [
        { text: 'Sign in again', onPress: onSignIn },
        { text: 'Keep draft', style: 'cancel', onPress: onClearAuthPrompt },
      ],
    );
  }, [authWritePrompt, onClearAuthPrompt, onSignIn]);

  return null;
}
