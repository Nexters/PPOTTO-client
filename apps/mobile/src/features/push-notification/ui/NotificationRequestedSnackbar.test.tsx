import { act, render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotificationRequestedSnackbar } from './NotificationRequestedSnackbar';

const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderSnackbar(props: {
  visible: boolean;
  variant?: 'requested' | 'cancelFailed';
  onCancel: () => void;
  onDismiss: () => void;
}) {
  return render(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <NotificationRequestedSnackbar {...props} />
    </SafeAreaProvider>,
  );
}

afterEach(() => {
  jest.useRealTimers();
});

it('visible이 false면 아무것도 렌더링하지 않는다', async () => {
  await renderSnackbar({ visible: false, onCancel: jest.fn(), onDismiss: jest.fn() });

  expect(screen.queryByText('스티커 생성 완료 알림이 설정되었습니다.')).toBeNull();
});

it('visible이 true면 메시지와 취소 버튼을 보여준다', async () => {
  await renderSnackbar({ visible: true, onCancel: jest.fn(), onDismiss: jest.fn() });

  expect(screen.getByText('스티커 생성 완료 알림이 설정되었습니다.')).toBeTruthy();
  expect(screen.getByText('알림취소')).toBeTruthy();
});

it('알림취소를 누르면 onCancel을 호출한다', async () => {
  const user = userEvent.setup();
  const onCancel = jest.fn();
  await renderSnackbar({ visible: true, onCancel, onDismiss: jest.fn() });

  await user.press(screen.getByText('알림취소'));

  expect(onCancel).toHaveBeenCalledTimes(1);
});

it('취소에 실패하면 실패 문구만 보여준다', async () => {
  await renderSnackbar({
    visible: true,
    variant: 'cancelFailed',
    onCancel: jest.fn(),
    onDismiss: jest.fn(),
  });

  expect(screen.getByText('알림 신청을 취소하지 못했습니다.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: '알림취소' })).toBeNull();
});

it('3초가 지나면 onDismiss를 자동으로 호출한다', async () => {
  jest.useFakeTimers();
  const onDismiss = jest.fn();
  await renderSnackbar({ visible: true, onCancel: jest.fn(), onDismiss });

  act(() => jest.advanceTimersByTime(3000));

  expect(onDismiss).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});

it('3초 전에 사라지면 onDismiss를 호출하지 않는다', async () => {
  jest.useFakeTimers();
  const onDismiss = jest.fn();
  const { rerender } = await renderSnackbar({ visible: true, onCancel: jest.fn(), onDismiss });

  await rerender(
    <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
      <NotificationRequestedSnackbar onCancel={jest.fn()} onDismiss={onDismiss} visible={false} />
    </SafeAreaProvider>,
  );
  act(() => jest.advanceTimersByTime(3000));

  expect(onDismiss).not.toHaveBeenCalled();
  jest.useRealTimers();
});
