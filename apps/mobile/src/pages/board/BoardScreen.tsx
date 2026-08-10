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

type UploadStatus = 'READY' | 'UPLOADING' | 'FAILED';

// 보드, 리캡 전용 웹뷰
export function BoardScreen() {
  const navigation = useNavigation();
  const toast = useToast();
  const { boardId } = useLocalSearchParams<{ boardId?: string }>();
  const [upload, setUpload] = useState(() => photoUploadService.getCurrent());
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(upload ? 'UPLOADING' : 'READY');
  const [checkingPending, setCheckingPending] = useState(!upload);
  const [pendingVisible, setPendingVisible] = useState(false);

  usePreventRemove(uploadStatus === 'UPLOADING' || pendingVisible, () => undefined);

  useEffect(() => {
    if (upload) return;

    let active = true;
    void photoUploadService.hasPending().then(
      (hasPending) => {
        if (!active) return;
        setPendingVisible(hasPending);
        setCheckingPending(false);
      },
      () => {
        if (active) setCheckingPending(false);
      },
    );

    return () => {
      active = false;
    };
  }, [upload]);

  useEffect(() => {
    if (!upload) return;

    let active = true;
    void upload.then(
      () => {
        photoUploadService.clearCurrent();
        if (active) setUploadStatus('READY');
      },
      (error) => {
        if (!active) return;
        if (photoUploadService.isStatusUnavailableError(error)) {
          photoUploadService.clearCurrent();
          setUploadStatus('READY');
          toast('분석 상태를 확인하지 못했어요. 잠시 후 다시 확인해주세요.');
          return;
        }
        if (photoUploadService.isRecoverableError(error)) {
          photoUploadService.clearCurrent();
          setUpload(null);
          setUploadStatus('READY');
          setPendingVisible(true);
          return;
        }
        setUploadStatus('FAILED');
      },
    );

    return () => {
      active = false;
    };
  }, [toast, upload]);

  const clearPreviousScreens = () => {
    navigation.dispatch((state) =>
      CommonActions.reset({ ...state, index: 0, routes: state.routes.slice(-1) }),
    );
  };

  const cancelRetry = async () => {
    if (!(await photoUploadService.discard())) return;
    setUploadStatus('READY');
  };

  const confirmRetry = async () => {
    if (!(await photoUploadService.discard())) return;
    if (boardId) router.replace({ pathname: '/photo-select', params: { boardId } });
  };

  const confirmPending = () => {
    const resumed = photoUploadService.resume();
    setPendingVisible(false);
    setUploadStatus('UPLOADING');
    setUpload(resumed);
  };

  return (
    <View style={{ flex: 1 }}>
      {uploadStatus === 'READY' ? (
        <AppWebView path="/board" onReady={clearPreviousScreens} />
      ) : (
        <LoadingOverlay />
      )}
      {checkingPending && <View style={StyleSheet.absoluteFill} />}
      <PendingUploadModal onConfirm={confirmPending} visible={pendingVisible} />
      <UploadFailureModal
        onCancel={() => void cancelRetry()}
        onConfirm={() => void confirmRetry()}
        visible={uploadStatus === 'FAILED'}
      />
    </View>
  );
}
