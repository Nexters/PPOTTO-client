import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Button } from '@/shared/ui/Button';

import { openNotificationSettings } from '../lib/notification-permission';
import { requestAnalysisNotification } from '../model/push-notification-registration';

type RegistrationState = 'idle' | 'waiting' | 'registering' | 'registered' | 'blocked';

async function resolveRegistrationState(analysisId: string): Promise<RegistrationState> {
  try {
    const result = await requestAnalysisNotification(analysisId);
    if (result.status === 'registered') return 'registered';
    if (result.status === 'blocked') return 'blocked';
    return 'idle';
  } catch {
    return 'idle';
  }
}

const LABELS: Record<RegistrationState, string> = {
  idle: '결과 알림 받기',
  waiting: '알림 설정 중...',
  registering: '알림 설정 중...',
  registered: '알림 신청 완료',
  blocked: '설정에서 알림 켜기',
};

const DISABLED_STATES: ReadonlySet<RegistrationState> = new Set([
  'waiting',
  'registering',
  'registered',
]);

type EnablePushNotificationButtonProps = {
  analysisId: string | null;
  notificationRequested: boolean;
  onRegistered?: (analysisId: string) => void;
};

export function EnablePushNotificationButton({
  analysisId,
  notificationRequested,
  onRegistered,
}: EnablePushNotificationButtonProps) {
  const [state, setState] = useState<RegistrationState>('idle');

  // 새 분석이 시작되면 이전 분석의 로컬 신청 상태를 초기화
  const [trackedAnalysisId, setTrackedAnalysisId] = useState(analysisId);
  if (analysisId !== trackedAnalysisId) {
    setTrackedAnalysisId(analysisId);
    if (trackedAnalysisId !== null) {
      setState('idle');
    } else if (state === 'waiting' && analysisId !== null) {
      setState('registering');
    }
  }

  useEffect(() => {
    if (state !== 'registering' || !analysisId) return;

    let active = true;
    void resolveRegistrationState(analysisId).then((nextState) => {
      if (!active) return;
      if (nextState === 'registered' && onRegistered) {
        setState('idle');
        onRegistered(analysisId);
        return;
      }
      setState(nextState);
    });

    return () => {
      active = false;
    };
  }, [state, analysisId, onRegistered]);

  const handlePress = async () => {
    if (DISABLED_STATES.has(state)) return;

    if (state === 'blocked') {
      await openNotificationSettings();
      return;
    }

    if (!analysisId) {
      setState('waiting');
      return;
    }
    setState('registering');
  };

  const displayState: RegistrationState = notificationRequested ? 'registered' : state;
  const disabled = DISABLED_STATES.has(displayState);

  return (
    <Button disabled={disabled} onPress={handlePress} size="large">
      <Text className={disabled ? 'text-body-03 text-gray-500' : 'text-body-03 text-black'}>
        {LABELS[displayState]}
      </Text>
    </Button>
  );
}
