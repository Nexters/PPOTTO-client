import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

const CHEVRON_DOWN = require('@/assets/icons/chevron-down.svg');
const CHEVRON_UP = require('@/assets/icons/chevron-up.svg');

export const ALBUM_KEYS = ['RECENT', 'FAVORITES', 'SCREENSHOTS'] as const;

export type AlbumKey = (typeof ALBUM_KEYS)[number];

export const ALBUM_LABELS: Record<AlbumKey, string> = {
  RECENT: '최근 항목',
  FAVORITES: '즐겨찾기',
  SCREENSHOTS: '스크린샷',
};

interface AlbumDropdownProps {
  selected: AlbumKey;
  onSelect: (album: AlbumKey) => void;
}

/** 앨범 3개 고정 선택기. 열림/닫힘만 자기 상태로 갖고 선택은 위임한다. */
export function AlbumDropdown({ selected, onSelect }: AlbumDropdownProps) {
  const [expanded, setExpanded] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<View>(null);

  const toggle = () => {
    // 패널을 트리거 아래에 띄우려면 화면 좌표가 필요하다. 콜백이 늦어도 열기는 즉시 진행한다.
    triggerRef.current?.measureInWindow((x, y, _width, height) =>
      setAnchor({ x, y: y + height + 8 }),
    );
    setExpanded((previous) => !previous);
  };

  const choose = (album: AlbumKey) => {
    setExpanded(false);
    onSelect(album);
  };

  return (
    <View ref={triggerRef} collapsable={false}>
      <Pressable
        accessibilityLabel="앨범 선택"
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={toggle}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
        <Text className="text-body-05 text-white">{ALBUM_LABELS[selected]}</Text>
        <Image source={expanded ? CHEVRON_UP : CHEVRON_DOWN} style={{ width: 24, height: 24 }} />
      </Pressable>

      <Modal animationType="none" onRequestClose={toggle} transparent visible={expanded}>
        <Pressable
          accessibilityLabel="목록 닫기"
          accessibilityRole="button"
          onPress={() => setExpanded(false)}
          style={StyleSheet.absoluteFill}
        />
        <View
          className="bg-gray-900"
          style={{
            position: 'absolute',
            left: anchor.x,
            top: anchor.y,
            borderRadius: 16,
            padding: 8,
            gap: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.16,
            shadowRadius: 10,
            elevation: 8,
          }}
        >
          {ALBUM_KEYS.map((album) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: album === selected }}
              className={album === selected ? 'bg-gray-800' : undefined}
              key={album}
              onPress={() => choose(album)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text className="text-body-06 text-white">{ALBUM_LABELS[album]}</Text>
            </Pressable>
          ))}
        </View>
      </Modal>
    </View>
  );
}
