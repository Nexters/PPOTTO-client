import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/cn';

export function GalleryPermissionRequest() {
  const [permission, requestPermission] = MediaLibrary.usePermissions();
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);

  const loadPhotos = async () => {
    const result = await MediaLibrary.getAssetsAsync({
      first: 100,
      sortBy: MediaLibrary.SortBy.creationTime,
    });
    setAssets(result.assets);
  };

  return (
    <View className="w-full flex-1 items-center gap-4">
      <Text className="text-body-06 text-gray-600">
        status: {permission?.status ?? 'checking...'}
      </Text>
      <Text className="text-body-06 text-gray-600">불러온 사진: {assets.length}장</Text>

      <View className="flex-row gap-3">
        <Pressable className="rounded-16 bg-gray-900 px-4 py-3" onPress={() => requestPermission()}>
          <Text className="text-body-04 text-gray-50">권한 요청하기</Text>
        </Pressable>
        <Pressable
          className={cn(
            'rounded-16 bg-gray-900 px-4 py-3',
            permission?.status !== 'granted' && 'opacity-40',
          )}
          disabled={permission?.status !== 'granted'}
          onPress={loadPhotos}
        >
          <Text className="text-body-04 text-gray-50">사진 불러오기</Text>
        </Pressable>
      </View>

      <FlatList
        data={assets}
        numColumns={7}
        keyExtractor={(item) => item.id}
        className="w-full flex-1"
        contentContainerStyle={{ gap: 4, paddingHorizontal: 8, paddingBottom: 24 }}
        columnWrapperStyle={{ gap: 4 }}
        renderItem={({ item }) => (
          <Image source={{ uri: item.uri }} style={{ width: 50, height: 50, borderRadius: 8 }} />
        )}
      />
    </View>
  );
}
