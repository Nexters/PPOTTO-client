import { Modal, Pressable, Text, View } from 'react-native';

interface CancelAnalysisModalProps {
  canceling: boolean;
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CancelAnalysisModal({
  canceling,
  visible,
  onCancel,
  onConfirm,
}: CancelAnalysisModalProps) {
  return (
    <Modal
      allowSwipeDismissal={false}
      animationType="fade"
      onRequestClose={canceling ? () => undefined : onCancel}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View className="items-center justify-center flex-1 px-6 bg-black/70">
        <View
          accessibilityViewIsModal
          className="w-full max-w-[312px] gap-4 p-4 bg-gray-900 rounded-2xl"
        >
          <View className="w-full gap-2 px-6 py-2">
            <Text className="text-center text-white text-body-03">
              정말 스티커 생성을 종료하시겠습니까?
            </Text>
            <Text className="text-center text-gray-500 text-caption-01">
              {'종료를 누르시면 모든 작업이 즉시 중단되며,\n이 상태는 복구할 수 없습니다.'}
            </Text>
          </View>

          <View className="flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              className="items-center justify-center flex-1 h-10 px-7 py-2 bg-gray-800 rounded-full"
              disabled={canceling}
              onPress={onCancel}
            >
              <Text className="text-white text-body-03">취소</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className="items-center justify-center flex-1 h-10 px-7 py-2 bg-white rounded-full"
              disabled={canceling}
              onPress={onConfirm}
            >
              <Text className="text-black text-body-03">종료</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
