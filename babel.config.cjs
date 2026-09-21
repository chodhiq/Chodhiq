module.exports = function babelConfig(api) {
  api.cache(true);

  return {
    // Expo SDK 54 normally injects the Worklets plugin automatically. Disable
    // that copy so the explicit final plugin below is registered exactly once.
    presets: [['babel-preset-expo', { reanimated: false, worklets: false }]],
    plugins: ['react-native-worklets/plugin'],
  };
};
