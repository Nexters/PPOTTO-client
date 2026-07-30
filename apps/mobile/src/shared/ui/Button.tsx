import { type ReactNode, useState } from 'react';
import { Pressable, type ViewStyle } from 'react-native';

import { cn } from '@/shared/lib/cn';

/** Elevation/16dp */
const LARGE_SHADOW: ViewStyle = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.24,
  shadowRadius: 32,
  elevation: 8,
};

const PRESSED: ViewStyle = { opacity: 0.85, transform: [{ scale: 0.98 }] };

const SHAPE = {
  large: 'w-full flex-row items-center justify-center rounded-full py-3',
  small: 'flex-row items-center justify-center rounded-full px-2 py-1',
} as const;

const TONE = {
  large: { enabled: 'bg-white', disabled: 'bg-gray-800' },
  // #26282b는 토큰 팔레트 밖 색이다. 시안 그대로 쓰되 디자이너 확인이 필요하다.
  small: { enabled: 'bg-[#26282b]', disabled: 'bg-[#26282b]' },
} as const;

interface ButtonProps {
  size: keyof typeof SHAPE;
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
}

/**
 * 라벨 조판은 호출부가 한다. 버튼은 모양·배경·누름 반응만 담당한다.
 *
 * style을 함수형(({ pressed }) => …)으로 주면 NativeWind와 함께 쓸 때 스타일이 통째로 유실된다.
 * 그래서 onPressIn/Out 상태로 눌림을 추적하고 style은 단일 객체로 넘긴다.
 */
export function Button({ size, onPress, disabled = false, children }: ButtonProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      className={cn(SHAPE[size], disabled ? TONE[size].disabled : TONE[size].enabled)}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        ...(size === 'large' && !disabled ? LARGE_SHADOW : null),
        ...(pressed && !disabled ? PRESSED : null),
      }}
    >
      {children}
    </Pressable>
  );
}
