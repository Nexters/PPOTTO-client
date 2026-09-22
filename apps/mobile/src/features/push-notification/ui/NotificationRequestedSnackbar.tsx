import { useEffect, useState } from 'react';
import { Animated, Easing, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';

const AUTO_DISMISS_MS = 3000;
const ENTER_MS = 200;
const EXIT_MS = 200;
const VISIBLE_MS = AUTO_DISMISS_MS - ENTER_MS - EXIT_MS;
const SLIDE_OFFSET = -8;

type NotificationRequestedSnackbarProps = {
  visible: boolean;
  variant?: 'requested' | 'cancelFailed';
  onCancel: () => void;
  onDismiss: () => void;
};

export function NotificationRequestedSnackbar({
  visible,
  variant = 'requested',
  onCancel,
  onDismiss,
}: NotificationRequestedSnackbarProps) {
  const insets = useSafeAreaInsets();
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(SLIDE_OFFSET));

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      translateY.setValue(SLIDE_OFFSET);
      return;
    }

    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: ENTER_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: ENTER_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(VISIBLE_MS),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: EXIT_MS,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SLIDE_OFFSET,
          duration: EXIT_MS,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start(({ finished }) => {
      if (finished) onDismiss();
    });
    return () => animation.stop();
  }, [visible, variant, onDismiss, opacity, translateY]);

  if (!visible) return null;

  return (
    <Animated.View
      className={cn(
        'absolute right-[18px] left-[18px] h-14 flex-row items-center justify-between',
        'rounded-8 bg-gray-900 pt-2 pr-3 pb-2 pl-4',
      )}
      style={{
        top: insets.top + 8,
        zIndex: 10,
        elevation: 10,
        opacity,
        transform: [{ translateY }],
      }}
    >
      <Text className="text-body-05 flex-1 text-gray-200">
        {variant === 'requested'
          ? '스티커 생성 완료 알림이 설정되었습니다.'
          : '알림 신청을 취소하지 못했습니다.'}
      </Text>
      {variant === 'requested' && (
        <Button onPress={onCancel} size="small">
          <Text className="text-caption-01 text-white">알림취소</Text>
        </Button>
      )}
    </Animated.View>
  );
}
