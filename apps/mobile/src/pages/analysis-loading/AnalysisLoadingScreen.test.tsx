import type { AnalysisLoadingBridgeState, AnalysisLoadingPhaseState } from '@ppotto/bridge';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnalysisLoadingScreen } from './AnalysisLoadingScreen';

type LoadingBridgeHandlers = {
  GET_ANALYSIS_LOADING_STATE: () => Promise<AnalysisLoadingBridgeState>;
  ANALYSIS_LOADING_PHASE_STARTED: (payload: {
    phase: AnalysisLoadingBridgeState['visiblePhase'];
  }) => Promise<void>;
  ANALYSIS_LOADING_PHASE_FINISHED: (payload: {
    phase: AnalysisLoadingBridgeState['visiblePhase'];
  }) => AnalysisLoadingPhaseState;
  ANALYSIS_LOADING_REVEAL_FINISHED: () => unknown;
};

let loadingBridgeHandlers: LoadingBridgeHandlers | undefined;

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: () => ({ boardId: 'board-1' }),
}));
jest.mock('@/shared/ui/Toast', () => ({ useToast: () => jest.fn() }));
jest.mock('@/shared/ui/AppWebView', () => {
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    AppWebView: ({ bridgeHandlers }: { bridgeHandlers: LoadingBridgeHandlers }) => {
      loadingBridgeHandlers = bridgeHandlers;
      return <Text>분석 로딩 웹뷰</Text>;
    },
  };
});
jest.mock('@/features/photo-upload', () => ({
  photoUploadService: {
    clearCurrent: jest.fn(),
    finish: jest.fn(),
    getCurrent: jest.fn(),
    getLastSeenLoadingPhase: jest.fn(),
    getMotionPhotoCount: jest.fn(),
    getMotionPhotosForWeb: jest.fn(),
    getViewState: jest.fn(),
    isRecoverableError: jest.fn(),
    isStatusUnavailableError: jest.fn(),
    setLastSeenLoadingPhase: jest.fn(),
    subscribe: jest.fn(() => () => undefined),
  },
}));

const { photoUploadService } = jest.requireMock('@/features/photo-upload') as {
  photoUploadService: {
    finish: jest.Mock;
    getCurrent: jest.Mock;
    getLastSeenLoadingPhase: jest.Mock;
    getMotionPhotoCount: jest.Mock;
    getMotionPhotosForWeb: jest.Mock;
    getViewState: jest.Mock;
    setLastSeenLoadingPhase: jest.Mock;
  };
};

const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

beforeEach(() => {
  jest.clearAllMocks();
  loadingBridgeHandlers = undefined;
  photoUploadService.getCurrent.mockReturnValue(new Promise(() => undefined));
  photoUploadService.getLastSeenLoadingPhase.mockResolvedValue(undefined);
  photoUploadService.getMotionPhotoCount.mockReturnValue(100);
  photoUploadService.getMotionPhotosForWeb.mockResolvedValue([
    { id: 'photo-1', uri: 'data:image/jpeg;base64,AA==', width: 1200, height: 800 },
  ]);
  photoUploadService.getViewState.mockReturnValue({ progress: 100, status: 'COMPLETED' });
  photoUploadService.setLastSeenLoadingPhase.mockResolvedValue(undefined);
});

it('서버가 완료돼도 모든 막을 순서대로 재생한 뒤에만 결과를 연다', async () => {
  const user = userEvent.setup();
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <AnalysisLoadingScreen />
    </SafeAreaProvider>,
  );
  const resultButton = screen.getByRole('button', { name: '결과 확인하기' });
  expect(resultButton).toBeDisabled();

  let state: AnalysisLoadingBridgeState | AnalysisLoadingPhaseState | undefined;
  await act(async () => {
    state = await loadingBridgeHandlers!.GET_ANALYSIS_LOADING_STATE();
  });
  expect(state).toEqual({
    photoCount: 100,
    photos: [{ id: 'photo-1', uri: 'data:image/jpeg;base64,AA==', width: 1200, height: 800 }],
    visiblePhase: 'SCAN',
    visualProgress: 25,
  });

  for (const [current, next] of [
    ['SCAN', 'GROUP'],
    ['GROUP', 'ASSEMBLE'],
    ['ASSEMBLE', 'DECK'],
    ['DECK', 'REVEAL'],
  ] as const) {
    await act(async () => {
      await loadingBridgeHandlers!.ANALYSIS_LOADING_PHASE_STARTED({ phase: current });
      state = loadingBridgeHandlers!.ANALYSIS_LOADING_PHASE_FINISHED({ phase: current });
    });
    expect(state?.visiblePhase).toBe(next);
  }

  expect(resultButton).toBeDisabled();
  await act(async () => {
    loadingBridgeHandlers!.ANALYSIS_LOADING_REVEAL_FINISHED();
  });
  expect(resultButton).toBeEnabled();

  await user.press(resultButton);
  expect(photoUploadService.finish).toHaveBeenCalledTimes(1);
});

it('재접속하면 저장된 마지막 막부터 다시 시작한다', async () => {
  photoUploadService.getLastSeenLoadingPhase.mockResolvedValue('GROUP');
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <AnalysisLoadingScreen />
    </SafeAreaProvider>,
  );

  let state: AnalysisLoadingBridgeState | AnalysisLoadingPhaseState | undefined;
  await act(async () => {
    state = await loadingBridgeHandlers!.GET_ANALYSIS_LOADING_STATE();
  });

  expect(state?.visiblePhase).toBe('GROUP');
  await act(async () => {
    state = loadingBridgeHandlers!.ANALYSIS_LOADING_PHASE_FINISHED({ phase: 'GROUP' });
  });
  expect(state?.visiblePhase).toBe('ASSEMBLE');
});
