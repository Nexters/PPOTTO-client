import * as Crypto from 'expo-crypto';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMeQuery } from '@/entities/user/api/user-queries';
import {
  photoCompressionQueue,
  PhotoGrid,
  selectedPhotoGroups,
  usePhotoSelection,
} from '@/features/photo-selection';
import { photoUploadService, sampleMotionPhotos } from '@/features/photo-upload';
import { Button } from '@/shared/ui/Button';
import { Header } from '@/shared/ui/Header';

import { prepareUploadJob } from './lib/prepare-upload-job';
import { AlbumDropdown } from './ui/AlbumDropdown';

const TARGET_UNITS = 100;

const ALBUM_OPTIONS = [
  { value: 'RECENT', label: '최근 항목' },
  { value: 'FAVORITES', label: '즐겨찾기' },
  { value: 'SCREENSHOTS', label: '스크린샷' },
] as const;

type AlbumKey = (typeof ALBUM_OPTIONS)[number]['value'];

export function PhotoSelectScreen() {
  const { boardId, mode: modeParam } = useLocalSearchParams<{
    boardId: string;
    mode?: string;
  }>();
  const mode = modeParam === 'additional' ? 'additional' : 'initial';
  const minSubmitUnits = mode === 'additional' ? 20 : 90;
  const [album, setAlbum] = useState<AlbumKey>('RECENT');
  const insets = useSafeAreaInsets();
  const { data: me } = useMeQuery();

  const {
    canSubmit,
    everythingSelected,
    loadMore,
    photoUnits,
    selection,
    selectedCount,
    toggleEverything,
    toggleUnit,
  } = usePhotoSelection({
    album,
    targetUnits: TARGET_UNITS,
    minSubmitUnits,
    mode,
  });

  const handleSubmit = () => {
    if (!selection || !boardId) return;

    const selectedGroups = selectedPhotoGroups(selection);
    const photoCount = selectedGroups.reduce((count, group) => count + group.photos.length, 0);
    const motionPhotos = sampleMotionPhotos(selectedGroups.map((group) => group.photos[0]!));
    photoCompressionQueue.start(
      motionPhotos.map((photo) => ({ id: photo.id, photos: [photo] })),
      { maxDimension: 768, quality: 0.6 },
    );
    const preparedMotionPhotos = photoCompressionQueue.wait().then((photos) =>
      motionPhotos.flatMap((photo) => {
        const preview = photos.get(photo.id);
        return preview && preview.uri !== photo.uri
          ? [{ ...preview, contentType: 'image/jpeg' as const }]
          : [];
      }),
    );
    const jobId = Crypto.randomUUID();

    photoUploadService.start({
      motionPhotos: preparedMotionPhotos,
      photoCount,
      prepareJob: async () => {
        photoCompressionQueue.start(selectedGroups);
        return prepareUploadJob({
          jobId,
          boardId,
          selection,
          compressedPhotos: await photoCompressionQueue.wait(),
        });
      },
    });
    router.replace({ pathname: '/analysis-loading', params: { boardId } });
  };

  return (
    <View className="flex-1">
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="gap-8 px-6 pt-4 pb-8">
          <Header />
          <View className="gap-1">
            <Text className="text-white text-body-01">
              {me ? `${me.name}님의 ` : ''}최근 사진 100장을 골랐어요
            </Text>
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
          <PhotoGrid
            bottomPadding={insets.bottom + 76}
            grouped
            onEndReached={() => void loadMore()}
            onPress={toggleUnit}
            units={photoUnits}
          />

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
            <Button disabled={!canSubmit || !boardId} onPress={handleSubmit} size="large">
              <Text
                className={canSubmit ? 'text-body-03 text-black' : 'text-body-03 text-gray-500'}
              >
                {canSubmit ? '이 사진으로 보드 만들기' : `최소 ${minSubmitUnits}장을 선택해 주세요`}{' '}
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
