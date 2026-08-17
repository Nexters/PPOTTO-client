import '../global.css';

import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isRunningInExpoGo } from 'expo';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { QaRecorderProbe } from '@/features/qa-report';
import { isQaToolEnabled } from '@/shared/lib/qa-tool';
import {
  SENTRY_DIST,
  SENTRY_DSN,
  SENTRY_ENABLED,
  SENTRY_ENVIRONMENT,
  SENTRY_PROFILES_SAMPLE_RATE,
  SENTRY_RELEASE,
  SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
  SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
  SENTRY_TRACES_SAMPLE_RATE,
  SENTRY_TRACE_PROPAGATION_TARGETS,
} from '@/shared/lib/sentry';
import { AppBackground } from '@/shared/ui/AppBackground';
import { ToastProvider } from '@/shared/ui/Toast';

SplashScreen.setOptions({ duration: 200, fade: true });
void SplashScreen.preventAutoHideAsync();

if (SENTRY_ENABLED) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: SENTRY_RELEASE,
    dist: SENTRY_DIST,
    sendDefaultPii: true,
    attachStacktrace: true,
    enableLogs: true,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    tracePropagationTargets: SENTRY_TRACE_PROPAGATION_TARGETS,
    profilesSampleRate: SENTRY_PROFILES_SAMPLE_RATE,
    replaysSessionSampleRate: SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
    replaysOnErrorSampleRate: SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
    enableNativeFramesTracking: !isRunningInExpoGo(),
    enableUserInteractionTracing: true,
    enableCaptureFailedRequests: true,
    attachScreenshot: true,
    attachViewHierarchy: true,
    screenshot: { maskAllText: false, maskAllImages: true },
    integrations: [
      Sentry.expoRouterIntegration({ enableTimeToInitialDisplay: !isRunningInExpoGo() }),
      Sentry.mobileReplayIntegration({
        maskAllText: false,
        maskAllImages: true,
        maskAllVectors: false,
      }),
    ],
  });
}

const queryClient = new QueryClient();
const appTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: 'transparent',
    card: 'transparent',
  },
};

function RootLayout() {
  useEffect(() => {
    const timer = setTimeout(() => void SplashScreen.hideAsync(), 700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={styles.root}>
        <AppBackground />
        <ThemeProvider value={appTheme}>
          <ToastProvider>
            <Stack screenOptions={{ headerShown: false, contentStyle: styles.transparent }}>
              <Stack.Screen name="(auth)/index" />
              <Stack.Screen
                name="photo-select"
                options={{
                  animationTypeForReplace: 'pop',
                  fullScreenGestureEnabled: false,
                  gestureEnabled: true,
                }}
              />
              <Stack.Screen
                name="analysis-loading"
                options={{
                  animation: 'default',
                  animationTypeForReplace: 'push',
                  gestureEnabled: false,
                }}
              />
              <Stack.Screen name="board" options={{ animation: 'none' }} />
            </Stack>
            {isQaToolEnabled() && <QaRecorderProbe />}
          </ToastProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  transparent: { backgroundColor: 'transparent' },
});
