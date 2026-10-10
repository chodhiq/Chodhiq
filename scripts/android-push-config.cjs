const fs = require('node:fs');
const path = require('node:path');
function validateAndroidPushConfig(config, expectedPackage = 'com.chodhiq.app') {
  if (!config || config.type === 'service_account' || config.private_key)
    throw new Error(
      'Use the Android google-services.json client configuration, never a service-account key.',
    );
  if (
    !config.project_info?.project_id ||
    !/^\d+$/.test(String(config.project_info.project_number || ''))
  )
    throw new Error('Android Firebase project configuration is incomplete.');
  const client = config.client?.find(
    (item) => item.client_info?.android_client_info?.package_name === expectedPackage,
  );
  if (
    !client?.client_info?.mobilesdk_app_id?.startsWith(
      '1:' + config.project_info.project_number + ':android:',
    )
  )
    throw new Error('Android Firebase configuration does not match the ChodhiQ package.');
  return true;
}
function validateAndroidGoogleOAuthConfig(webClientId, signingCertificateSha1) {
  if (!webClientId || !/^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(webClientId)) {
    throw new Error(
      'Android Google sign-in requires EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID from the Google Cloud OAuth project.',
    );
  }
  const expectedSha1 = String(signingCertificateSha1 || '')
    .replace(/:/g, '')
    .toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(expectedSha1)) {
    throw new Error(
      'Android Google sign-in requires EXPO_PUBLIC_GOOGLE_ANDROID_SHA1 for this EAS signing certificate.',
    );
  }
  // Google validates the Android package/SHA-1 OAuth client at sign-in time.
  // Keep build validation independent of google-services.json, which is used
  // only by Firebase Cloud Messaging in this app.
  return true;
}
function androidPushConfigPath(
  environment = process.env,
  projectRoot = path.resolve(__dirname, '..'),
) {
  const configuredFile = environment.GOOGLE_SERVICES_JSON || environment.GOOGLE_SERVICES_FILE;
  const file = path.resolve(projectRoot, configuredFile || 'google-services.json');
  if (!configuredFile && !fs.existsSync(file)) return null;
  if (!fs.existsSync(file))
    throw new Error('The configured Android Firebase client file is missing.');
  validateAndroidPushConfig(JSON.parse(fs.readFileSync(file, 'utf8')));
  return file;
}
module.exports = {
  validateAndroidPushConfig,
  validateAndroidGoogleOAuthConfig,
  androidPushConfigPath,
};
