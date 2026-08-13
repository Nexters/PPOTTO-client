import Constants from 'expo-constants';
import { useEffect, useReducer, useState } from 'react';
import { Animated, AppState, PanResponder, Platform, Pressable, Text, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

import { cn } from '@/shared/lib/cn';
import { getQaDiagnostics, installRnConsoleDiagnostics } from '@/shared/lib/qa-diagnostics';
import { useToast } from '@/shared/ui/Toast';

import {
  exportLastClip,
  restartBuffering,
  stopBuffering,
} from '../../../../modules/qa-screen-recorder';
import { submitQaReport } from '../api/submit-qa-report';
import type { QaReport } from '../model/qa-report';
import { initialQaRecorderState, qaRecorderReducer } from '../model/qa-recorder-state';

import { QaReportSheet } from './QaReportSheet';

export function QaRecorderProbe() {
  const toast = useToast();
  const [recorder, send] = useReducer(qaRecorderReducer, initialQaRecorderState);
  const [position] = useState(() => new Animated.ValueXY());
  const [panResponder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => position.extractOffset(),
      onPanResponderMove: Animated.event([null, { dx: position.x, dy: position.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => position.flattenOffset(),
      onPanResponderTerminate: () => position.flattenOffset(),
    }),
  );

  useEffect(() => {
    position.setOffset({ x: 0, y: 0 });
    position.setValue({ x: 0, y: 0 });
  }, [position]);

  useEffect(() => installRnConsoleDiagnostics(), []);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    let active = true;
    const startFreshBuffer = async () => {
      try {
        await restartBuffering();
        if (active && AppState.currentState === 'active') {
          send({ type: 'RECORDING_STARTED' });
        }
      } catch (error) {
        console.error('[qa-recorder] buffering failed', error);
        if (active && AppState.currentState === 'active') {
          send({ type: 'RECORDING_FAILED' });
          toast('화면 기록을 시작하지 못했어요.');
        }
      }
    };

    const handleAppState = (nextAppState: string) => {
      if (nextAppState === 'active') {
        void startFreshBuffer();
        return;
      }

      send({ type: 'RECORDING_INTERRUPTED' });
      void stopBuffering().catch(() => undefined);
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    handleAppState(AppState.currentState);

    return () => {
      active = false;
      subscription.remove();
      void stopBuffering().catch(() => undefined);
    };
  }, [toast]);

  if (Platform.OS !== 'ios') return null;

  const startReport = async () => {
    if (recorder.status !== 'ready') return;

    const reportTime = Date.now();
    const diagnostics = getQaDiagnostics(reportTime);
    send({ type: 'EXPORT_STARTED' });

    try {
      const video = await exportLastClip();
      send({
        type: 'EXPORT_SUCCEEDED',
        reportSeed: {
          reportedAt: new Date(reportTime).toISOString(),
          buildNumber:
            Constants.platform?.ios?.buildNumber ??
            Constants.expoConfig?.ios?.buildNumber ??
            'unknown',
          diagnostics,
          video,
        },
      });
    } catch (error) {
      console.error('[qa-recorder] clip export failed', error);
      toast('직전 15초 영상을 만들지 못했어요.');
      send({ type: 'EXPORT_FAILED' });
    }
  };

  const submitReport = async (report: QaReport) => {
    if (recorder.status !== 'writing') return;

    send({ type: 'SUBMIT_STARTED' });
    try {
      await submitQaReport(report);
      send({ type: 'SUBMIT_SUCCEEDED' });
      toast('QA 리포트를 등록했어요.');
    } catch (error) {
      console.error('[qa-report] submission failed', error);
      send({ type: 'SUBMIT_FAILED' });
      toast('QA 리포트를 등록하지 못했어요.');
    }
  };

  const buttonDisabled = recorder.status !== 'ready';
  const reportSeed =
    recorder.status === 'writing' || recorder.status === 'submitting'
      ? recorder.reportSeed
      : undefined;

  return (
    <>
      {!reportSeed && (
        <FullWindowOverlay>
          <View className="absolute inset-0 z-[2147483647]" pointerEvents="box-none">
            <Animated.View
              {...panResponder.panHandlers}
              className={cn(
                'absolute left-1/2 top-1/2 z-[2147483647] size-[76px] rounded-full',
                '-ml-[38px] -mt-[38px] bg-[#FFD60A] shadow-xl',
              )}
              style={{ transform: position.getTranslateTransform() }}
            >
              <Pressable
                accessibilityLabel="QA 리포트 작성"
                accessibilityRole="button"
                className={cn(
                  'absolute inset-0 z-[2147483647] items-center justify-center rounded-full bg-[#FFD60A]',
                  buttonDisabled && 'opacity-[0.45]',
                )}
                disabled={buttonDisabled}
                onPress={() => void startReport()}
              >
                <Text className="text-center text-[18px] font-extrabold text-black">
                  {recorder.status === 'exporting' ? '···' : 'QA'}
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </FullWindowOverlay>
      )}

      {reportSeed && (
        <QaReportSheet
          onClose={() => send({ type: 'REPORT_CLOSED' })}
          onSubmit={(report) => void submitReport(report)}
          seed={reportSeed}
          submitting={recorder.status === 'submitting'}
        />
      )}
    </>
  );
}
