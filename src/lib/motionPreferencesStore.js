export function createMotionPreferencesStore(accessibility, appState) {
  let snapshot = { reducedMotion: true, foreground: appState.currentState === 'active' };
  const listeners = new Set();
  let subscriptions = [];
  let generation = 0;
  let revision = 0;

  function update(patch) {
    const next = { ...snapshot, ...patch };
    if (next.reducedMotion === snapshot.reducedMotion && next.foreground === snapshot.foreground)
      return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener) {
    listeners.add(listener);
    if (listeners.size === 1) {
      const request = ++generation;
      const requestedRevision = revision;
      update({ foreground: appState.currentState === 'active' });
      accessibility
        .isReduceMotionEnabled()
        .then((reducedMotion) => {
          if (request === generation && revision === requestedRevision) update({ reducedMotion });
        })
        .catch(() => {});
      subscriptions = [
        accessibility.addEventListener('reduceMotionChanged', (reducedMotion) => {
          revision += 1;
          update({ reducedMotion });
        }),
        appState.addEventListener('change', (state) => update({ foreground: state === 'active' })),
      ];
    }
    return () => {
      listeners.delete(listener);
      if (!listeners.size) {
        generation += 1;
        subscriptions.forEach((subscription) => subscription.remove());
        subscriptions = [];
      }
    };
  }

  return { subscribe, getSnapshot: () => snapshot };
}
