let activeScreenName = 'App';

export function setActiveScreenName(screenName) {
  activeScreenName = typeof screenName === 'string' && screenName.trim() ? screenName : 'App';
}

export function getActiveScreenName() {
  return activeScreenName;
}
