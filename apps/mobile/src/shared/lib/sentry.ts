import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const SENTRY_TRACE_PROPAGATION_TARGETS = [
  /^https:\/\/api\.ppotto\.co\.kr(\/|$)/,
  /^https:\/\/dev-api\.ppotto\.co\.kr(\/|$)/,
];

export const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const SENTRY_ENVIRONMENT = process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? 'development';

export const SENTRY_ENABLED = Boolean(SENTRY_DSN);

const expoConfig = Constants.expoConfig;

const applicationId =
  Platform.OS === 'ios' ? expoConfig?.ios?.bundleIdentifier : expoConfig?.android?.package;

const buildNumber =
  Platform.OS === 'ios' ? expoConfig?.ios?.buildNumber : expoConfig?.android?.versionCode;

export const SENTRY_DIST = buildNumber == null ? undefined : String(buildNumber);

export const SENTRY_RELEASE =
  applicationId && expoConfig?.version
    ? `${applicationId}@${expoConfig.version}${SENTRY_DIST ? `+${SENTRY_DIST}` : ''}`
    : undefined;

export const SENTRY_TRACES_SAMPLE_RATE = 1;

export const SENTRY_PROFILES_SAMPLE_RATE = 1;

export const SENTRY_REPLAYS_SESSION_SAMPLE_RATE = 1;

export const SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE = 1;
