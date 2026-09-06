import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { BoardScreen } from './BoardScreen';
jest.mock('@/shared/lib/analytics', () => ({ track: jest.fn() }));

let mockSearchParams: { boardId?: string; confirmResume?: string } = { boardId: 'board-1' };
let mockPreventRemoveCallback:
  ((event: { data: { action: { type: string } } }) => void) | undefined;
const mockNavigationDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  CommonActions: { reset: jest.fn((state) => state) },
  useNavigation: () => ({ dispatch: mockNavigationDispatch }),
  usePreventRemove: jest.fn(
    (_enabled: boolean, callback: typeof mockPreventRemoveCallback) =>
      (mockPreventRemoveCallback = callback),
  ),
}));
jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: () => mockSearchParams,
}));
jest.mock('@/shared/ui/AppWebView', () => {
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');
  return { AppWebView: () => <Text>보드 웹뷰</Text> };
});
jest.mock('@/shared/ui/AppBackground', () => {
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');
  return { AppBackground: () => <Text>도트 배경</Text> };
});
jest.mock('@/features/photo-upload', () => ({
  photoUploadService: {
    discard: jest.fn(),
    getCurrent: jest.fn(),
    getMotionPhotosForWeb: jest.fn(),
    getViewState: jest.fn(),
    hasPending: jest.fn(),
    resume: jest.fn(),
  },
}));

const { router } = jest.requireMock('expo-router') as {
  router: { replace: jest.Mock };
};
const { photoUploadService } = jest.requireMock('@/features/photo-upload') as {
  photoUploadService: {
    discard: jest.Mock;
    getCurrent: jest.Mock;
    getMotionPhotosForWeb: jest.Mock;
    getViewState: jest.Mock;
    hasPending: jest.Mock;
    resume: jest.Mock;
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPreventRemoveCallback = undefined;
  mockSearchParams = { boardId: 'board-1' };
  photoUploadService.getCurrent.mockReturnValue(null);
  photoUploadService.getMotionPhotosForWeb.mockResolvedValue([]);
  photoUploadService.getViewState.mockReturnValue({ progress: 0, status: 'UPLOADING' });
  photoUploadService.hasPending.mockResolvedValue(false);
});

it('저장된 작업은 미리 준비하고 확인하기 전까지 로딩 화면으로 이동하지 않는다', async () => {
  photoUploadService.hasPending.mockResolvedValue(true);

  await render(<BoardScreen />);

  expect(await screen.findByText(/분석 중인 사진들이 있어요/)).toBeOnTheScreen();
  expect(photoUploadService.resume).toHaveBeenCalledTimes(1);
  expect(photoUploadService.getMotionPhotosForWeb).toHaveBeenCalledTimes(1);
  expect(router.replace).not.toHaveBeenCalled();
  expect(screen.getByText('도트 배경')).toBeOnTheScreen();
  expect(screen.queryByText('보드 웹뷰')).not.toBeOnTheScreen();

  const replaceAction = { type: 'REPLACE' };
  mockPreventRemoveCallback!({ data: { action: replaceAction } });
  expect(mockNavigationDispatch).not.toHaveBeenCalled();

  fireEvent.press(screen.getByRole('button', { name: '확인' }));

  mockPreventRemoveCallback!({ data: { action: replaceAction } });

  expect(photoUploadService.resume).toHaveBeenCalledTimes(1);
  expect(mockNavigationDispatch).toHaveBeenCalledWith(replaceAction);
  expect(router.replace).toHaveBeenCalledWith({
    pathname: '/analysis-loading',
    params: { boardId: 'board-1' },
  });
}, 10000);

it('실패한 작업에는 재개 확인 모달 대신 업로드 실패 모달만 표시한다', async () => {
  photoUploadService.getCurrent.mockReturnValue(new Promise(() => undefined));
  photoUploadService.getViewState.mockReturnValue({ progress: 30, status: 'FAILED' });

  await render(<BoardScreen />);

  expect(await screen.findByText(/업로드에 실패했어요/)).toBeOnTheScreen();
  expect(screen.queryByText(/분석 중인 사진들이 있어요/)).not.toBeOnTheScreen();
  expect(photoUploadService.hasPending).not.toHaveBeenCalled();
});

it.each([
  ['analysis-failed', '스티커 생성에 실패했어요'],
  ['client-error', '요청을 처리하지 못했어요'],
  ['server-error', '서버 상태를 확인하지 못했어요'],
] as const)('%s는 종류별 공통 피드백을 표시한다', async (kind, message) => {
  photoUploadService.getCurrent.mockReturnValue(new Promise(() => undefined));
  photoUploadService.getViewState.mockReturnValue({
    failure: { kind },
    progress: 30,
    status: 'FAILED',
  });

  await render(<BoardScreen />);

  expect(await screen.findByText(new RegExp(message))).toBeOnTheScreen();
});

it('등록된 에러 코드는 종류별 공통 피드백보다 우선한다', async () => {
  photoUploadService.getCurrent.mockReturnValue(new Promise(() => undefined));
  photoUploadService.getViewState.mockReturnValue({
    failure: { code: 'ANALYSIS-005', kind: 'client-error', status: 404 },
    progress: 30,
    status: 'FAILED',
  });

  await render(<BoardScreen />);

  expect(await screen.findByText(/진행 중인 분석을 찾을 수 없어요/)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: '사진 다시 선택' })).toBeOnTheScreen();
});

it('재개 파라미터가 남아 있어도 실제 작업이 없으면 모달 없이 보드를 표시한다', async () => {
  mockSearchParams = { boardId: 'board-1', confirmResume: '1' };

  await render(<BoardScreen />);

  expect(await screen.findByText('보드 웹뷰')).toBeOnTheScreen();
  expect(screen.queryByText(/분석 중인 사진들이 있어요/)).not.toBeOnTheScreen();
  expect(photoUploadService.hasPending).toHaveBeenCalledTimes(1);
  expect(photoUploadService.resume).not.toHaveBeenCalled();
});

it('실패 후 서버 분석이 이미 시작됐다면 로컬 작업을 보존하고 로딩 화면으로 돌아간다', async () => {
  const user = userEvent.setup();
  photoUploadService.getCurrent.mockReturnValue(new Promise(() => undefined));
  photoUploadService.getViewState.mockReturnValue({ progress: 30, status: 'FAILED' });
  photoUploadService.discard.mockResolvedValue('ANALYZING');

  await render(<BoardScreen />);
  await user.press(screen.getByRole('button', { name: '취소' }));

  expect(photoUploadService.resume).toHaveBeenCalledTimes(1);
  expect(router.replace).toHaveBeenCalledWith({
    pathname: '/analysis-loading',
    params: { boardId: 'board-1' },
  });
});
