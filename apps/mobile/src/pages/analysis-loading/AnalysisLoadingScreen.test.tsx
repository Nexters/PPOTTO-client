import type { AnalysisLoadingBridgeState, AnalysisLoadingPhaseState } from '@ppotto/bridge';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnalysisLoadingScreen } from './AnalysisLoadingScreen';
jest.mock('@/shared/lib/analytics', () => ({ track: jest.fn() }));
jest.mock('@/features/push-notification', () => {
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');
  return { EnablePushNotificationButton: () => <Text>결과 알림 받기</Text> };
});

let appStateChangeHandler: ((state: string) => void) | undefined;
jest.mock('react-native/Libraries/AppState/AppState', () => ({
  __esModule: true,
  default: {
    currentState: 'background',
    addEventListener: jest.fn((_event: string, handler: (state: string) => void) => {
      appStateChangeHandler = handler;
      return { remove: jest.fn() };
    }),
  },
}));

type LoadingBridgeHandlers = {
  GET_ANALYSIS_LOADING_STATE: () => Promise<AnalysisLoadingBridgeState>;
  ANALYSIS_LOADING_READY: (payload: { jobId: AnalysisLoadingBridgeState['jobId'] }) => unknown;
  ANALYSIS_LOADING_PHASE_STARTED: (payload: {
    jobId: AnalysisLoadingBridgeState['jobId'];
    phase: AnalysisLoadingBridgeState['visiblePhase'];
  }) => Promise<void>;
  ANALYSIS_LOADING_PHASE_FINISHED: (payload: {
    jobId: AnalysisLoadingBridgeState['jobId'];
    phase: AnalysisLoadingBridgeState['visiblePhase'];
  }) => AnalysisLoadingPhaseState;
  ANALYSIS_LOADING_REVEAL_FINISHED: (payload: {
    jobId: AnalysisLoadingBridgeState['jobId'];
  }) => unknown;
};

let loadingBridgeHandlers: LoadingBridgeHandlers | undefined;
let showingBoard = false;
let analysisLoadingResync: AnalysisLoadingPhaseState | undefined;

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: () => ({ boardId: 'board-1' }),
}));
jest.mock('@/shared/ui/Toast', () => ({ useToast: () => jest.fn() }));
jest.mock('@/shared/ui/AppWebView', () => {
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    AppWebView: ({
      bridgeHandlers,
      showBoard,
      analysisLoadingResync: nextResync,
    }: {
      bridgeHandlers: LoadingBridgeHandlers;
      showBoard?: boolean;
      analysisLoadingResync?: AnalysisLoadingPhaseState;
    }) => {
      loadingBridgeHandlers = bridgeHandlers;
      showingBoard = showBoard ?? false;
      analysisLoadingResync = nextResync;
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
    getCurrentJobId: jest.fn(),
    getMotionPhotoCount: jest.fn(),
    getMotionPhotosForWeb: jest.fn(),
    getViewState: jest.fn(),
    isCurrentJob: jest.fn(),
    isRecoverableError: jest.fn(),
    refreshNow: jest.fn(),
    setLastSeenLoadingPhase: jest.fn(),
    subscribe: jest.fn(() => () => undefined),
  },
}));

const { photoUploadService } = jest.requireMock('@/features/photo-upload') as {
  photoUploadService: {
    finish: jest.Mock;
    getCurrent: jest.Mock;
    getCurrentJobId: jest.Mock;
    getLastSeenLoadingPhase: jest.Mock;
    getMotionPhotoCount: jest.Mock;
    getMotionPhotosForWeb: jest.Mock;
    getViewState: jest.Mock;
    isCurrentJob: jest.Mock;
    refreshNow: jest.Mock;
    setLastSeenLoadingPhase: jest.Mock;
  };
};
const { router } = jest.requireMock('expo-router') as { router: { replace: jest.Mock } };

const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

beforeEach(() => {
  jest.clearAllMocks();
  loadingBridgeHandlers = undefined;
  showingBoard = false;
  analysisLoadingResync = undefined;
  appStateChangeHandler = undefined;
  photoUploadService.getCurrent.mockReturnValue(new Promise(() => undefined));
  photoUploadService.getCurrentJobId.mockReturnValue('job-1');
  photoUploadService.getLastSeenLoadingPhase.mockResolvedValue(undefined);
  photoUploadService.getMotionPhotoCount.mockReturnValue(100);
  photoUploadService.getMotionPhotosForWeb.mockResolvedValue([
    { id: 'photo-1', uri: 'data:image/jpeg;base64,AA==', width: 1200, height: 800 },
  ]);
  photoUploadService.getViewState.mockReturnValue({ progress: 100, status: 'COMPLETED' });
  photoUploadService.isCurrentJob.mockImplementation((jobId) => jobId === 'job-1');
  photoUploadService.refreshNow.mockResolvedValue(undefined);
  photoUploadService.setLastSeenLoadingPhase.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

it('서버가 완료돼도 모든 막을 순서대로 재생한 뒤에만 결과를 연다', async () => {
  const user = userEvent.setup();
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <AnalysisLoadingScreen />
    </SafeAreaProvider>,
  );
  expect(screen.getByText('결과 알림 받기')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: '결과 확인하기' })).not.toBeOnTheScreen();

  let state: AnalysisLoadingBridgeState | AnalysisLoadingPhaseState | undefined;
  await act(async () => {
    state = await loadingBridgeHandlers!.GET_ANALYSIS_LOADING_STATE();
  });
  await act(async () => void loadingBridgeHandlers!.ANALYSIS_LOADING_READY({ jobId: 'job-1' }));
  expect(state).toEqual({
    downloadingFromICloud: false,
    jobId: 'job-1',
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
      await loadingBridgeHandlers!.ANALYSIS_LOADING_PHASE_STARTED({
        jobId: 'job-1',
        phase: current,
      });
      state = loadingBridgeHandlers!.ANALYSIS_LOADING_PHASE_FINISHED({
        jobId: 'job-1',
        phase: current,
      });
    });
    expect(state?.visiblePhase).toBe(next);
  }

  expect(screen.getByText('결과 알림 받기')).toBeOnTheScreen();
  await act(async () => {
    loadingBridgeHandlers!.ANALYSIS_LOADING_REVEAL_FINISHED({ jobId: 'job-1' });
  });
  const resultButton = screen.getByRole('button', { name: '결과 확인하기' });
  expect(resultButton).toBeEnabled();

  await user.press(resultButton);
  expect(photoUploadService.finish).toHaveBeenCalledTimes(1);
  expect(showingBoard).toBe(true);
  expect(router.replace).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: '결과 확인하기' })).not.toBeOnTheScreen();
});

it('재접속하면 저장된 마지막 막부터 다시 시작한다', async () => {
  photoUploadService.getLastSeenLoadingPhase.mockResolvedValue('GROUP');
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <AnalysisLoadingScreen />
    </SafeAreaProvider>,
  );
  await waitFor(() => expect(loadingBridgeHandlers).toBeDefined());

  let state: AnalysisLoadingBridgeState | AnalysisLoadingPhaseState | undefined;
  await act(async () => {
    state = await loadingBridgeHandlers!.GET_ANALYSIS_LOADING_STATE();
  });

  expect(state?.visiblePhase).toBe('GROUP');
  await act(async () => {
    state = loadingBridgeHandlers!.ANALYSIS_LOADING_PHASE_FINISHED({
      jobId: 'job-1',
      phase: 'GROUP',
    });
  });
  expect(state?.visiblePhase).toBe('ASSEMBLE');
});

it('오래된 job의 로딩 브릿지 메시지는 무시한다', async () => {
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <AnalysisLoadingScreen />
    </SafeAreaProvider>,
  );
  await waitFor(() => expect(loadingBridgeHandlers).toBeDefined());

  let state: AnalysisLoadingBridgeState | AnalysisLoadingPhaseState | undefined;
  await act(async () => {
    state = await loadingBridgeHandlers!.GET_ANALYSIS_LOADING_STATE();
  });
  expect(state?.visiblePhase).toBe('SCAN');

  await act(async () => {
    await loadingBridgeHandlers!.ANALYSIS_LOADING_PHASE_STARTED({
      jobId: 'old-job',
      phase: 'SCAN',
    });
    state = loadingBridgeHandlers!.ANALYSIS_LOADING_PHASE_FINISHED({
      jobId: 'old-job',
      phase: 'SCAN',
    });
    loadingBridgeHandlers!.ANALYSIS_LOADING_REVEAL_FINISHED({ jobId: 'old-job' });
  });

  expect(photoUploadService.setLastSeenLoadingPhase).not.toHaveBeenCalled();
  expect(state).toEqual({ visiblePhase: 'SCAN', visualProgress: 25 });
  expect(screen.getByText('결과 알림 받기')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: '결과 확인하기' })).not.toBeOnTheScreen();
});

it('백그라운드에서 복귀하면 서버 상태를 다시 조회해 완료됐으면 연출 없이 결과 확인 버튼을 보여준다', async () => {
  photoUploadService.getViewState.mockReturnValue({
    analysisId: 'analysis-1',
    notificationRequested: false,
    progress: 40,
    status: 'ANALYZING',
  });
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <AnalysisLoadingScreen />
    </SafeAreaProvider>,
  );
  await waitFor(() => expect(screen.getByText('결과 알림 받기')).toBeOnTheScreen());
  expect(appStateChangeHandler).toBeDefined();

  photoUploadService.getViewState.mockReturnValue({
    analysisId: 'analysis-1',
    notificationRequested: false,
    progress: 100,
    status: 'COMPLETED',
  });

  await act(async () => {
    appStateChangeHandler!('active');
  });

  expect(photoUploadService.refreshNow).toHaveBeenCalledTimes(1);
  expect(await screen.findByRole('button', { name: '결과 확인하기' })).toBeEnabled();
  expect(analysisLoadingResync).toEqual({ visiblePhase: 'REVEAL', visualProgress: 100 });
});

it('복귀 시 서버 조회가 실패하면 기존 로딩 상태를 유지한다', async () => {
  photoUploadService.getViewState.mockReturnValue({
    analysisId: 'analysis-1',
    notificationRequested: false,
    progress: 40,
    status: 'ANALYZING',
  });
  photoUploadService.refreshNow.mockRejectedValue(new Error('network'));
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <AnalysisLoadingScreen />
    </SafeAreaProvider>,
  );
  await waitFor(() => expect(appStateChangeHandler).toBeDefined());

  await act(async () => appStateChangeHandler!('active'));

  expect(photoUploadService.refreshNow).toHaveBeenCalledTimes(1);
  expect(analysisLoadingResync).toBeUndefined();
});

it('실제로 백그라운드에서 돌아온 게 아니면 상태를 다시 조회하지 않는다', async () => {
  photoUploadService.getViewState.mockReturnValue({
    analysisId: 'analysis-1',
    notificationRequested: false,
    progress: 40,
    status: 'ANALYZING',
  });
  await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <AnalysisLoadingScreen />
    </SafeAreaProvider>,
  );
  await waitFor(() => expect(appStateChangeHandler).toBeDefined());

  await act(async () => {
    appStateChangeHandler!('inactive');
  });

  expect(photoUploadService.refreshNow).not.toHaveBeenCalled();
});

it('서버 progress가 오기 전에는 10까지 올리고 멈춘다', async () => {
  jest.useFakeTimers();
  photoUploadService.getViewState.mockReturnValue({ progress: 0, status: 'UPLOADING' });

  const view = await render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <AnalysisLoadingScreen />
    </SafeAreaProvider>,
  );

  await act(async () => void loadingBridgeHandlers!.ANALYSIS_LOADING_READY({ jobId: 'job-1' }));
  act(() => jest.advanceTimersByTime(20_000));

  let state: AnalysisLoadingPhaseState | undefined;
  act(() => {
    state = loadingBridgeHandlers!.ANALYSIS_LOADING_PHASE_FINISHED({
      jobId: 'job-1',
      phase: 'SCAN',
    });
  });

  expect(state?.visualProgress).toBe(10);
  act(() => {
    view.unmount();
  });
  jest.useRealTimers();
});
