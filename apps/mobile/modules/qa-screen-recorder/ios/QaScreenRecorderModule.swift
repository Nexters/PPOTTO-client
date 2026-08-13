import AVFoundation
import ExpoModulesCore
import ReplayKit

private let clipDuration: TimeInterval = 15

public final class QaScreenRecorderModule: Module {
  private let recorder = RPScreenRecorder.shared()
  private var isBuffering = false

  public func definition() -> ModuleDefinition {
    Name("QaScreenRecorder")

    AsyncFunction("startBuffering") { (promise: Promise) in
      guard !self.isBuffering else {
        promise.resolve()
        return
      }
      guard self.recorder.isAvailable else {
        promise.reject(ScreenRecordingUnavailableException())
        return
      }

      self.recorder.isMicrophoneEnabled = false
      self.recorder.startClipBuffering { error in
        if let error {
          promise.reject(error)
          return
        }

        self.isBuffering = true
        promise.resolve()
      }
    }
    .runOnQueue(.main)

    AsyncFunction("exportLastClip") { (promise: Promise) in
      guard self.isBuffering else {
        promise.reject(ScreenRecordingNotStartedException())
        return
      }

      let outputURL = FileManager.default.temporaryDirectory
        .appendingPathComponent("qa-clip-\(UUID().uuidString).mp4")

      self.recorder.exportClip(to: outputURL, duration: clipDuration) { error in
        if let error {
          promise.reject(error)
          return
        }

        let attributes = try? FileManager.default.attributesOfItem(atPath: outputURL.path)
        let size = (attributes?[.size] as? NSNumber)?.intValue ?? 0
        promise.resolve(["uri": outputURL.absoluteString, "size": size])
      }
    }
    .runOnQueue(.main)

    AsyncFunction("compressVideo") { (uri: String, maxBytes: Int, promise: Promise) in
      guard let inputURL = URL(string: uri), inputURL.isFileURL else {
        promise.reject(InvalidVideoURLException())
        return
      }

      Task {
        do {
          let outputURL = try await compressVideo(at: inputURL, maxBytes: maxBytes)
          let attributes = try FileManager.default.attributesOfItem(atPath: outputURL.path)
          let size = (attributes[.size] as? NSNumber)?.intValue ?? 0
          promise.resolve(["uri": outputURL.absoluteString, "size": size])
        } catch {
          promise.reject(error)
        }
      }
    }

    AsyncFunction("stopBuffering") { (promise: Promise) in
      guard self.isBuffering else {
        promise.resolve()
        return
      }

      self.recorder.stopClipBuffering { error in
        self.isBuffering = false
        if let error {
          promise.reject(error)
        } else {
          promise.resolve()
        }
      }
    }
    .runOnQueue(.main)

    OnDestroy {
      guard self.isBuffering else { return }
      self.recorder.stopClipBuffering { _ in }
      self.isBuffering = false
    }
  }
}

private func compressVideo(at inputURL: URL, maxBytes: Int) async throws -> URL {
  let asset = AVURLAsset(url: inputURL)
  guard let sourceTrack = try await asset.loadTracks(withMediaType: .video).first else {
    throw VideoTrackMissingException()
  }

  let composition = AVMutableComposition()
  guard let outputTrack = composition.addMutableTrack(
    withMediaType: .video,
    preferredTrackID: kCMPersistentTrackID_Invalid
  ) else {
    throw VideoCompressionUnavailableException()
  }

  let timeRange = try await sourceTrack.load(.timeRange)
  try outputTrack.insertTimeRange(timeRange, of: sourceTrack, at: .zero)
  outputTrack.preferredTransform = try await sourceTrack.load(.preferredTransform)

  guard let exporter = AVAssetExportSession(
    asset: composition,
    presetName: AVAssetExportPreset640x480
  ) else {
    throw VideoCompressionUnavailableException()
  }

  let outputURL = FileManager.default.temporaryDirectory
    .appendingPathComponent("qa-compressed-\(UUID().uuidString).mp4")

  exporter.outputURL = outputURL
  exporter.outputFileType = .mp4
  exporter.shouldOptimizeForNetworkUse = true
  exporter.fileLengthLimit = Int64(maxBytes * 95 / 100)

  do {
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
      exporter.exportAsynchronously {
        switch exporter.status {
        case .completed:
          continuation.resume()
        case .failed, .cancelled:
          continuation.resume(throwing: exporter.error ?? VideoCompressionFailedException())
        default:
          continuation.resume(throwing: VideoCompressionFailedException())
        }
      }
    }
    return outputURL
  } catch {
    try? FileManager.default.removeItem(at: outputURL)
    throw error
  }
}

private final class ScreenRecordingUnavailableException: Exception {
  override var reason: String {
    "Screen recording is unavailable on this device"
  }
}

private final class ScreenRecordingNotStartedException: Exception {
  override var reason: String {
    "Screen recording has not started"
  }
}

private final class InvalidVideoURLException: Exception {
  override var reason: String {
    "Video URI must be a local file URL"
  }
}

private final class VideoTrackMissingException: Exception {
  override var reason: String {
    "Video track is missing"
  }
}

private final class VideoCompressionUnavailableException: Exception {
  override var reason: String {
    "Video compression is unavailable"
  }
}

private final class VideoCompressionFailedException: Exception {
  override var reason: String {
    "Video compression failed"
  }
}
