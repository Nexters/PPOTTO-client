import type { AnalysisLoadingBridgeState, AnalysisLoadingPhaseState } from '@ppotto/bridge';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { photoUploadService, type UploadMotionPhoto } from '@/features/photo-upload';
import { AppWebView } from '@/shared/ui/AppWebView';
import { Button } from '@/shared/ui/Button';
import { useToast } from '@/shared/ui/Toast';

import {
  createLoadingSequence,
  loadingSequenceReducer,
  type LoadingSequenceAction,
  type LoadingSequenceState,
} from './model/loading-sequence';

export function AnalysisLoadingScreen() {
  const { boardId } = useLocalSearchParams<{ boardId?: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const upload = useSyncExternalStore(
    photoUploadService.subscribe,
    photoUploadService.getViewState,
    photoUploadService.getViewState,
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
      photoCount: photoUploadService.getMotionPhotoCount(),
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
    ({ phase }: { phase: AnalysisLoadingBridgeState['visiblePhase'] }) => {
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
      ANALYSIS_LOADING_READY: () => setMotionReady(true),
      ANALYSIS_LOADING_PHASE_STARTED: ({
        phase,
      }: {
        phase: AnalysisLoadingBridgeState['visiblePhase'];
      }) => photoUploadService.setLastSeenLoadingPhase(phase),
      ANALYSIS_LOADING_PHASE_FINISHED: finishPhase,
      ANALYSIS_LOADING_REVEAL_FINISHED: () => {
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
    if (motionReady) photoUploadService.beginUpload();
  }, [motionReady]);

  useEffect(() => {
    const current = photoUploadService.getCurrent();
    if (!current) {
      router.replace({ pathname: '/board', params: boardId ? { boardId } : undefined });
      return;
    }

    void current.catch((error) => {
      if (photoUploadService.isStatusUnavailableError(error)) {
        toast('분석 상태를 확인하지 못했어요. 잠시 후 다시 확인해주세요.');
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
        path="/analysis-loading"
        showBoard={showingBoard}
        waitForAnalysisReady
      />

      {!showingBoard && (
        <View
          className="absolute right-[18px] bottom-0 left-[18px]"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
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
