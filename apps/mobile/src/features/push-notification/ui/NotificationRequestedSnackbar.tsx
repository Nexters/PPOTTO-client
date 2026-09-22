import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';

const AUTO_DISMISS_MS = 3000;

type NotificationRequestedSnackbarProps = {
  visible: boolean;
  onCancel: () => void;
  onDismiss: () => void;
};

export function NotificationRequestedSnackbar({
  visible,
  onCancel,
  onDismiss,
}: NotificationRequestedSnackbarProps) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <View
      className={cn(
        'absolute right-[18px] left-[18px] h-14 flex-row items-center justify-between',
        'rounded-8 bg-gray-900 pt-2 pr-3 pb-2 pl-4',
      )}
      style={{ top: insets.top + 8, zIndex: 10, elevation: 10 }}
    >
      <Text className="text-body-05 flex-1 text-gray-200">
        스티커 생성 완료 알림이 설정되었습니다.
      </Text>
      <Button onPress={onCancel} size="small">
        <Text className="text-caption-01 text-white">알림취소</Text>
      </Button>
    </View>
  );
}
