import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export interface QaScreenRecordingClip {
  uri: string;
  size: number;
}

interface QaScreenRecorderNativeModule {
  startBuffering(): Promise<void>;
  exportLastClip(): Promise<QaScreenRecordingClip>;
  stopBuffering(): Promise<void>;
}

const recorder =
  Platform.OS === 'ios'
    ? requireNativeModule<QaScreenRecorderNativeModule>('QaScreenRecorder')
    : null;

function requireRecorder() {
  if (!recorder) throw new Error('QA screen recording is only available on iOS');
  return recorder;
}

export const startBuffering = () => requireRecorder().startBuffering();
export const exportLastClip = () => requireRecorder().exportLastClip();
export const stopBuffering = () => requireRecorder().stopBuffering();
