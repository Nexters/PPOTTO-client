import type { ConfigContext } from 'expo/config';

const SENTRY_EXPO_PLUGIN = '@sentry/react-native/expo';

export default ({ config }: ConfigContext) => ({
  ...config,
  plugins: config.plugins?.map((plugin) => {
    if (!Array.isArray(plugin) || plugin[0] !== SENTRY_EXPO_PLUGIN) return plugin;

    return [
      plugin[0],
      { ...(plugin[1] as object), disableAutoUpload: !process.env.SENTRY_AUTH_TOKEN },
    ];
  }),
});
