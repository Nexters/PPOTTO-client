import { HttpError } from '@ppotto/api';
import type { AnalysisLoadingBridgeState, AnalysisLoadingPhaseState } from '@ppotto/bridge';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, BackHandler, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { analysisApi } from '@/entities/analysis/api/analysis-api';
// 배럴(index) 대신 직접 import — PhotoGrid(reanimated)까지 끌어오지 않기 위함
import { icloudDownloadStatus } from '@/features/photo-selection/model/icloud-download-status';
import {
  PhotoPreparationError,
  photoUploadService,
  type UploadMotionPhoto,
} from '@/features/photo-upload';
import {
  EnablePushNotificationButton,
  NotificationRequestedSnackbar,
} from '@/features/push-notification';
import { AppWebView } from '@/shared/ui/AppWebView';
import { Button } from '@/shared/ui/Button';
import { useToast } from '@/shared/ui/Toast';
import { track } from '@/shared/lib/analytics';

import {
  createLoadingSequence,
  loadingSequenceReducer,
  type LoadingSequenceAction,
  type LoadingSequenceState,
} from './model/loading-sequence';
import { CancelAnalysisModal } from './ui/CancelAnalysisModal';

const PRE_ANALYSIS_PROGRESS_MAX = 10;
const PRE_ANALYSIS_PROGRESS_INTERVAL_MS = 1_000;

export function AnalysisLoadingScreen() {
  const { boardId } = useLocalSearchParams<{ boardId?: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const upload = useSyncExternalStore(
    photoUploadService.subscribe,
    photoUploadService.getViewState,
    photoUploadService.getViewState,
  );
  const downloadingFromICloud = useSyncExternalStore(
    icloudDownloadStatus.subscribe,
    icloudDownloadStatus.isDownloading,
    icloudDownloadStatus.isDownloading,
  );
  const uploadRef = useRef(upload);
  const bridgePhotosRef = useRef<UploadMotionPhoto[]>([]);
  const [sequence, setSequence] = useState(() =>
    createLoadingSequence({
      serverProgress: upload.progress,
      completed: photoUploadService.isCompletedRecovery(),
    }),
  );
  const [motionReady, setMotionReady] = useState(false);
  const [showingBoard, setShowingBoard] = useState(false);
  const [resyncState, setResyncState] = useState<AnalysisLoadingPhaseState>();
  const [notificationOverride, setNotificationOverride] = useState<{
    analysisId: string;
    requested: boolean;
  } | null>(null);
  const [notificationSnackbar, setNotificationSnackbar] = useState<{
    analysisId: string;
    variant: 'requested' | 'cancelFailed';
  } | null>(null);
  const [cancelingNotification, setCancelingNotification] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelingAnalysis, setCancelingAnalysis] = useState(false);
  const sequenceRef = useRef(sequence);

  const commitSequence = useCallback((next: LoadingSequenceState) => {
    sequenceRef.current = next;
    setSequence(next);
    return next;
  }, []);

  const updateSequence = useCallback(
    (action: LoadingSequenceAction) =>
      commitSequence(loadingSequenceReducer(sequenceRef.current, action)),
    [commitSequence],
  );

  const bridgeStateFor = useCallback(
    (state: LoadingSequenceState): AnalysisLoadingBridgeState => ({
      jobId: photoUploadService.getCurrentJobId(),
      photoCount: photoUploadService.getMotionPhotoCount(),
      downloadingFromICloud: icloudDownloadStatus.isDownloading(),
      photos: bridgePhotosRef.current.map(({ id, uri, width, height }) => ({
        id,
        uri,
        width,
        height,
      })),
      ...toBridgePhaseState(state),
    }),
    [],
  );

  const getInitialBridgeState = useCallback(async () => {
    const [lastSeenPhase, photos] = await Promise.all([
      photoUploadService.getLastSeenLoadingPhase(),
      photoUploadService.getMotionPhotosForWeb(),
    ]);
    bridgePhotosRef.current = photos;
    return bridgeStateFor(
      commitSequence(
        createLoadingSequence({
          serverProgress: uploadRef.current.progress,
          lastSeenPhase,
          completed: photoUploadService.isCompletedRecovery(),
        }),
      ),
    );
  }, [bridgeStateFor, commitSequence]);

  const finishPhase = useCallback(
    ({
      jobId,
      phase,
    }: {
      jobId: string | null;
      phase: AnalysisLoadingBridgeState['visiblePhase'];
    }) => {
      if (!photoUploadService.isCurrentJob(jobId)) return toBridgePhaseState(sequenceRef.current);

      const latest = loadingSequenceReducer(sequenceRef.current, {
        type: 'SERVER_PROGRESS_UPDATED',
        progress: uploadRef.current.progress,
      });
      return toBridgePhaseState(
        commitSequence(loadingSequenceReducer(latest, { type: 'PHASE_FINISHED', phase })),
      );
    },
    [commitSequence],
  );

  const bridgeHandlers = useMemo(
    () => ({
      GET_ANALYSIS_LOADING_STATE: getInitialBridgeState,
      ANALYSIS_LOADING_READY: ({ jobId }: { jobId: string | null }) => {
        if (photoUploadService.isCurrentJob(jobId)) setMotionReady(true);
      },
      ANALYSIS_LOADING_PHASE_STARTED: ({
        jobId,
        phase,
      }: {
        jobId: string | null;
        phase: AnalysisLoadingBridgeState['visiblePhase'];
      }) =>
        photoUploadService.isCurrentJob(jobId)
          ? photoUploadService.setLastSeenLoadingPhase(phase)
          : undefined,
      ANALYSIS_LOADING_PHASE_FINISHED: finishPhase,
      ANALYSIS_LOADING_REVEAL_FINISHED: ({ jobId }: { jobId: string | null }) => {
        if (!photoUploadService.isCurrentJob(jobId)) return;
        setCancelModalVisible(false);
        updateSequence({ type: 'REVEAL_FINISHED' });
      },
    }),
    [finishPhase, getInitialBridgeState, updateSequence],
  );

  useEffect(() => {
    uploadRef.current = upload;
    updateSequence({ type: 'SERVER_PROGRESS_UPDATED', progress: upload.progress });
  }, [updateSequence, upload]);

  useEffect(() => {
    let previousAppState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const cameToForeground =
        previousAppState.match(/inactive|background/) && nextAppState === 'active';
      previousAppState = nextAppState;
      if (!cameToForeground || sequenceRef.current.revealFinished) return;

      void photoUploadService
        .refreshNow()
        .then(() => {
          const latest = photoUploadService.getViewState();
          if (!latest.analysisId) return;
          const next = updateSequence({
            type: 'FOREGROUND_RESYNCED',
            progress: latest.progress,
            completed: latest.status === 'COMPLETED',
          });
          setResyncState(toBridgePhaseState(next));
        })
        .catch(() => undefined);
    });

    return () => subscription.remove();
  }, [updateSequence]);

  useEffect(() => {
    if (!motionReady || upload.status !== 'UPLOADING' || upload.progress > 0) return;

    const timer = setInterval(() => {
      const progress = Math.min(PRE_ANALYSIS_PROGRESS_MAX, sequenceRef.current.serverProgress + 1);
      updateSequence({ type: 'SERVER_PROGRESS_UPDATED', progress });
      if (progress === PRE_ANALYSIS_PROGRESS_MAX) clearInterval(timer);
    }, PRE_ANALYSIS_PROGRESS_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [motionReady, updateSequence, upload.progress, upload.status]);

  useEffect(() => {
    const current = photoUploadService.getCurrent();
    const jobId = photoUploadService.getCurrentJobId();
    if (!current) {
      router.replace({ pathname: '/board', params: boardId ? { boardId } : undefined });
      return;
    }

    void current.catch((error) => {
      if (!photoUploadService.isCurrentJob(jobId)) return;
      if (error instanceof PhotoPreparationError) {
        toast('사진을 불러오지 못했어요. 다시 업로드해 주세요.');
        photoUploadService.clearCurrent();
      } else if (photoUploadService.isRecoverableError(error)) {
        photoUploadService.clearCurrent();
      } else {
        router.replace({ pathname: '/board', params: boardId ? { boardId } : undefined });
        return;
      }
      router.replace({
        pathname: '/board',
        params: boardId ? { boardId } : undefined,
      });
    });
  }, [boardId, toast]);

  useEffect(() => {
    if (Platform.OS !== 'android' || sequence.revealFinished) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (cancelingAnalysis) return true;
      if (cancelModalVisible) {
        setCancelModalVisible(false);
      } else {
        setCancelModalVisible(true);
      }
      return true;
    });

    return () => subscription.remove();
  }, [cancelModalVisible, cancelingAnalysis, sequence.revealFinished]);

  const showBoard = async () => {
    track('analysis_result_clicked');
    await photoUploadService.finish();
    setShowingBoard(true);
  };

  const cancelAnalysis = async () => {
    if (cancelingAnalysis || sequenceRef.current.revealFinished) return;

    const uploadMode = photoUploadService.getUploadMode();
    setCancelingAnalysis(true);
    try {
      const result = await photoUploadService.discard();
      setCancelModalVisible(false);
      if (result === 'DISCARDED') {
        router.replace({
          pathname: '/photo-select',
          params: {
            ...(boardId ? { boardId } : {}),
            ...(uploadMode === 'additional' ? { mode: 'additional' } : {}),
          },
        });
        return;
      }
      if (result === 'RETRY') {
        toast('작업을 종료하지 못했어요. 다시 시도해 주세요.');
        return;
      }

      await photoUploadService.refreshNow();
      const latest = photoUploadService.getViewState();
      if (latest.status === 'FAILED') {
        router.replace({ pathname: '/board', params: boardId ? { boardId } : undefined });
        return;
      }
      if (latest.status === 'COMPLETED') {
        toast('이미 스티커 생성이 완료되었어요.');
      }
      const next = updateSequence({
        type: 'FOREGROUND_RESYNCED',
        progress: latest.progress,
        completed: latest.status === 'COMPLETED',
      });
      setResyncState(toBridgePhaseState(next));
    } catch {
      setCancelModalVisible(false);
      toast('작업을 종료하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setCancelingAnalysis(false);
    }
  };

  const handleNotificationRegistered = useCallback((analysisId: string) => {
    if (uploadRef.current.analysisId !== analysisId) return;
    setNotificationOverride({ analysisId, requested: true });
    setNotificationSnackbar({ analysisId, variant: 'requested' });
  }, []);

  const dismissNotificationSnackbar = useCallback(() => {
    setNotificationSnackbar(null);
  }, []);

  const cancelNotification = async () => {
    const analysisId = notificationSnackbar?.analysisId;
    if (!analysisId || cancelingNotification) return;

    setCancelingNotification(true);
    setNotificationSnackbar(null);
    try {
      await analysisApi.cancelNotification(analysisId);
      if (uploadRef.current.analysisId === analysisId) {
        setNotificationOverride({ analysisId, requested: false });
      }
    } catch (error) {
      if (
        uploadRef.current.analysisId === analysisId &&
        !(error instanceof HttpError && error.status === 409)
      ) {
        setNotificationSnackbar({ analysisId, variant: 'cancelFailed' });
      }
    } finally {
      setCancelingNotification(false);
    }
  };

  const notificationRequested =
    notificationOverride !== null && notificationOverride.analysisId === upload.analysisId
      ? notificationOverride.requested
      : upload.notificationRequested;
  const notificationSnackbarVisible =
    notificationSnackbar !== null &&
    notificationSnackbar.analysisId === upload.analysisId &&
    upload.status !== 'COMPLETED' &&
    !sequence.revealFinished;

  return (
    <View className="flex-1 bg-black">
      <AppWebView
        bridgeHandlers={bridgeHandlers}
        analysisLoadingResync={resyncState}
        downloadingFromICloud={downloadingFromICloud}
        path="/analysis-loading"
        showBoard={showingBoard}
        waitForAnalysisReady
      />

      {!showingBoard && (
        <>
          <NotificationRequestedSnackbar
            onCancel={() => void cancelNotification()}
            onDismiss={dismissNotificationSnackbar}
            variant={notificationSnackbar?.variant}
            visible={notificationSnackbarVisible}
          />
          <View
            className="absolute right-[18px] bottom-0 left-[18px] gap-2 pb-12"
            style={Platform.OS === 'android' ? { paddingBottom: insets.bottom + 48 } : undefined}
          >
            {sequence.revealFinished ? (
              <Button onPress={showBoard} size="large">
                <Text className="text-body-03 text-black">결과 확인하기</Text>
              </Button>
            ) : (
              <>
                <EnablePushNotificationButton
                  analysisId={upload.analysisId}
                  notificationRequested={notificationRequested}
                  onRegistered={handleNotificationRegistered}
                />
                <Pressable
                  accessibilityRole="button"
                  className="items-center justify-center w-full py-3 rounded-full"
                  onPress={() => setCancelModalVisible(true)}
                >
                  <Text className="text-gray-600 text-body-05">뒤로가기</Text>
                </Pressable>
              </>
            )}
          </View>
          <CancelAnalysisModal
            canceling={cancelingAnalysis}
            onCancel={() => setCancelModalVisible(false)}
            onConfirm={() => void cancelAnalysis()}
            visible={cancelModalVisible && !sequence.revealFinished}
          />
        </>
      )}
    </View>
  );
}

function toBridgePhaseState(state: LoadingSequenceState): AnalysisLoadingPhaseState {
  return {
    visiblePhase: state.visiblePhase,
    visualProgress: state.visualProgress,
  };
}
