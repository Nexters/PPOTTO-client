import '../global.css';

import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isRunningInExpoGo } from 'expo';
import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { QaRecorderProbe } from '@/features/qa-report';
import { AppReadyProvider } from '@/shared/lib/app-ready';
import { isQaToolEnabled } from '@/shared/lib/qa-tool';
import {
  SENTRY_DSN,
  SENTRY_ENABLED,
  SENTRY_ENVIRONMENT,
  SENTRY_TRACES_SAMPLE_RATE,
  SENTRY_TRACE_PROPAGATION_TARGETS,
} from '@/shared/lib/sentry';
import { AppBackground } from '@/shared/ui/AppBackground';
import { AppLaunchScreen } from '@/shared/ui/AppLaunchScreen';
import { ToastProvider } from '@/shared/ui/Toast';

if (SENTRY_ENABLED) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    tracePropagationTargets: SENTRY_TRACE_PROPAGATION_TARGETS,
    enableNativeFramesTracking: !isRunningInExpoGo(),
    integrations: [
      Sentry.expoRouterIntegration({ enableTimeToInitialDisplay: !isRunningInExpoGo() }),
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
  return (
    <QueryClientProvider client={queryClient}>
      <AppReadyProvider>
        <View style={styles.root}>
          <AppBackground />
          <ThemeProvider value={appTheme}>
            <ToastProvider>
              <Stack screenOptions={{ headerShown: false, contentStyle: styles.transparent }}>
                <Stack.Screen name="(auth)/index" />
                <Stack.Screen name="photo-select" options={{ animationTypeForReplace: 'pop' }} />
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
          <AppLaunchScreen />
        </View>
      </AppReadyProvider>
    </QueryClientProvider>
  );
}

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  transparent: { backgroundColor: 'transparent' },
});
