import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Animated, Text } from 'react-native';

import { AppReadyProvider, useMarkAppReady } from '@/shared/lib/app-ready';

import { AppLaunchScreen } from './AppLaunchScreen';

// 애니메이션은 즉시 끝난 것으로 치고, 대기 시간만 타이머로 검증한다
function stubAnimations() {
  jest.spyOn(Animated, 'timing').mockImplementation(
    () =>
      ({
        start: (callback?: (result: { finished: boolean }) => void) =>
          callback?.({ finished: true }),
        stop: jest.fn(),
        reset: jest.fn(),
      }) as unknown as Animated.CompositeAnimation,
  );
}

function MarkReadyButton() {
  const markAppReady = useMarkAppReady();
  return (
    <Text accessibilityRole="button" onPress={markAppReady}>
      준비 완료
    </Text>
  );
}

function renderLaunchScreen() {
  return render(
    <AppReadyProvider>
      <MarkReadyButton />
      <AppLaunchScreen />
    </AppReadyProvider>,
  );
}

// 시작 화면이 accessibilityViewIsModal이라 형제 노드는 접근성 트리에서 숨겨진다
const markReady = () =>
  fireEvent.press(screen.getByText('준비 완료', { includeHiddenElements: true }));

beforeEach(() => {
  jest.useFakeTimers();
  stubAnimations();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it('준비 신호가 오기 전에는 최소 유지 시간이 지나도 화면을 유지한다', async () => {
  await renderLaunchScreen();

  expect(screen.getByLabelText('앱 시작 화면')).toBeOnTheScreen();
  expect(screen.getByLabelText('PPOTTO')).toHaveProp('width', 260.571);

  await act(async () => void jest.advanceTimersByTime(1000));

  expect(screen.getByLabelText('앱 시작 화면')).toBeOnTheScreen();
});

it('준비 신호가 와도 최소 유지 시간 전에는 화면을 유지하고, 지나면 제거한다', async () => {
  await renderLaunchScreen();

  markReady();
  expect(screen.getByLabelText('앱 시작 화면')).toBeOnTheScreen();

  await act(async () => void jest.advanceTimersByTime(1000));
  expect(screen.queryByLabelText('앱 시작 화면')).not.toBeOnTheScreen();
});

it('준비 신호가 끝내 안 와도 상한 시간이 지나면 화면을 제거한다', async () => {
  await renderLaunchScreen();

  await act(async () => void jest.advanceTimersByTime(3300));

  expect(screen.queryByLabelText('앱 시작 화면')).not.toBeOnTheScreen();
});
