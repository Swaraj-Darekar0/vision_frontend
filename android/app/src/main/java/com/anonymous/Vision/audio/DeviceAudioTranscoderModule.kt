package com.anonymous.Vision.audio

import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMuxer
import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.nio.ByteBuffer
import java.util.UUID
import kotlin.math.max

class DeviceAudioTranscoderModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  @ReactMethod
  fun transcodeForTranscription(uriString: String, promise: Promise) {
    try {
      promise.resolve(extractAudioTrack(uriString))
    } catch (error: Throwable) {
      promise.reject("audio_extract_failed", error.message, error)
    }
  }

  private fun extractAudioTrack(uriString: String) = Arguments.createMap().apply {
    val context = reactApplicationContext
    val uri = Uri.parse(uriString)
    val extractor = MediaExtractor()
    var muxer: MediaMuxer? = null
    var outputPath: String? = null
    var extractionSucceeded = false

    try {
      extractor.setDataSource(context, uri, null)

      var audioTrackIndex = -1
      var inputFormat: MediaFormat? = null
      for (index in 0 until extractor.trackCount) {
        val format = extractor.getTrackFormat(index)
        val mime = format.getString(MediaFormat.KEY_MIME) ?: continue
        if (mime.startsWith("audio/")) {
          audioTrackIndex = index
          inputFormat = format
          break
        }
      }

      if (audioTrackIndex < 0 || inputFormat == null) {
        throw IllegalStateException("No audio track found in recording.")
      }

      val inputMime = inputFormat.getString(MediaFormat.KEY_MIME)
        ?: throw IllegalStateException("Audio MIME type missing.")
      if (!inputMime.contains("mp4a") && !inputMime.contains("aac")) {
        throw IllegalStateException("Audio extraction supports AAC camera tracks only.")
      }

      extractor.selectTrack(audioTrackIndex)

      val outputFile = File(context.cacheDir, "transcription_${UUID.randomUUID()}.m4a")
      outputPath = outputFile.absolutePath
      muxer = MediaMuxer(outputPath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
      val muxerTrackIndex = muxer.addTrack(inputFormat)
      muxer.start()

      val maxInputSize = if (inputFormat.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) {
        inputFormat.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE)
      } else {
        DEFAULT_FALLBACK_BUFFER_SIZE
      }
      val buffer = ByteBuffer.allocateDirect(max(DEFAULT_FALLBACK_BUFFER_SIZE, maxInputSize))
      val info = MediaCodec.BufferInfo()

      while (true) {
        buffer.clear()
        val sampleSize = extractor.readSampleData(buffer, 0)
        if (sampleSize < 0) {
          break
        }

        info.offset = 0
        info.size = sampleSize
        info.presentationTimeUs = extractor.sampleTime
        info.flags = extractor.sampleFlags
        muxer.writeSampleData(muxerTrackIndex, buffer, info)
        extractor.advance()
      }

      putString("uri", "file://$outputPath")
      putString("mimeType", FALLBACK_OUTPUT_MIME_TYPE)
      putString("fileName", File(outputPath).name)
      extractionSucceeded = true
    } finally {
      extractor.release()
      try {
        muxer?.stop()
      } catch (_: Throwable) {
      }
      try {
        muxer?.release()
      } catch (_: Throwable) {
      }
      if (!extractionSucceeded && outputPath != null) {
        File(outputPath).delete()
      }
    }
  }

  companion object {
    private const val NAME = "DeviceAudioTranscoder"
    private const val FALLBACK_OUTPUT_MIME_TYPE = "audio/mp4"
    private const val DEFAULT_FALLBACK_BUFFER_SIZE = 256 * 1024
  }
}
