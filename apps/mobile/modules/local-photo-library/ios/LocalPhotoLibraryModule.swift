import ExpoModulesCore
import Photos

public final class LocalPhotoLibraryModule: Module {
  private let batchSize = 12
  private let groupWindow: TimeInterval = 5 * 60
  private let maxPhotosPerGroup = 10

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

      for candidate in await localAssets(candidates) {
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

  private func localAssets(_ candidates: [IndexedAsset]) async -> [IndexedAsset] {
    await withTaskGroup(of: (Int, PHAsset?).self) { group in
      for candidate in candidates {
        group.addTask {
          let isLocal = await self.isLocal(candidate.asset)
          return (candidate.index, isLocal ? candidate.asset : nil)
        }
      }

      var assets: [IndexedAsset] = []
      for await (index, asset) in group {
        if let asset {
          assets.append(IndexedAsset(index: index, asset: asset))
        }
      }
      return assets.sorted { $0.index < $1.index }
    }
  }

  private func isLocal(_ asset: PHAsset) async -> Bool {
    await withCheckedContinuation { continuation in
      let options = PHContentEditingInputRequestOptions()
      options.isNetworkAccessAllowed = false

      asset.requestContentEditingInput(with: options) { input, info in
        let isInCloud = (info[PHContentEditingInputResultIsInCloudKey] as? NSNumber)?.boolValue
          ?? false
        continuation.resume(returning: input != nil && !isInCloud)
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
