import { CommonActions, useNavigation, usePreventRemove } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { photoUploadService } from '@/features/photo-upload';
import { AppWebView } from '@/shared/ui/AppWebView';
import { useToast } from '@/shared/ui/Toast';

import { LoadingOverlay } from './ui/LoadingOverlay';
import { PendingUploadModal } from './ui/PendingUploadModal';
import { UploadFailureModal } from './ui/UploadFailureModal';

type BoardScreenState =
  | { status: 'CHECKING' }
  | { status: 'READY' }
  | { status: 'PENDING' }
  | { status: 'UPLOADING'; uploadPromise: Promise<void> }
  | { status: 'FAILED' };

// 보드, 리캡 전용 웹뷰
export function BoardScreen() {
  const navigation = useNavigation();
  const toast = useToast();
  const { boardId } = useLocalSearchParams<{ boardId?: string }>();
  const [screenState, setScreenState] = useState<BoardScreenState>(() => {
    const uploadPromise = photoUploadService.getCurrent();
    return uploadPromise ? { status: 'UPLOADING', uploadPromise } : { status: 'CHECKING' };
  });

  usePreventRemove(
    screenState.status === 'UPLOADING' || screenState.status === 'PENDING',
    () => undefined,
  );

  useEffect(() => {
    if (screenState.status !== 'CHECKING') return;

    let active = true;
    void photoUploadService.hasPending().then(
      (hasPending) => {
        if (!active) return;
        setScreenState({ status: hasPending ? 'PENDING' : 'READY' });
      },
      () => {
        if (active) setScreenState({ status: 'READY' });
      },
    );

    return () => {
      active = false;
    };
  }, [screenState.status]);

  useEffect(() => {
    if (screenState.status !== 'UPLOADING') return;

    let active = true;
    void screenState.uploadPromise.then(
      () => {
        photoUploadService.clearCurrent();
        if (active) setScreenState({ status: 'READY' });
      },
      (error) => {
        if (!active) return;
        if (photoUploadService.isStatusUnavailableError(error)) {
          photoUploadService.clearCurrent();
          setScreenState({ status: 'READY' });
          toast('분석 상태를 확인하지 못했어요. 잠시 후 다시 확인해주세요.');
          return;
        }
        if (photoUploadService.isRecoverableError(error)) {
          photoUploadService.clearCurrent();
          setScreenState({ status: 'PENDING' });
          return;
        }
        setScreenState({ status: 'FAILED' });
      },
    );

    return () => {
      active = false;
    };
  }, [screenState, toast]);

  const clearPreviousScreens = () => {
    navigation.dispatch((state) =>
      CommonActions.reset({ ...state, index: 0, routes: state.routes.slice(-1) }),
    );
  };

  const cancelRetry = async () => {
    if ((await photoUploadService.discard()) === 'RETRY') return;
    setScreenState({ status: 'READY' });
  };

  const confirmRetry = async () => {
    const result = await photoUploadService.discard();
    if (result === 'RETRY') return;
    if (result === 'ANALYZING') {
      setScreenState({ status: 'READY' });
      return;
    }
    if (boardId) router.replace({ pathname: '/photo-select', params: { boardId } });
  };

  const confirmPending = () => {
    setScreenState({ status: 'UPLOADING', uploadPromise: photoUploadService.resume() });
  };

  const isBoardVisible =
    screenState.status === 'CHECKING' ||
    screenState.status === 'READY' ||
    screenState.status === 'PENDING';

  return (
    <View style={{ flex: 1 }}>
      {isBoardVisible ? (
        <AppWebView path="/board" onReady={clearPreviousScreens} />
      ) : (
        <LoadingOverlay />
      )}
      {screenState.status === 'CHECKING' && <View style={StyleSheet.absoluteFill} />}
      <PendingUploadModal onConfirm={confirmPending} visible={screenState.status === 'PENDING'} />
      <UploadFailureModal
        onCancel={() => void cancelRetry()}
        onConfirm={() => void confirmRetry()}
        visible={screenState.status === 'FAILED'}
      />
    </View>
  );
}
