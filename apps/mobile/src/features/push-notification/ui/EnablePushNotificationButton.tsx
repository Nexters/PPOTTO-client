import { useState } from 'react';
import { Text } from 'react-native';

import { Button } from '@/shared/ui/Button';

import { openNotificationSettings } from '../lib/notification-permission';
import { registerPushNotification } from '../model/push-notification-registration';

type RegistrationState = 'idle' | 'registering' | 'registered' | 'blocked';

const LABELS: Record<RegistrationState, string> = {
  idle: '결과 알림 받기',
  registering: '알림 설정 중...',
  registered: '알림 신청 완료',
  blocked: '설정에서 알림 켜기',
};

export function EnablePushNotificationButton() {
  const [state, setState] = useState<RegistrationState>('idle');

  const handlePress = async () => {
    if (state === 'registering' || state === 'registered') return;

    if (state === 'blocked') {
      await openNotificationSettings();
      return;
    }

    setState('registering');
    try {
      const result = await registerPushNotification();
      if (result.status === 'registered') {
        setState('registered');
        return;
      }
      setState(result.status === 'blocked' ? 'blocked' : 'idle');
    } catch {
      setState('idle');
    }
  };

  return (
    <Button
      disabled={state === 'registering' || state === 'registered'}
      onPress={handlePress}
      size="large"
    >
      <Text
        className={
          state === 'registering' || state === 'registered'
            ? 'text-body-03 text-gray-500'
            : 'text-body-03 text-black'
        }
      >
        {LABELS[state]}
      </Text>
    </Button>
  );
}
