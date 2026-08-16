package com.ppotto.qascreenrecorder

import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMuxer
import android.media.MediaRecorder
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.nio.ByteBuffer
import java.util.ArrayDeque
import java.util.UUID
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

private const val CAPTURE_REQUEST_CODE = 15150
private const val CLIP_DURATION_US = 15_000_000L
private const val VIDEO_BIT_RATE = 1_200_000
private const val VIDEO_FRAME_RATE = 24
private const val MAX_VIDEO_DIMENSION = 640
private const val SEGMENT_MAX_BYTES = 2_000_000L
private const val MAX_COMPLETED_SEGMENTS = 3

class QaScreenRecorderModule : Module() {
  private var startPromise: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("QaScreenRecorder")

    AsyncFunction("startBuffering") { promise: Promise ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        promise.reject(ScreenRecordingUnavailableException("Android 8 or newer is required"))
        return@AsyncFunction
      }
      if (QaScreenRecorderController.isRecording) {
        promise.resolve()
        return@AsyncFunction
      }
      if (startPromise != null) {
        promise.reject(ScreenRecordingBusyException())
        return@AsyncFunction
      }

      startPromise = promise
      val manager = appContext.throwingActivity
        .getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
      appContext.throwingActivity.startActivityForResult(
        manager.createScreenCaptureIntent(),
        CAPTURE_REQUEST_CODE,
      )
    }.runOnQueue(Queues.MAIN)

    OnActivityResult { _, (requestCode, resultCode, data) ->
      if (requestCode != CAPTURE_REQUEST_CODE) return@OnActivityResult

      val promise = startPromise ?: return@OnActivityResult
      startPromise = null
      if (resultCode != Activity.RESULT_OK || data == null) {
        promise.reject(ScreenRecordingPermissionDeniedException())
        return@OnActivityResult
      }

      QaScreenRecorderService.start(
        appContext.throwingActivity.applicationContext,
        resultCode,
        data,
      ) { error ->
        if (error == null) promise.resolve()
        else promise.reject(ScreenRecordingUnavailableException(error.message, error))
      }
    }

    AsyncFunction("exportLastClip").SuspendBody<Map<String, Any>> {
      val files = withContext(Dispatchers.Main) {
        QaScreenRecorderController.snapshotAndRestart()
      }
      val output = File(
        appContext.throwingActivity.cacheDir,
        "qa-clip-${UUID.randomUUID()}.mp4",
      )

      try {
        withContext(Dispatchers.IO) { writeLastClip(files, output) }
        mapOf<String, Any>("uri" to Uri.fromFile(output).toString(), "size" to output.length())
      } finally {
        files.forEach(File::delete)
      }
    }

    AsyncFunction("compressVideo") { uri: String, maxBytes: Int ->
      val file = Uri.parse(uri).path?.let(::File)
        ?: throw InvalidVideoUrlException()
      if (!file.isFile) throw InvalidVideoUrlException()
      if (file.length() > maxBytes) throw VideoTooLargeException()
      mapOf("uri" to Uri.fromFile(file).toString(), "size" to file.length())
    }

    AsyncFunction("stopBuffering") {
      QaScreenRecorderService.stop(appContext.throwingActivity.applicationContext)
    }.runOnQueue(Queues.MAIN)

    OnDestroy {
      startPromise?.reject(ScreenRecordingInterruptedException())
      startPromise = null
      appContext.reactContext?.applicationContext?.let(QaScreenRecorderService::stop)
    }
  }
}

class QaScreenRecorderService : Service() {
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action != ACTION_START) return START_NOT_STICKY

    startInForeground()
    val resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, Activity.RESULT_CANCELED)
    val resultData = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      intent.getParcelableExtra(EXTRA_RESULT_DATA, Intent::class.java)
    } else {
      @Suppress("DEPRECATION")
      intent.getParcelableExtra(EXTRA_RESULT_DATA)
    }

    val error = runCatching {
      requireNotNull(resultData) { "Screen recording permission result is missing" }
      QaScreenRecorderController.start(this, resultCode, resultData) { stopSelf() }
    }.exceptionOrNull()

    completeStart(error)
    if (error != null) stopSelf()
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    QaScreenRecorderController.stop()
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun startInForeground() {
    val manager = getSystemService(NotificationManager::class.java)
    manager.createNotificationChannel(
      NotificationChannel(
        NOTIFICATION_CHANNEL_ID,
        "QA 화면 기록",
        NotificationManager.IMPORTANCE_LOW,
      ),
    )

    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val pendingIntent = PendingIntent.getActivity(
      this,
      0,
      launchIntent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
    val notification = Notification.Builder(this, NOTIFICATION_CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("QA 화면 기록 중")
      .setContentText("버튼을 누르면 직전 15초를 리포트에 첨부해요.")
      .setContentIntent(pendingIntent)
      .setCategory(Notification.CATEGORY_SERVICE)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .build()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION,
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  companion object {
    private const val ACTION_START = "com.ppotto.qascreenrecorder.START"
    private const val EXTRA_RESULT_CODE = "resultCode"
    private const val EXTRA_RESULT_DATA = "resultData"
    private const val NOTIFICATION_CHANNEL_ID = "qa-screen-recorder"
    private const val NOTIFICATION_ID = 15150

    private var startCompletion: ((Throwable?) -> Unit)? = null

    fun start(
      context: Context,
      resultCode: Int,
      resultData: Intent,
      completion: (Throwable?) -> Unit,
    ) {
      startCompletion = completion
      val intent = Intent(context, QaScreenRecorderService::class.java)
        .setAction(ACTION_START)
        .putExtra(EXTRA_RESULT_CODE, resultCode)
        .putExtra(EXTRA_RESULT_DATA, resultData)

      runCatching {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(intent)
        } else {
          context.startService(intent)
        }
      }.onFailure(::completeStart)
    }

    fun stop(context: Context) {
      QaScreenRecorderController.stop()
      context.stopService(Intent(context, QaScreenRecorderService::class.java))
    }

    private fun completeStart(error: Throwable?) {
      startCompletion?.invoke(error)
      startCompletion = null
    }
  }
}

private object QaScreenRecorderController : MediaRecorder.OnInfoListener {
  private val completedSegments = ArrayDeque<File>()
  private var mediaProjection: MediaProjection? = null
  private var virtualDisplay: VirtualDisplay? = null
  private var mediaRecorder: MediaRecorder? = null
  private var activeSegment: File? = null
  private var pendingSegment: File? = null
  private var recorderContext: Context? = null
  private var cacheDir: File? = null
  private var videoWidth = 0
  private var videoHeight = 0
  private var densityDpi = 0
  private var stopping = false

  val isRecording: Boolean
    get() = mediaRecorder != null

  fun start(context: Context, resultCode: Int, resultData: Intent, onProjectionStopped: () -> Unit) {
    if (isRecording) return

    recorderContext = context.applicationContext
    cacheDir = context.cacheDir
    val metrics = context.resources.displayMetrics
    val scale = min(1.0, MAX_VIDEO_DIMENSION.toDouble() / max(metrics.widthPixels, metrics.heightPixels))
    videoWidth = ((metrics.widthPixels * scale).roundToInt() / 2 * 2).coerceAtLeast(2)
    videoHeight = ((metrics.heightPixels * scale).roundToInt() / 2 * 2).coerceAtLeast(2)
    densityDpi = metrics.densityDpi

    val manager = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
    mediaProjection = requireNotNull(manager.getMediaProjection(resultCode, resultData))
    mediaProjection?.registerCallback(
      object : MediaProjection.Callback() {
        override fun onStop() {
          if (stopping) return
          release(deleteSegments = true, stopProjection = false)
          onProjectionStopped()
        }
      },
      Handler(Looper.getMainLooper()),
    )

    val recorder = prepareRecorder(context)
    virtualDisplay = mediaProjection?.createVirtualDisplay(
      "qa-screen-recorder",
      videoWidth,
      videoHeight,
      densityDpi,
      DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
      recorder.surface,
      null,
      Handler(Looper.getMainLooper()),
    )
    recorder.start()
    mediaRecorder = recorder
  }

  fun snapshotAndRestart(): List<File> {
    check(isRecording) { "Screen recording has not started" }
    finishActiveSegment()

    val snapshot = completedSegments.toList()
    completedSegments.clear()
    check(snapshot.isNotEmpty()) { "No screen recording samples are available" }

    try {
      val context = requireNotNull(recorderContext)
      val recorder = prepareRecorder(context)
      virtualDisplay?.surface = recorder.surface
      recorder.start()
      mediaRecorder = recorder
    } catch (error: Throwable) {
      snapshot.forEach(File::delete)
      release(deleteSegments = true, stopProjection = true)
      throw error
    }
    return snapshot
  }

  fun stop() {
    if (mediaProjection == null && mediaRecorder == null) return
    release(deleteSegments = true, stopProjection = true)
  }

  override fun onInfo(recorder: MediaRecorder, what: Int, extra: Int) {
    if (recorder !== mediaRecorder) return
    when (what) {
      MediaRecorder.MEDIA_RECORDER_INFO_MAX_FILESIZE_APPROACHING -> {
        if (pendingSegment != null) return
        val next = newSegmentFile()
        runCatching { recorder.setNextOutputFile(next) }
          .onSuccess { pendingSegment = next }
          .onFailure { next.delete() }
      }

      MediaRecorder.MEDIA_RECORDER_INFO_NEXT_OUTPUT_FILE_STARTED -> {
        activeSegment?.let(completedSegments::addLast)
        activeSegment = pendingSegment
        pendingSegment = null
        while (completedSegments.size > MAX_COMPLETED_SEGMENTS) {
          completedSegments.removeFirst().delete()
        }
      }
    }
  }

  private fun prepareRecorder(context: Context): MediaRecorder {
    val output = newSegmentFile()
    val recorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      MediaRecorder(context)
    } else {
      @Suppress("DEPRECATION")
      MediaRecorder()
    }

    recorder.setVideoSource(MediaRecorder.VideoSource.SURFACE)
    recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
    recorder.setVideoEncoder(MediaRecorder.VideoEncoder.H264)
    recorder.setVideoSize(videoWidth, videoHeight)
    recorder.setVideoFrameRate(VIDEO_FRAME_RATE)
    recorder.setVideoEncodingBitRate(VIDEO_BIT_RATE)
    recorder.setMaxFileSize(SEGMENT_MAX_BYTES)
    recorder.setOutputFile(output.absolutePath)
    recorder.setOnInfoListener(this)
    recorder.prepare()
    activeSegment = output
    return recorder
  }

  private fun finishActiveSegment() {
    val recorder = mediaRecorder ?: return
    recorder.setOnInfoListener(null)
    mediaRecorder = null
    runCatching { recorder.stop() }
      .onSuccess {
        activeSegment?.takeIf { it.length() > 0L }?.let(completedSegments::addLast)
      }
      .onFailure { activeSegment?.delete() }
    recorder.release()
    activeSegment = null
    pendingSegment?.delete()
    pendingSegment = null
  }

  private fun release(deleteSegments: Boolean, stopProjection: Boolean) {
    stopping = true
    finishActiveSegment()
    virtualDisplay?.release()
    virtualDisplay = null
    if (stopProjection) mediaProjection?.stop()
    mediaProjection = null
    recorderContext = null
    cacheDir = null
    stopping = false

    if (deleteSegments) completedSegments.forEach(File::delete)
    completedSegments.clear()
  }

  private fun newSegmentFile() = File(
    requireNotNull(cacheDir),
    "qa-segment-${UUID.randomUUID()}.mp4",
  )
}

private data class Segment(
  val file: File,
  val durationUs: Long,
  val videoTrack: Int,
  val format: MediaFormat,
)

private fun writeLastClip(files: List<File>, output: File) {
  val segments = files.mapNotNull(::readSegment)
  check(segments.isNotEmpty()) { "Recorded video has no readable segments" }

  var selectedDurationUs = 0L
  var firstIndex = segments.lastIndex
  while (firstIndex >= 0 && selectedDurationUs < CLIP_DURATION_US) {
    selectedDurationUs += segments[firstIndex].durationUs
    firstIndex--
  }
  val selected = segments.subList(firstIndex + 1, segments.size)
  val firstSkipUs = max(0L, selectedDurationUs - CLIP_DURATION_US)
  val muxer = MediaMuxer(output.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
  var started = false

  try {
    val outputTrack = muxer.addTrack(selected.first().format)
    muxer.start()
    started = true

    val bufferSize = selected.maxOf {
      if (it.format.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) {
        it.format.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE)
      } else {
        1_048_576
      }
    }.coerceAtLeast(1_048_576)
    val buffer = ByteBuffer.allocate(bufferSize)
    val info = MediaCodec.BufferInfo()
    var outputOffsetUs = 0L

    selected.forEachIndexed { index, segment ->
      val extractor = MediaExtractor()
      try {
        extractor.setDataSource(segment.file.absolutePath)
        extractor.selectTrack(segment.videoTrack)
        extractor.seekTo(
          if (index == 0) firstSkipUs else 0L,
          MediaExtractor.SEEK_TO_PREVIOUS_SYNC,
        )
        val segmentStartUs = extractor.sampleTime.takeIf { it >= 0L } ?: return@forEachIndexed
        var lastOutputTimeUs = outputOffsetUs

        while (true) {
          buffer.clear()
          val size = extractor.readSampleData(buffer, 0)
          val sampleTimeUs = extractor.sampleTime
          if (size < 0 || sampleTimeUs < 0) break

          info.set(
            0,
            size,
            outputOffsetUs + sampleTimeUs - segmentStartUs,
            extractor.sampleFlags,
          )
          muxer.writeSampleData(outputTrack, buffer, info)
          lastOutputTimeUs = info.presentationTimeUs
          extractor.advance()
        }
        outputOffsetUs = lastOutputTimeUs + 1_000_000L / VIDEO_FRAME_RATE
      } finally {
        extractor.release()
      }
    }
  } catch (error: Throwable) {
    output.delete()
    throw error
  } finally {
    if (started) muxer.stop()
    muxer.release()
  }
}

private fun readSegment(file: File): Segment? {
  if (!file.isFile || file.length() == 0L) return null
  val extractor = MediaExtractor()
  return try {
    extractor.setDataSource(file.absolutePath)
    val videoTrack = (0 until extractor.trackCount).firstOrNull { index ->
      extractor.getTrackFormat(index).getString(MediaFormat.KEY_MIME)?.startsWith("video/") == true
    } ?: return null
    val format = extractor.getTrackFormat(videoTrack)
    val duration = format.getLong(MediaFormat.KEY_DURATION)
    if (duration <= 0L) null else Segment(file, duration, videoTrack, format)
  } finally {
    extractor.release()
  }
}

private class ScreenRecordingUnavailableException(message: String?, cause: Throwable? = null) :
  CodedException(message, cause)

private class ScreenRecordingBusyException : CodedException("Screen recording request is pending")

private class ScreenRecordingPermissionDeniedException :
  CodedException("Screen recording permission was denied")

private class ScreenRecordingInterruptedException : CodedException("Screen recording was interrupted")

private class InvalidVideoUrlException : CodedException("Video URI must be a local file URL")

private class VideoTooLargeException : CodedException("QA video is larger than the upload limit")
