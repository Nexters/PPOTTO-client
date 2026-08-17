import * as Crypto from 'expo-crypto';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMeQuery } from '@/entities/user/api/user-queries';
import {
  type GalleryPhoto,
  photoCompressionQueue,
  PhotoGrid,
  selectedPhotoGroups,
  usePhotoSelection,
} from '@/features/photo-selection';
import { MAX_MOTION_PHOTOS, photoUploadService, sampleMotionPhotos } from '@/features/photo-upload';
import { Button } from '@/shared/ui/Button';
import { Header } from '@/shared/ui/Header';

import { createMotionPhotoPreloader } from './lib/motion-photo-preloader';
import { prepareUploadJob } from './lib/prepare-upload-job';

const TARGET_UNITS = 100;

function retainMotionPhotos(
  previous: readonly GalleryPhoto[],
  candidates: readonly GalleryPhoto[],
) {
  const candidatesById = new Map(candidates.map((photo) => [photo.id, photo]));
  const retained = previous.flatMap((photo) => {
    const candidate = candidatesById.get(photo.id);
    return candidate ? [candidate] : [];
  });
  if (retained.length >= MAX_MOTION_PHOTOS) return retained.slice(0, MAX_MOTION_PHOTOS);

  const retainedIds = new Set(retained.map((photo) => photo.id));
  const replacements = sampleMotionPhotos(candidates.filter((photo) => !retainedIds.has(photo.id)));
  return [...retained, ...replacements].slice(0, MAX_MOTION_PHOTOS);
}

export function PhotoSelectScreen() {
  const { boardId, mode: modeParam } = useLocalSearchParams<{
    boardId: string;
    mode?: string;
  }>();
  const mode = modeParam === 'additional' ? 'additional' : 'initial';
  const minSubmitUnits = mode === 'additional' ? 20 : 90;
  const [motionPhotoPreloader] = useState(createMotionPhotoPreloader);
  const motionPhotosRef = useRef<GalleryPhoto[]>([]);
  const submittedRef = useRef(false);
  const insets = useSafeAreaInsets();
  const { data: me } = useMeQuery();

  const {
    canSubmit,
    everythingSelected,
    hasNextPage,
    loading,
    loadMore,
    permission,
    photoUnits,
    presentPermissionPicker,
    requestPermission,
    selection,
    selectedCount,
    setGroupExcludedCounts,
    toggleEverything,
    toggleUnit,
  } = usePhotoSelection({
    album: 'RECENT',
    targetUnits: TARGET_UNITS,
    minSubmitUnits,
    mode,
  });
  const permissionRequired = permission !== null && !permission.granted;

  useEffect(() => {
    if (loading) {
      motionPhotosRef.current = [];
      motionPhotoPreloader.sync([]);
      return;
    }

    const representatives = selection
      ? selectedPhotoGroups(selection).map((group) => group.photos[0]!)
      : [];
    const next = retainMotionPhotos(motionPhotosRef.current, representatives);
    motionPhotosRef.current = next;
    motionPhotoPreloader.sync(next);
  }, [loading, motionPhotoPreloader, selection]);

  useEffect(
    () => () => {
      if (!submittedRef.current) motionPhotoPreloader.clear();
    },
    [motionPhotoPreloader],
  );

  const handleSubmit = () => {
    if (!selection || !boardId) return;

    const selectedGroups = selectedPhotoGroups(selection);
    const photoCount = selectedGroups.reduce((count, group) => count + group.photos.length, 0);
    const motionPhotos = retainMotionPhotos(
      motionPhotosRef.current,
      selectedGroups.map((group) => group.photos[0]!),
    );
    motionPhotosRef.current = motionPhotos;
    const preparedMotionPhotos = motionPhotoPreloader
      .wait(motionPhotos)
      .finally(() => motionPhotoPreloader.clear());
    const jobId = Crypto.randomUUID();
    submittedRef.current = true;

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
    <View className="flex-1 bg-black">
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="gap-8 px-6 pt-4 pb-8">
          <Header />
          <View className="gap-1">
            <Text className="text-white text-body-01">
              {permissionRequired
                ? '사진 접근을 허용해 주세요'
                : `${me ? `${me.name}님의 ` : ''}최근 사진 100장을 골랐어요`}
            </Text>
            <Text className="text-gray-400 text-body-06 opacity-[0.85]">
              {permissionRequired
                ? '최근 사진으로 보드를 만들려면 권한이 필요해요'
                : '전체 취소를 눌러 원하는 사진을 다시 선택할 수 있어요.'}
            </Text>
          </View>
        </View>

        {permissionRequired ? (
          <View className="items-center justify-center flex-1 gap-6 px-8 pb-24">
            <View className="items-center gap-2">
              <Text className="text-center text-white text-body-02">사진 접근 권한이 필요해요</Text>
              <Text className="text-center text-gray-400 text-body-06">
                보드에 사용할 최근 사진을 불러오고 선택하려면{`\n`}사진 보관함 접근을 허용해 주세요.
              </Text>
            </View>
            <View className="w-full">
              <Button
                onPress={() =>
                  void (permission.canAskAgain ? requestPermission() : Linking.openSettings())
                }
                size="large"
              >
                <Text className="text-black text-body-03">
                  {permission.canAskAgain ? '사진 접근 허용하기' : '설정에서 권한 허용하기'}
                </Text>
              </Button>
            </View>
          </View>
        ) : (
          <>
            {/* 앨범 전환 기능 미구현으로 드롭다운 임시 숨김 — 기능 붙일 때 justify-between으로 복구 */}
            <View className="flex-row items-start justify-end px-6 pb-4">
              <Button onPress={toggleEverything} size="small">
                <Text className="text-white text-caption-01">
                  {everythingSelected ? '전체 취소' : '자동 선택'}
                </Text>
              </Button>
            </View>

            {permission?.accessPrivileges === 'limited' ? (
              <View className="flex-row items-center gap-3 px-4 py-3 mx-6 mb-3 bg-gray-900 rounded-xl">
                <Text className="flex-1 text-gray-300 text-caption-01">
                  허용한 사진만 표시되고 있어요
                </Text>
                <Button onPress={() => void presentPermissionPicker()} size="small">
                  <Text className="text-white text-caption-01">사진 더 허용</Text>
                </Button>
              </View>
            ) : null}

            <View className="flex-1">
              <PhotoGrid
                bottomPadding={insets.bottom + 76}
                grouped
                hasNextPage={hasNextPage}
                loading={loading}
                onEndReached={() => void loadMore()}
                onDragChange={setGroupExcludedCounts}
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
                style={{ bottom: insets.bottom + 48 }}
              >
                <Button disabled={!canSubmit || !boardId} onPress={handleSubmit} size="large">
                  <Text
                    className={canSubmit ? 'text-body-03 text-black' : 'text-body-03 text-gray-500'}
                  >
                    {canSubmit
                      ? '이 사진으로 보드 만들기'
                      : `최소 ${minSubmitUnits}장을 선택해 주세요 `}{' '}
                    <Text className={canSubmit ? 'text-blue-500' : 'text-red-300'}>
                      {selectedCount} / {TARGET_UNITS}
                    </Text>
                  </Text>
                </Button>
              </View>
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}
