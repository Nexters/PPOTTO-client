import ExpoModulesCore
import Photos
import UIKit

public final class LocalPhotoLibraryModule: Module {
  private let batchSize = 12
  private let groupWindow: TimeInterval = 5 * 60
  private let maxPhotosPerGroup = 10
  private static let loadTimeout: TimeInterval = 30

  private struct IndexedAsset {
    let index: Int
    let asset: PHAsset
  }

  public func definition() -> ModuleDefinition {
    Name("LocalPhotoLibrary")

    AsyncFunction("fetchLocalPhotoGroups") {
      (offset: Int, limit: Int, album: String) async -> [String: Any] in
      await self.fetchLocalPhotoGroups(offset: offset, limit: limit, album: album)
    }

    AsyncFunction("loadResizedImage") {
      (assetId: String, maxDimension: Double, quality: Double) async throws -> [String: Any] in
      try await self.loadResizedImage(assetId: assetId, maxDimension: maxDimension, quality: quality)
    }
  }

  private func fetchLocalPhotoGroups(offset: Int, limit: Int, album: String) async -> [String: Any] {
    let options = PHFetchOptions()
    options.includeAssetSourceTypes = .typeUserLibrary
    options.includeHiddenAssets = false
    options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
    let fetchResult = PHAsset.fetchAssets(with: .image, options: options)

    guard limit > 0 else {
      return page(groups: [], endCursor: offset, hasNextPage: offset < fetchResult.count)
    }

    var index = max(0, min(offset, fetchResult.count))
    var groups: [[PHAsset]] = []
    var currentGroup: [PHAsset] = []
    var anchorDate: Date?

    while index < fetchResult.count {
      let end = min(index + batchSize, fetchResult.count)
      let candidates = (index..<end).compactMap { assetIndex -> IndexedAsset? in
        let asset = fetchResult.object(at: assetIndex)
        guard asset.creationDate != nil, matchesAlbum(asset, album: album) else { return nil }
        return IndexedAsset(index: assetIndex, asset: asset)
      }

      for candidate in candidates {
        guard let creationDate = candidate.asset.creationDate else { continue }

        if let anchor = anchorDate, creationDate < anchor.addingTimeInterval(-groupWindow) {
          groups.append(currentGroup)
          if groups.count == limit {
            return page(groups: groups, endCursor: candidate.index, hasNextPage: true)
          }
          currentGroup = []
          anchorDate = creationDate
        } else if anchorDate == nil {
          anchorDate = creationDate
        }

        if currentGroup.count < maxPhotosPerGroup {
          currentGroup.append(candidate.asset)
        }
      }

      index = end
    }

    if !currentGroup.isEmpty {
      groups.append(currentGroup)
    }
    return page(groups: groups, endCursor: fetchResult.count, hasNextPage: false)
  }

  private func matchesAlbum(_ asset: PHAsset, album: String) -> Bool {
    switch album {
    case "FAVORITES":
      return asset.isFavorite
    case "SCREENSHOTS":
      return asset.mediaSubtypes.contains(.photoScreenshot)
    default:
      return true
    }
  }

  private enum ImageLoadError: Error, LocalizedError {
    case assetNotFound(String)
    case loadFailed(String)
    case timedOut
    case encodeFailed

    var errorDescription: String? {
      switch self {
      case .assetNotFound(let id): return "사진을 찾을 수 없습니다: \(id)"
      case .loadFailed(let reason): return "사진을 불러오지 못했습니다: \(reason)"
      case .timedOut: return "사진 다운로드 시간이 초과되었습니다"
      case .encodeFailed: return "사진을 인코딩하지 못했습니다"
      }
    }
  }

  private struct LoadedImage {
    let image: UIImage
    let fromICloud: Bool
  }

  /// 한 번만 resume되도록 보호하고, iCloud 다운로드 발생 여부를 추적한다.
  private final class ImageRequestState {
    private let lock = NSLock()
    private var resumed = false
    private var cloud = false

    var fromICloud: Bool {
      lock.lock()
      defer { lock.unlock() }
      return cloud
    }

    func markFromICloud() {
      lock.lock()
      cloud = true
      lock.unlock()
    }

    func resume(
      _ continuation: CheckedContinuation<LoadedImage, Error>,
      with result: Result<LoadedImage, Error>
    ) {
      lock.lock()
      let shouldResume = !resumed
      resumed = true
      lock.unlock()
      guard shouldResume else { return }
      continuation.resume(with: result)
    }
  }

  /// 원본 대신 maxDimension 렌디션만 받아 JPEG 임시 파일로 저장한다.
  /// 원본이 iCloud에만 있으면 렌디션 크기만큼만 네트워크로 내려받는다.
  private func loadResizedImage(
    assetId: String, maxDimension: Double, quality: Double
  ) async throws -> [String: Any] {
    guard
      let asset = PHAsset.fetchAssets(withLocalIdentifiers: [assetId], options: nil).firstObject
    else {
      throw ImageLoadError.assetNotFound(assetId)
    }

    let loaded = try await requestImage(for: asset, maxDimension: maxDimension)
    guard let data = loaded.image.jpegData(compressionQuality: quality) else {
      throw ImageLoadError.encodeFailed
    }

    let fileURL = FileManager.default.temporaryDirectory
      .appendingPathComponent(UUID().uuidString)
      .appendingPathExtension("jpg")
    try data.write(to: fileURL)

    return [
      "uri": fileURL.absoluteString,
      "width": Int(loaded.image.size.width * loaded.image.scale),
      "height": Int(loaded.image.size.height * loaded.image.scale),
      "fromICloud": loaded.fromICloud
    ]
  }

  private func requestImage(for asset: PHAsset, maxDimension: Double) async throws -> LoadedImage {
    let longestSide = max(CGFloat(asset.pixelWidth), CGFloat(asset.pixelHeight), 1)
    let scale = min(1, CGFloat(maxDimension) / longestSide)
    let targetSize = CGSize(
      width: CGFloat(asset.pixelWidth) * scale,
      height: CGFloat(asset.pixelHeight) * scale
    )
    let state = ImageRequestState()

    return try await withCheckedThrowingContinuation { continuation in
      let options = PHImageRequestOptions()
      options.isNetworkAccessAllowed = true
      // 기본값(opportunistic)은 저화질 썸네일을 먼저 돌려줄 수 있어 고화질 1회 응답을 강제한다
      options.deliveryMode = .highQualityFormat
      options.resizeMode = .fast
      // progressHandler는 iCloud 다운로드가 필요할 때만 호출된다
      options.progressHandler = { _, _, _, _ in state.markFromICloud() }

      let requestId = PHImageManager.default().requestImage(
        for: asset, targetSize: targetSize, contentMode: .aspectFit, options: options
      ) { image, info in
        guard let image else {
          let reason = (info?[PHImageErrorKey] as? NSError)?.localizedDescription ?? "unknown"
          state.resume(continuation, with: .failure(ImageLoadError.loadFailed(reason)))
          return
        }
        state.resume(
          continuation,
          with: .success(LoadedImage(image: image, fromICloud: state.fromICloud))
        )
      }

      // PHImageManager에는 타임아웃이 없어 네트워크가 멈추면 영원히 대기한다
      DispatchQueue.global().asyncAfter(deadline: .now() + Self.loadTimeout) {
        PHImageManager.default().cancelImageRequest(requestId)
        state.resume(continuation, with: .failure(ImageLoadError.timedOut))
      }
    }
  }

  private func page(groups: [[PHAsset]], endCursor: Int, hasNextPage: Bool) -> [String: Any] {
    let assets = groups.flatMap { group in
      group.reversed().compactMap { asset -> [String: Any]? in
        guard let creationDate = asset.creationDate else { return nil }
        return [
          "id": asset.localIdentifier,
          "uri": "ph://\(asset.localIdentifier)",
          "creationTime": creationDate.timeIntervalSince1970 * 1_000,
          "width": asset.pixelWidth,
          "height": asset.pixelHeight
        ]
      }
    }

    return [
      "assets": assets,
      "endCursor": endCursor,
      "hasNextPage": hasNextPage
    ]
  }
}
