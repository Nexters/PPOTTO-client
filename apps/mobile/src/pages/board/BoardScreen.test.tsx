import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { BoardScreen } from './BoardScreen';

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
  const user = userEvent.setup();
  photoUploadService.hasPending.mockResolvedValue(true);

  await render(<BoardScreen />);

  expect(await screen.findByText(/분석 중인 사진들이 있어요/)).toBeOnTheScreen();
  expect(photoUploadService.resume).toHaveBeenCalledTimes(1);
  expect(photoUploadService.getMotionPhotosForWeb).toHaveBeenCalledTimes(1);
  expect(router.replace).not.toHaveBeenCalled();

  const replaceAction = { type: 'REPLACE' };
  mockPreventRemoveCallback!({ data: { action: replaceAction } });
  expect(mockNavigationDispatch).not.toHaveBeenCalled();

  await user.press(screen.getByRole('button', { name: '확인' }));

  mockPreventRemoveCallback!({ data: { action: replaceAction } });

  expect(photoUploadService.resume).toHaveBeenCalledTimes(1);
  expect(mockNavigationDispatch).toHaveBeenCalledWith(replaceAction);
  expect(router.replace).toHaveBeenCalledWith({
    pathname: '/analysis-loading',
    params: { boardId: 'board-1' },
  });
});

it('실패한 작업에는 재개 확인 모달 대신 업로드 실패 모달만 표시한다', async () => {
  photoUploadService.getCurrent.mockReturnValue(new Promise(() => undefined));
  photoUploadService.getViewState.mockReturnValue({ progress: 30, status: 'FAILED' });

  await render(<BoardScreen />);

  expect(await screen.findByText(/업로드에 실패했어요/)).toBeOnTheScreen();
  expect(screen.queryByText(/분석 중인 사진들이 있어요/)).not.toBeOnTheScreen();
  expect(photoUploadService.hasPending).not.toHaveBeenCalled();
});

it('pending 확인 파라미터가 있으면 저장소를 다시 조회하지 않고 재개 준비부터 한다', async () => {
  mockSearchParams = { boardId: 'board-1', confirmResume: '1' };

  await render(<BoardScreen />);

  await waitFor(() => expect(screen.getByText(/분석 중인 사진들이 있어요/)).toBeOnTheScreen());
  expect(photoUploadService.hasPending).not.toHaveBeenCalled();
  expect(photoUploadService.resume).toHaveBeenCalledTimes(1);
  expect(photoUploadService.getMotionPhotosForWeb).toHaveBeenCalledTimes(1);
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
