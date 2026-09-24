package com.ppotto.localphotolibrary

import android.content.ContentUris
import android.graphics.BitmapFactory
import android.os.Build
import android.provider.MediaStore
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * iOS LocalPhotoLibraryModule의 Android 짝. 그룹핑은 JS(groupPhotos)가 하므로
 * 여기서는 앨범 필터 + 최신순 정렬 + offset 페이지네이션만 담당한다.
 * uri/id/creationTime 형식은 expo-media-library getAssetsAsync와 동일하게 맞춘다.
 * loadResizedImage는 iOS 전용이라 구현하지 않는다(JS가 Android에서 호출하지 않음).
 */
class LocalPhotoLibraryModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LocalPhotoLibrary")

    AsyncFunction("fetchLocalPhotoGroups") { offset: Int, limit: Int, album: String ->
      fetchLocalPhotos(offset = offset, limit = limit, album = album)
    }
  }

  private fun fetchLocalPhotos(offset: Int, limit: Int, album: String): Map<String, Any> {
    val resolver = appContext.reactContext?.contentResolver
      ?: throw CodedException("React context is not available")

    val selection = when (album) {
      "FAVORITES" -> {
        // IS_FAVORITE는 Android 11(API 30)부터. 그 아래는 시스템 즐겨찾기 개념이 없다.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return page(emptyList(), offset, false)
        "${MediaStore.MediaColumns.IS_FAVORITE} = 1"
      }
      // ponytail: 폴더명만 매칭. 누락 리포트 오면 `OR DISPLAY_NAME LIKE 'Screenshot%'` 추가
      "SCREENSHOTS" -> "${MediaStore.Images.Media.BUCKET_DISPLAY_NAME} = 'Screenshots'"
      else -> null
    }

    val projection = arrayOf(
      MediaStore.Images.Media._ID,
      MediaStore.Images.Media.DATA,
      MediaStore.Images.Media.DATE_TAKEN,
      MediaStore.Images.Media.DATE_ADDED,
      MediaStore.Images.Media.WIDTH,
      MediaStore.Images.Media.HEIGHT,
    )
    val sortOrder =
      "${MediaStore.Images.Media.DATE_TAKEN} DESC, ${MediaStore.Images.Media.DATE_ADDED} DESC"

    val cursor = resolver.query(
      MediaStore.Images.Media.EXTERNAL_CONTENT_URI, projection, selection, null, sortOrder,
    ) ?: return page(emptyList(), offset, false)

    cursor.use {
      val idIdx = it.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
      val dataIdx = it.getColumnIndexOrThrow(MediaStore.Images.Media.DATA)
      val takenIdx = it.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_TAKEN)
      val addedIdx = it.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED)
      val widthIdx = it.getColumnIndexOrThrow(MediaStore.Images.Media.WIDTH)
      val heightIdx = it.getColumnIndexOrThrow(MediaStore.Images.Media.HEIGHT)

      val assets = mutableListOf<Map<String, Any>>()
      if (limit > 0 && it.moveToPosition(offset)) {
        do {
          val id = it.getLong(idIdx)
          var width = it.getInt(widthIdx)
          var height = it.getInt(heightIdx)
          if (width <= 0 || height <= 0) {
            // 일부 기기는 WIDTH/HEIGHT 컬럼이 비어 있어 헤더만 디코드해 채운다
            val uri = ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id)
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            runCatching {
              resolver.openInputStream(uri)?.use { s -> BitmapFactory.decodeStream(s, null, bounds) }
            }
            width = bounds.outWidth.coerceAtLeast(0)
            height = bounds.outHeight.coerceAtLeast(0)
          }
          val taken = it.getLong(takenIdx)
          assets.add(
            mapOf(
              "id" to id.toString(),
              "uri" to "file://${it.getString(dataIdx)}",
              "creationTime" to (if (taken > 0) taken else it.getLong(addedIdx) * 1000),
              "width" to width,
              "height" to height,
            ),
          )
        } while (assets.size < limit && it.moveToNext())
      }

      val end = offset + assets.size
      return page(assets, end, end < it.count)
    }
  }

  private fun page(assets: List<Map<String, Any>>, endCursor: Int, hasNextPage: Boolean) =
    mapOf("assets" to assets, "endCursor" to endCursor, "hasNextPage" to hasNextPage)
}
