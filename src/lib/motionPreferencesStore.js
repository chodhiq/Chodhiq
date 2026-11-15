const VISUAL_EFFECTS_KEY = 'chodhiq-visual-effects-level';
const VISUAL_EFFECTS_LEVELS = new Set(['full', 'reduced', 'off']);

export function createMotionPreferencesStore(accessibility, appState, storage = {}) {
  let snapshot = {
    reducedMotion: true,
    systemReducedMotion: true,
    visualEffectsLevel: null,
    visualEffectsLoaded: false,
    foreground: appState.currentState === 'active',
  };
  const listeners = new Set();
  let subscriptions = [];
  let generation = 0;
  let revision = 0;
  let preferenceRevision = 0;

  function update(patch) {
    const next = { ...snapshot, ...patch };
    next.reducedMotion = next.visualEffectsLevel
      ? next.visualEffectsLevel !== 'full'
      : !next.visualEffectsLoaded || next.systemReducedMotion;
    if (
      next.reducedMotion === snapshot.reducedMotion &&
      next.systemReducedMotion === snapshot.systemReducedMotion &&
      next.visualEffectsLevel === snapshot.visualEffectsLevel &&
      next.visualEffectsLoaded === snapshot.visualEffectsLoaded &&
      next.foreground === snapshot.foreground
    )
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
      const requestedPreferenceRevision = preferenceRevision;
      Promise.resolve()
        .then(() => storage.getItem?.(VISUAL_EFFECTS_KEY))
        .then(
          (level) => {
            if (request !== generation || preferenceRevision !== requestedPreferenceRevision)
              return;
            update({
              visualEffectsLevel: VISUAL_EFFECTS_LEVELS.has(level) ? level : null,
              visualEffectsLoaded: true,
            });
          },
          () => {
            if (request === generation && preferenceRevision === requestedPreferenceRevision)
              update({ visualEffectsLoaded: true });
          },
        )
        .then(() => {
          if (request !== generation) return undefined;
          return accessibility.isReduceMotionEnabled();
        })
        .then((reducedMotion) => {
          if (
            typeof reducedMotion === 'boolean' &&
            request === generation &&
            revision === requestedRevision
          )
            update({ systemReducedMotion: reducedMotion });
        })
        .catch(() => {});
      subscriptions = [
        accessibility.addEventListener('reduceMotionChanged', (reducedMotion) => {
          revision += 1;
          update({ systemReducedMotion: reducedMotion });
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

  function setVisualEffectsLevel(level) {
    if (level !== null && !VISUAL_EFFECTS_LEVELS.has(level))
      return Promise.reject(new TypeError('Invalid visual effects level.'));
    preferenceRevision += 1;
    update({ visualEffectsLevel: level, visualEffectsLoaded: true });
    const operation =
      level === null
        ? storage.removeItem?.(VISUAL_EFFECTS_KEY)
        : storage.setItem?.(VISUAL_EFFECTS_KEY, level);
    return Promise.resolve(operation).catch(() => {});
  }

  return { subscribe, getSnapshot: () => snapshot, setVisualEffectsLevel };
}
