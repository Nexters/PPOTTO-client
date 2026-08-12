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
