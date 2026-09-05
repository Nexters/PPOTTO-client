import { CommonActions, useNavigation, usePreventRemove } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { photoUploadService, type PhotoUploadFailure } from '@/features/photo-upload';
import { AppBackground } from '@/shared/ui/AppBackground';
import { AppWebView } from '@/shared/ui/AppWebView';

import { getUploadFailureFeedback } from './model/upload-failure-feedback';
import { PendingUploadModal } from './ui/PendingUploadModal';
import { UploadFailureModal } from './ui/UploadFailureModal';

type BoardScreenState =
  | { status: 'CHECKING' }
  | { status: 'READY' }
  | { status: 'PENDING' }
  | { failure?: PhotoUploadFailure; status: 'FAILED' };

function logPendingUpload(message: string, details?: unknown) {
  if (!__DEV__ || process.env.NODE_ENV === 'test') return;
  // eslint-disable-next-line no-console
  console.log(`[pending-upload] ${message}`, details ?? '');
}

// 보드, 리캡 전용 웹뷰
export function BoardScreen() {
  const navigation = useNavigation();
  const allowPendingNavigation = useRef(false);
  const { boardId } = useLocalSearchParams<{ boardId?: string }>();
  const [screenState, setScreenState] = useState<BoardScreenState>(() => {
    const upload = photoUploadService.getViewState();
    if (photoUploadService.getCurrent() && upload.status === 'FAILED') {
      return { status: 'FAILED', ...(upload.failure ? { failure: upload.failure } : {}) };
    }
    return { status: 'CHECKING' };
  });
  const failureFeedback = getUploadFailureFeedback(
    screenState.status === 'FAILED' ? screenState.failure : undefined,
  );

  usePreventRemove(screenState.status === 'PENDING', ({ data }) => {
    if (!allowPendingNavigation.current) {
      logPendingUpload('화면 이동 차단', { action: data.action.type });
      return;
    }
    logPendingUpload('확인된 화면 이동 실행', { action: data.action.type });
    navigation.dispatch(data.action);
  });

  useEffect(() => {
    if (screenState.status !== 'CHECKING') return;

    if (photoUploadService.getCurrent()) {
      router.replace({ pathname: '/analysis-loading', params: boardId ? { boardId } : undefined });
      return;
    }

    let active = true;
    void photoUploadService.hasPending().then(
      (hasPending) => {
        if (!active) return;
        if (!hasPending) {
          setScreenState({ status: 'READY' });
          return;
        }
        setScreenState({ status: 'PENDING' });
      },
      () => {
        if (active) setScreenState({ status: 'READY' });
      },
    );

    return () => {
      active = false;
    };
  }, [boardId, screenState.status]);

  useEffect(() => {
    if (screenState.status !== 'PENDING') return;

    photoUploadService.resume();
    void photoUploadService.getMotionPhotosForWeb().catch(() => undefined);
  }, [screenState.status]);

  const clearPreviousScreens = () => {
    navigation.dispatch((state) =>
      CommonActions.reset({ ...state, index: 0, routes: state.routes.slice(-1) }),
    );
  };

  const openLoadingScreen = () => {
    logPendingUpload('확인 처리 시작', { boardId, screenStatus: screenState.status });
    allowPendingNavigation.current = true;
    if (screenState.status !== 'PENDING') {
      photoUploadService.resume();
      void photoUploadService.getMotionPhotosForWeb().catch(() => undefined);
    }
    logPendingUpload('사전 resume 상태', photoUploadService.getViewState());
    router.replace({ pathname: '/analysis-loading', params: boardId ? { boardId } : undefined });
    logPendingUpload('router.replace 요청 완료', { pathname: '/analysis-loading', boardId });
  };

  const cancelRetry = async () => {
    const result = await photoUploadService.discard();
    if (result === 'RETRY') return;
    if (result === 'ANALYZING') {
      openLoadingScreen();
      return;
    }
    setScreenState({ status: 'READY' });
  };

  const confirmRetry = async () => {
    const result = await photoUploadService.discard();
    if (result === 'RETRY') return;
    if (result === 'ANALYZING') {
      openLoadingScreen();
      return;
    }
    if (boardId) router.replace({ pathname: '/photo-select', params: { boardId } });
  };

  const confirmPending = openLoadingScreen;

  return (
    <View style={{ flex: 1 }}>
      {screenState.status === 'CHECKING' || screenState.status === 'READY' ? (
        <AppWebView path="/board" onReady={clearPreviousScreens} waitForBoardReady />
      ) : (
        <AppBackground />
      )}
      <PendingUploadModal onConfirm={confirmPending} visible={screenState.status === 'PENDING'} />
      <UploadFailureModal
        confirmLabel={failureFeedback.confirmLabel}
        message={failureFeedback.message}
        onCancel={() => void cancelRetry()}
        onConfirm={() => void confirmRetry()}
        visible={screenState.status === 'FAILED'}
      />
    </View>
  );
}
