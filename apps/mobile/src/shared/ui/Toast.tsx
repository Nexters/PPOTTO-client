import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DURATION_MS = 2000;
const ENTER_MS = 400;
const EXIT_MS = 400;
const RISE_PX = 24;

type ToastState = { id: number; message: string };

const ToastContext = createContext<((message: string) => void) | null>(null);

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast는 ToastProvider 안에서만 쓸 수 있어요.');
  return show;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(0);

  const show = useCallback((message: string) => {
    nextId.current += 1;
    setToast({ id: nextId.current, message });
  }, []);

  const hide = useCallback((id: number) => {
    setToast((current) => (current?.id === id ? null : current));
  }, []);

  return (
    <ToastContext.Provider value={show}>
      <View style={{ flex: 1 }}>
        {children}
        {toast && <ToastMessage key={toast.id} toast={toast} onDone={hide} />}
      </View>
    </ToastContext.Provider>
  );
}

function ToastMessage({ toast, onDone }: { toast: ToastState; onDone: (id: number) => void }) {
  const insets = useSafeAreaInsets();
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(RISE_PX));

  useEffect(() => {
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
      Animated.delay(DURATION_MS - ENTER_MS),
      Animated.timing(opacity, {
        toValue: 0,
        duration: EXIT_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => finished && onDone(toast.id));
    return () => animation.stop();
  }, [onDone, opacity, toast.id, translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        right: 0,
        bottom: insets.bottom + 48,
        left: 0,
        alignItems: 'center',
        paddingHorizontal: 24,
        opacity,
        transform: [{ translateY }],
      }}
    >
      <View
        className="bg-gray-800"
        style={{ maxWidth: 270, borderRadius: 30, paddingHorizontal: 24, paddingVertical: 8 }}
      >
        <Text className="text-white text-body-06" style={{ textAlign: 'center' }}>
          {toast.message}
        </Text>
      </View>
    </Animated.View>
  );
}
