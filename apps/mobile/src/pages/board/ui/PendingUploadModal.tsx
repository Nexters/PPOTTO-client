import { Modal, Pressable, Text, View } from 'react-native';

interface PendingUploadModalProps {
  visible: boolean;
  onConfirm: () => void;
}

export function PendingUploadModal({ visible, onConfirm }: PendingUploadModalProps) {
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
          <Text className="text-center text-white text-body-01">
            분석 중인 사진들이 있어요.{`\n`}분석을 계속 진행할까요?
          </Text>

          <Pressable
            accessibilityRole="button"
            className="items-center justify-center py-3 bg-white rounded-full"
            onPress={onConfirm}
          >
            <Text className="text-black text-body-03">확인</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
