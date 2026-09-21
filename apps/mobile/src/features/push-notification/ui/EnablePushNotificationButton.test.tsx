import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { openNotificationSettings } from '../lib/notification-permission';
import { requestAnalysisNotification } from '../model/push-notification-registration';

import { EnablePushNotificationButton } from './EnablePushNotificationButton';

jest.mock('../lib/notification-permission', () => ({ openNotificationSettings: jest.fn() }));
jest.mock('../model/push-notification-registration', () => ({
  requestAnalysisNotification: jest.fn(),
}));

const openSettings = jest.mocked(openNotificationSettings);
const requestNotification = jest.mocked(requestAnalysisNotification);

beforeEach(() => {
  jest.clearAllMocks();
});

it('알림 신청에 성공하면 완료 상태를 표시한다', async () => {
  const user = userEvent.setup();
  requestNotification.mockResolvedValue({ status: 'registered' });
  await render(
    <EnablePushNotificationButton analysisId="analysis-1" notificationRequested={false} />,
  );

  await user.press(screen.getByRole('button', { name: '결과 알림 받기' }));

  expect(await screen.findByRole('button', { name: '알림 신청 완료' })).toBeDisabled();
  expect(requestNotification).toHaveBeenCalledWith('analysis-1');
});

it('신청에 실패하면 다시 시도할 수 있다', async () => {
  const user = userEvent.setup();
  requestNotification.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({
    status: 'registered',
  });
  await render(
    <EnablePushNotificationButton analysisId="analysis-1" notificationRequested={false} />,
  );

  await user.press(screen.getByRole('button', { name: '결과 알림 받기' }));
  await user.press(await screen.findByRole('button', { name: '결과 알림 받기' }));

  expect(await screen.findByRole('button', { name: '알림 신청 완료' })).toBeDisabled();
  expect(requestNotification).toHaveBeenCalledTimes(2);
});

it('권한이 차단되면 시스템 설정으로 이동한다', async () => {
  const user = userEvent.setup();
  requestNotification.mockResolvedValue({ status: 'blocked' });
  openSettings.mockResolvedValue(undefined);
  await render(
    <EnablePushNotificationButton analysisId="analysis-1" notificationRequested={false} />,
  );

  await user.press(screen.getByRole('button', { name: '결과 알림 받기' }));
  await user.press(await screen.findByRole('button', { name: '설정에서 알림 켜기' }));

  await waitFor(() => expect(openSettings).toHaveBeenCalledTimes(1));
});

it('권한을 거부하면 원래 버튼으로 돌아가 다시 요청할 수 있다', async () => {
  const user = userEvent.setup();
  requestNotification
    .mockResolvedValueOnce({ status: 'denied' })
    .mockResolvedValueOnce({ status: 'registered' });
  await render(
    <EnablePushNotificationButton analysisId="analysis-1" notificationRequested={false} />,
  );

  await user.press(screen.getByRole('button', { name: '결과 알림 받기' }));
  await user.press(await screen.findByRole('button', { name: '결과 알림 받기' }));

  expect(await screen.findByRole('button', { name: '알림 신청 완료' })).toBeDisabled();
  expect(requestNotification).toHaveBeenCalledTimes(2);
});

it('이미 신청된 분석이면 처음부터 완료 상태로 보여준다', async () => {
  await render(<EnablePushNotificationButton analysisId="analysis-1" notificationRequested />);

  expect(await screen.findByRole('button', { name: '알림 신청 완료' })).toBeDisabled();
  expect(requestNotification).not.toHaveBeenCalled();
});

it('다른 분석으로 전환되면 이전 분석의 완료 상태를 물려받지 않는다', async () => {
  const user = userEvent.setup();
  requestNotification.mockResolvedValue({ status: 'registered' });
  const { rerender } = await render(
    <EnablePushNotificationButton analysisId="analysis-1" notificationRequested={false} />,
  );

  await user.press(screen.getByRole('button', { name: '결과 알림 받기' }));
  expect(await screen.findByRole('button', { name: '알림 신청 완료' })).toBeDisabled();

  await rerender(<EnablePushNotificationButton analysisId={null} notificationRequested={false} />);
  await rerender(
    <EnablePushNotificationButton analysisId="analysis-2" notificationRequested={false} />,
  );

  expect(await screen.findByRole('button', { name: '결과 알림 받기' })).not.toBeDisabled();
});

it('이전 분석의 늦은 신청 응답이 새 분석의 상태를 덮어쓰지 않는다', async () => {
  const user = userEvent.setup();
  let completeRegistration: (result: { status: 'registered' }) => void = () => undefined;
  requestNotification.mockImplementation(
    () =>
      new Promise((resolve) => {
        completeRegistration = resolve;
      }),
  );
  const { rerender } = await render(
    <EnablePushNotificationButton analysisId="analysis-1" notificationRequested={false} />,
  );

  await user.press(screen.getByRole('button', { name: '결과 알림 받기' }));
  expect(await screen.findByRole('button', { name: '알림 설정 중...' })).toBeDisabled();

  await rerender(<EnablePushNotificationButton analysisId={null} notificationRequested={false} />);
  await rerender(
    <EnablePushNotificationButton analysisId="analysis-2" notificationRequested={false} />,
  );

  await act(async () => completeRegistration({ status: 'registered' }));
  expect(screen.getByRole('button', { name: '결과 알림 받기' })).not.toBeDisabled();
});

it('analysisId가 아직 없으면 대기하다가 생기는 즉시 신청을 이어간다', async () => {
  const user = userEvent.setup();
  let completeRegistration: (result: { status: 'registered' }) => void = () => undefined;
  requestNotification.mockImplementation(
    () =>
      new Promise((resolve) => {
        completeRegistration = resolve;
      }),
  );
  const { rerender } = await render(
    <EnablePushNotificationButton analysisId={null} notificationRequested={false} />,
  );

  await user.press(screen.getByRole('button', { name: '결과 알림 받기' }));
  expect(requestNotification).not.toHaveBeenCalled();

  await rerender(
    <EnablePushNotificationButton analysisId="analysis-1" notificationRequested={false} />,
  );

  expect(await screen.findByRole('button', { name: '알림 설정 중...' })).toBeDisabled();
  completeRegistration({ status: 'registered' });
  expect(await screen.findByRole('button', { name: '알림 신청 완료' })).toBeDisabled();
  expect(requestNotification).toHaveBeenCalledWith('analysis-1');
});
