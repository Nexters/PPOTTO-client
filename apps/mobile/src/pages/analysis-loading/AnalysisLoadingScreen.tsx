import type { AnalysisLoadingBridgeState, AnalysisLoadingPhaseState } from '@ppotto/bridge';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 배럴(index) 대신 직접 import — PhotoGrid(reanimated)까지 끌어오지 않기 위함
import { icloudDownloadStatus } from '@/features/photo-selection/model/icloud-download-status';
import {
  PhotoPreparationError,
  photoUploadService,
  type UploadMotionPhoto,
} from '@/features/photo-upload';
import { AppWebView } from '@/shared/ui/AppWebView';
import { Button } from '@/shared/ui/Button';
import { useToast } from '@/shared/ui/Toast';

import {
  createLoadingSequence,
  loadingSequenceReducer,
  type LoadingSequenceAction,
  type LoadingSequenceState,
} from './model/loading-sequence';

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
    createLoadingSequence({ serverProgress: upload.progress }),
  );
  const [motionReady, setMotionReady] = useState(false);
  const [showingBoard, setShowingBoard] = useState(false);
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
    if (!current) {
      router.replace({ pathname: '/board', params: boardId ? { boardId } : undefined });
      return;
    }

    void current.catch((error) => {
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

  const showBoard = async () => {
    await photoUploadService.finish();
    setShowingBoard(true);
  };

  return (
    <View className="flex-1 bg-black">
      <AppWebView
        bridgeHandlers={bridgeHandlers}
        downloadingFromICloud={downloadingFromICloud}
        path="/analysis-loading"
        showBoard={showingBoard}
        waitForAnalysisReady
      />

      {!showingBoard && (
        <View
          className="absolute right-[18px] bottom-0 left-[18px] pb-12"
          style={Platform.OS === 'android' ? { paddingBottom: insets.bottom + 48 } : undefined}
        >
          <Button disabled={!sequence.revealFinished} onPress={showBoard} size="large">
            <Text
              className={
                sequence.revealFinished ? 'text-body-03 text-black' : 'text-body-03 text-gray-500'
              }
            >
              결과 확인하기
            </Text>
          </Button>
        </View>
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
