import { Modal, Pressable, Text, View } from 'react-native';

interface UploadFailureModalProps {
  confirmLabel: string;
  message: string;
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function UploadFailureModal({
  confirmLabel,
  message,
  visible,
  onCancel,
  onConfirm,
}: UploadFailureModalProps) {
  return (
    <Modal
      allowSwipeDismissal={false}
      animationType="fade"
      onRequestClose={() => undefined}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View className="items-center justify-center flex-1 px-6 bg-black/70">
        <View accessibilityViewIsModal className="w-full gap-6 p-6 bg-gray-900 rounded-3xl">
          <Text className="text-center text-white text-body-01">{message}</Text>

          <View className="flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              className="items-center justify-center flex-1 py-3 bg-gray-700 rounded-full"
              onPress={onCancel}
            >
              <Text className="text-white text-body-03">취소</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className="items-center justify-center flex-1 py-3 bg-white rounded-full"
              onPress={onConfirm}
            >
              <Text className="text-black text-body-03">{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
