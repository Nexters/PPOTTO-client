import '../global.css';

import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { userQueryKeys } from '@/entities/user/api/user-query-keys';
import { QaRecorderProbe } from '@/features/qa-report';
import { initObservability, watchUserIdentity } from '@/lib/observability';
import { isQaToolEnabled } from '@/shared/lib/qa-tool';
import { AppBackground } from '@/shared/ui/AppBackground';
import { AppLaunchScreen } from '@/shared/ui/AppLaunchScreen';
import { ToastProvider } from '@/shared/ui/Toast';

initObservability();

const queryClient = new QueryClient();

watchUserIdentity(queryClient, userQueryKeys.me());
const appTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: 'transparent',
    card: 'transparent',
  },
};

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  transparent: { backgroundColor: 'transparent' },
});
