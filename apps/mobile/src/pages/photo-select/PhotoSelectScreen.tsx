import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoGrid, usePhotoSelection } from '@/features/photo-selection';
import { Button } from '@/shared/ui/Button';
import { Header } from '@/shared/ui/Header';

import { AlbumDropdown } from './ui/AlbumDropdown';

const MIN_SUBMIT_UNITS = 90;

const TARGET_UNITS = 100;

const ALBUM_OPTIONS = [
  { value: 'RECENT', label: '최근 항목' },
  { value: 'FAVORITES', label: '즐겨찾기' },
  { value: 'SCREENSHOTS', label: '스크린샷' },
] as const;

type AlbumKey = (typeof ALBUM_OPTIONS)[number]['value'];

export function PhotoSelectScreen() {
  const [album, setAlbum] = useState<AlbumKey>('RECENT');
  const insets = useSafeAreaInsets();

  const { canSubmit, everythingSelected, photoUnits, selectedCount, toggleEverything, toggleUnit } =
    usePhotoSelection({
      album,
      targetUnits: TARGET_UNITS,
      minSubmitUnits: MIN_SUBMIT_UNITS,
    });

  return (
    <View className="flex-1">
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="gap-8 px-6 pt-4 pb-8">
          <Header />
          <View className="gap-1">
            <Text className="text-white text-body-01">김용희님의 최근 사진 100장을 골랐어요</Text>
            <Text className="text-gray-400 text-body-06 opacity-[0.85]">
              연속 사진은 한 묶음으로 표시돼요
            </Text>
          </View>
        </View>

        <View className="flex-row items-start justify-between px-6 pb-4">
          <AlbumDropdown options={ALBUM_OPTIONS} onSelect={setAlbum} selected={album} />
          <Button onPress={toggleEverything} size="small">
            <Text className="text-white text-caption-01">
              {everythingSelected ? '전체 취소' : '자동 선택'}
            </Text>
          </Button>
        </View>

        <View className="flex-1">
          <PhotoGrid bottomPadding={insets.bottom + 76} onPress={toggleUnit} units={photoUnits} />

          <LinearGradient
            colors={['transparent', '#000000']}
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: insets.bottom + 160,
            }}
          />
          <View
            className="absolute left-[18px] right-[18px]"
            style={{ bottom: insets.bottom + 12 }}
          >
            <Button disabled={!canSubmit} onPress={() => router.push('/board')} size="large">
              <Text
                className={canSubmit ? 'text-body-03 text-black' : 'text-body-03 text-gray-500'}
              >
                이 사진으로 보드 만들기{' '}
                <Text className={canSubmit ? 'text-blue-500' : 'text-red-300'}>
                  {selectedCount} / {TARGET_UNITS}
                </Text>
              </Text>
            </Button>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
