import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { openNotificationSettings } from '../lib/notification-permission';
import { registerPushNotification } from '../model/push-notification-registration';

import { EnablePushNotificationButton } from './EnablePushNotificationButton';

jest.mock('../lib/notification-permission', () => ({ openNotificationSettings: jest.fn() }));
jest.mock('../model/push-notification-registration', () => ({
  registerPushNotification: jest.fn(),
}));

const openSettings = jest.mocked(openNotificationSettings);
const register = jest.mocked(registerPushNotification);

beforeEach(() => {
  jest.clearAllMocks();
});

it('알림 등록에 성공하면 완료 상태를 표시한다', async () => {
  const user = userEvent.setup();
  register.mockResolvedValue({ status: 'registered' });
  await render(<EnablePushNotificationButton />);

  await user.press(screen.getByRole('button', { name: '결과 알림 받기' }));

  expect(await screen.findByRole('button', { name: '알림 신청 완료' })).toBeDisabled();
  expect(register).toHaveBeenCalledTimes(1);
});

it('등록에 실패하면 다시 시도할 수 있다', async () => {
  const user = userEvent.setup();
  register.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({
    status: 'registered',
  });
  await render(<EnablePushNotificationButton />);

  await user.press(screen.getByRole('button', { name: '결과 알림 받기' }));
  await user.press(await screen.findByRole('button', { name: '결과 알림 받기' }));

  expect(await screen.findByRole('button', { name: '알림 신청 완료' })).toBeDisabled();
  expect(register).toHaveBeenCalledTimes(2);
});

it('권한이 차단되면 시스템 설정으로 이동한다', async () => {
  const user = userEvent.setup();
  register.mockResolvedValue({ status: 'blocked' });
  openSettings.mockResolvedValue(undefined);
  await render(<EnablePushNotificationButton />);

  await user.press(screen.getByRole('button', { name: '결과 알림 받기' }));
  await user.press(await screen.findByRole('button', { name: '설정에서 알림 켜기' }));

  await waitFor(() => expect(openSettings).toHaveBeenCalledTimes(1));
});

it('권한을 거부하면 원래 버튼으로 돌아가 다시 요청할 수 있다', async () => {
  const user = userEvent.setup();
  register
    .mockResolvedValueOnce({ status: 'denied' })
    .mockResolvedValueOnce({ status: 'registered' });
  await render(<EnablePushNotificationButton />);

  await user.press(screen.getByRole('button', { name: '결과 알림 받기' }));
  await user.press(await screen.findByRole('button', { name: '결과 알림 받기' }));

  expect(await screen.findByRole('button', { name: '알림 신청 완료' })).toBeDisabled();
  expect(register).toHaveBeenCalledTimes(2);
});
