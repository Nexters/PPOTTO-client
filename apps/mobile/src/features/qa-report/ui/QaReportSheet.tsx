import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';

import {
  isQaReportInputComplete,
  type QaReport,
  type QaReportCategory,
  type QaReportInput,
  type QaReportSeed,
} from '../model/qa-report';

interface QaReportSheetProps {
  seed: QaReportSeed;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (report: QaReport) => void;
}

const CATEGORIES: QaReportCategory[] = ['기능', '디자인'];

export function QaReportSheet({ seed, submitting, onClose, onSubmit }: QaReportSheetProps) {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState<QaReportInput>({
    title: '',
    category: '기능',
    currentBehavior: '',
    expectedBehavior: '',
  });
  const canSubmit = isQaReportInputComplete(input);
  const networkCount = seed.diagnostics.filter((event) => event.type === 'network').length;
  const consoleCount = seed.diagnostics.length - networkCount;
  const updateInput = (field: keyof QaReportInput, value: string) =>
    setInput((current) => ({ ...current, [field]: value }));

  const submitReport = () => {
    if (!canSubmit) return;
    onSubmit({
      ...seed,
      ...input,
      title: input.title.trim(),
      currentBehavior: input.currentBehavior.trim(),
      expectedBehavior: input.expectedBehavior.trim(),
    });
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={submitting ? undefined : onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="justify-end flex-1 bg-black/[0.55]"
      >
        <Pressable
          accessibilityLabel="QA 작성 닫기"
          accessibilityRole="button"
          className="absolute inset-0"
          disabled={submitting}
          onPress={onClose}
        />

        <View
          accessibilityViewIsModal
          className="max-h-[92%] rounded-t-[28px] bg-[#17181A] px-5 pt-2.5"
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          <View className="mb-3.5 h-[5px] w-10 self-center rounded-full bg-[#55585D]" />
          <View className="mb-5 flex-row items-center justify-between">
            <Text className="text-[22px] font-bold text-white">QA 리포트</Text>
            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              hitSlop={12}
              onPress={onClose}
            >
              <Text className="text-[15px] font-semibold text-[#A8ABB2]">닫기</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View className="gap-2.5 pb-3">
              <Text className="mt-1.5 text-sm font-semibold text-[#E5E7EB]">제목</Text>
              <TextInput
                accessibilityLabel="QA 제목"
                autoFocus
                className="min-h-12 rounded-[14px] border border-[#35373B] bg-[#24262A] px-3.5 py-3 text-base text-white"
                maxLength={100}
                onChangeText={(value) => updateInput('title', value)}
                placeholder="예: 핀치 후 스티커 위치가 튐"
                placeholderTextColor="#777"
                value={input.title}
              />

              <Text className="mt-1.5 text-sm font-semibold text-[#E5E7EB]">분류</Text>
              <View className="flex-row gap-2">
                {CATEGORIES.map((category) => {
                  const selected = input.category === category;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      className={cn(
                        'flex-1 items-center rounded-[14px] border border-[#35373B] bg-[#24262A] py-[11px]',
                        selected && 'border-[#FFD60A] bg-[#FFD60A]',
                      )}
                      key={category}
                      onPress={() => updateInput('category', category)}
                    >
                      <Text
                        className={cn(
                          'text-[15px] font-bold text-[#A8ABB2]',
                          selected && 'text-black',
                        )}
                      >
                        {category}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text className="mt-1.5 text-sm font-semibold text-[#E5E7EB]">문제 (현재 동작)</Text>
              <TextInput
                accessibilityLabel="현재 동작"
                className="min-h-[90px] rounded-[14px] border border-[#35373B] bg-[#24262A] px-3.5 py-3 text-base text-white"
                maxLength={1000}
                multiline
                onChangeText={(value) => updateInput('currentBehavior', value)}
                placeholder="지금은 어떻게 동작하나요?"
                placeholderTextColor="#777"
                textAlignVertical="top"
                value={input.currentBehavior}
              />

              <Text className="mt-1.5 text-sm font-semibold text-[#E5E7EB]">기대한 동작</Text>
              <TextInput
                accessibilityLabel="기대한 동작"
                className="min-h-[90px] rounded-[14px] border border-[#35373B] bg-[#24262A] px-3.5 py-3 text-base text-white"
                maxLength={1000}
                multiline
                onChangeText={(value) => updateInput('expectedBehavior', value)}
                placeholder="어떻게 동작해야 하나요?"
                placeholderTextColor="#777"
                textAlignVertical="top"
                value={input.expectedBehavior}
              />

              <Text className="my-2 text-xs text-[#777B82]">
                Build {seed.buildNumber} · 영상 {(seed.video.size / 1024 / 1024).toFixed(2)}MB ·
                네트워크 {networkCount} · 콘솔 {consoleCount}
              </Text>

              <Button disabled={!canSubmit || submitting} onPress={submitReport} size="large">
                <Text
                  className={cn(
                    'text-base font-bold text-black',
                    (!canSubmit || submitting) && 'text-[#777B82]',
                  )}
                >
                  {submitting ? '등록 중…' : '작성 완료'}
                </Text>
              </Button>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
