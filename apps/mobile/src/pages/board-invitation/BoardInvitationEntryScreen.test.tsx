import { render, waitFor } from '@testing-library/react-native';

import { BoardInvitationEntryScreen } from './BoardInvitationEntryScreen';

const mockGetAccessToken = jest.fn();
let mockCode: string | string[] | undefined = 'K7P2QX';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: () => ({ code: mockCode }),
}));
jest.mock('@/lib/auth-session', () => ({
  getAccessToken: () => mockGetAccessToken(),
}));
jest.mock('@/shared/ui/AppBackground', () => {
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');
  return { AppBackground: () => <Text>앱 배경</Text> };
});

const { router } = jest.requireMock('expo-router') as {
  router: { replace: jest.Mock };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCode = 'K7P2QX';
});

it('로그인된 사용자의 초대 코드를 보드 웹뷰 진입점으로 전달한다', async () => {
  mockGetAccessToken.mockResolvedValue('access-token');

  render(<BoardInvitationEntryScreen />);

  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/board',
      params: { invitationCode: 'K7P2QX' },
    }),
  );
});

it('로그인되지 않은 사용자는 기존 인증 진입점으로 이동한다', async () => {
  mockGetAccessToken.mockResolvedValue(null);

  render(<BoardInvitationEntryScreen />);

  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
});

it('잘못된 초대 코드는 앱 홈 진입점으로 이동한다', async () => {
  mockCode = 'invalid-code';

  render(<BoardInvitationEntryScreen />);

  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  expect(mockGetAccessToken).not.toHaveBeenCalled();
});
