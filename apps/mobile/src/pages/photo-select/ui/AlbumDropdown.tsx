import { ChevronDown, ChevronUp } from '@ppotto/assets';
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { cn } from '@/shared/lib/cn';

const PANEL_SHADOW = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.16,
  shadowRadius: 10,
  elevation: 8,
} as const;

export interface AlbumOption<Value extends string> {
  value: Value;
  label: string;
}

interface AlbumDropdownProps<Value extends string> {
  options: readonly AlbumOption<Value>[];
  selected: Value;
  onSelect: (value: Value) => void;
}

export function AlbumDropdown<Value extends string>({
  options,
  selected,
  onSelect,
}: AlbumDropdownProps<Value>) {
  const [expanded, setExpanded] = useState(false);
  const [triggerPressed, setTriggerPressed] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<View>(null);
  const selectedLabel = options.find((option) => option.value === selected)?.label ?? selected;

  /** 패널은 Modal(별도 네이티브 창) 안에 있어 화면 좌표가 필요하다. 트리거 자체를 재야 정확하다. */
  const measureTrigger = () => {
    triggerRef.current?.measureInWindow((x, y, _width, height) =>
      setAnchor({ x, y: y + height + 8 }),
    );
  };

  const choose = (value: Value) => {
    setExpanded(false);
    onSelect(value);
  };

  return (
    <View>
      <Pressable
        accessibilityLabel="앨범 선택"
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        className={cn('flex-row items-center gap-1', triggerPressed && 'opacity-60')}
        collapsable={false}
        onLayout={measureTrigger}
        onPress={() => {
          measureTrigger();
          setExpanded((previous) => !previous);
        }}
        onPressIn={() => setTriggerPressed(true)}
        onPressOut={() => setTriggerPressed(false)}
        ref={triggerRef}
      >
        <Text className="text-white text-body-05">{selectedLabel}</Text>
        <View className="items-center justify-center size-6">
          {expanded ? <ChevronUp /> : <ChevronDown />}
        </View>
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setExpanded(false)}
        transparent
        visible={expanded}
      >
        <Pressable
          accessibilityLabel="목록 닫기"
          accessibilityRole="button"
          onPress={() => setExpanded(false)}
          style={StyleSheet.absoluteFill}
        />
        <View
          className="absolute gap-1 p-2 bg-gray-900 rounded-16"
          style={{ left: anchor.x, top: anchor.y, ...PANEL_SHADOW }}
        >
          {options.map((option) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: option.value === selected }}
              className={cn(
                'w-full items-center rounded-8 px-3 py-1',
                option.value === selected && 'bg-gray-800',
              )}
              key={option.value}
              onPress={() => choose(option.value)}
            >
              <Text className="text-white text-body-06">{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </Modal>
    </View>
  );
}
