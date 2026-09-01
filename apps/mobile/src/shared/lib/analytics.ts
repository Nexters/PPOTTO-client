import { getAnalytics, logEvent } from '@react-native-firebase/analytics';

export function track(name: string, params: Record<string, string | number> = {}) {
  logEvent(getAnalytics(), name, params);
}
