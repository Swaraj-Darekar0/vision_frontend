package com.anonymous.Vision.audio

import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.nio.ByteBuffer
import kotlin.math.max
import kotlin.math.min

class DeviceAudioAnalysisModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  @ReactMethod
  fun analyzeAudioFile(uriString: String, promise: Promise) {
    try {
      emitProgress("decoding_audio", 0.05)
      val metrics = analyzeInternal(uriString)
      emitProgress("finalizing_metrics", 1.0)
      promise.resolve(metrics)
    } catch (error: Throwable) {
      promise.reject("audio_analysis_failed", error.message, error)
    }
  }

  @ReactMethod
  fun addListener(eventName: String) {
    // Required for NativeEventEmitter on React Native.
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Required for NativeEventEmitter on React Native.
  }

  private fun analyzeInternal(uriString: String): WritableMap {
    val context = reactApplicationContext
    val uri = Uri.parse(uriString)
    val extractor = MediaExtractor()

    try {
      extractor.setDataSource(context, uri, null)

      var audioTrackIndex = -1
      var mediaFormat: MediaFormat? = null
      for (index in 0 until extractor.trackCount) {
        val format = extractor.getTrackFormat(index)
        val mime = format.getString(MediaFormat.KEY_MIME) ?: continue
        if (mime.startsWith("audio/")) {
          audioTrackIndex = index
          mediaFormat = format
          break
        }
      }

      if (audioTrackIndex < 0 || mediaFormat == null) {
        throw IllegalStateException("No audio track found in recording.")
      }

      extractor.selectTrack(audioTrackIndex)

      val mime = mediaFormat.getString(MediaFormat.KEY_MIME)
        ?: throw IllegalStateException("Audio MIME type missing.")
      val codec = MediaCodec.createDecoderByType(mime)
      codec.configure(mediaFormat, null, null, 0)
      codec.start()

      val bufferInfo = MediaCodec.BufferInfo()
      var inputDone = false
      var outputDone = false
      var outputSampleRate = mediaFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE)
      var outputChannelCount = mediaFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
      val estimatedDurationUs = if (mediaFormat.containsKey(MediaFormat.KEY_DURATION)) {
        mediaFormat.getLong(MediaFormat.KEY_DURATION)
      } else {
        0L
      }
      var analyzedChunkCount = 0
      val analyzer = SpeechChunkedAnalyzer(TARGET_SAMPLE_RATE, System.currentTimeMillis())
      val loopStartedAtMs = System.currentTimeMillis()
      var stalledLoopCount = 0

      while (!outputDone) {
        enforceTimeBudget(loopStartedAtMs)

        var loopMadeProgress = false

        if (!inputDone) {
          enforceTimeBudget(loopStartedAtMs)
          val inputBufferIndex = codec.dequeueInputBuffer(TIMEOUT_US)
          enforceTimeBudget(loopStartedAtMs)
          if (inputBufferIndex >= 0) {
            loopMadeProgress = true
            val inputBuffer = codec.getInputBuffer(inputBufferIndex)
            if (inputBuffer == null) {
              codec.queueInputBuffer(inputBufferIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
              inputDone = true
            } else {
              val sampleSize = extractor.readSampleData(inputBuffer, 0)
              if (sampleSize < 0) {
                codec.queueInputBuffer(inputBufferIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                inputDone = true
              } else {
                val presentationTimeUs = extractor.sampleTime
                codec.queueInputBuffer(inputBufferIndex, 0, sampleSize, presentationTimeUs, 0)
                extractor.advance()
              }
            }
          }
        }

        enforceTimeBudget(loopStartedAtMs)
        val outputBufferIndex = codec.dequeueOutputBuffer(bufferInfo, TIMEOUT_US)
        enforceTimeBudget(loopStartedAtMs)
        when {
          outputBufferIndex >= 0 -> {
            loopMadeProgress = true
            val outputBuffer = codec.getOutputBuffer(outputBufferIndex)
            if (outputBuffer != null && bufferInfo.size > 0) {
              outputBuffer.position(bufferInfo.offset)
              outputBuffer.limit(bufferInfo.offset + bufferInfo.size)
              val monoSamples = decodeMonoSamples(outputBuffer, outputChannelCount)
              val analysisSamples = normalizeSampleRate(monoSamples, outputSampleRate)
              analyzer.processSamples(analysisSamples)
              analyzedChunkCount += 1

              if (analyzedChunkCount == 1 || analyzedChunkCount % CHUNK_PROGRESS_INTERVAL == 0) {
                val progress = if (estimatedDurationUs > 0) {
                  analyzer.getProcessedDurationSeconds() / (estimatedDurationUs.toDouble() / 1_000_000.0)
                } else {
                  0.0
                }
                emitProgress("analyzing_chunks", progress.coerceIn(0.05, 0.92))
              }
            }

            codec.releaseOutputBuffer(outputBufferIndex, false)
            if ((bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
              outputDone = true
            }
          }
          outputBufferIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
            loopMadeProgress = true
            val outputFormat = codec.outputFormat
            outputSampleRate = outputFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            outputChannelCount = outputFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
          }
        }

        if (loopMadeProgress) {
          stalledLoopCount = 0
        } else {
          stalledLoopCount += 1
          if (stalledLoopCount >= MAX_STALLED_LOOPS) {
            throw IllegalStateException("Audio analysis stalled while waiting for codec buffers.")
          }
        }
      }

      codec.stop()
      codec.release()

      if (analyzer.getProcessedDurationSeconds() <= 0.0) {
        throw IllegalStateException("Decoded audio did not produce analyzable PCM samples.")
      }

      emitProgress("building_windows", 0.95)
      return analyzer.buildResult()
    } finally {
      extractor.release()
    }
  }

  private fun decodeMonoSamples(buffer: ByteBuffer, channelCount: Int): FloatArray {
    val safeChannels = max(1, channelCount)
    val samples = ArrayList<Float>(max(128, buffer.remaining() / (2 * safeChannels)))
    while (buffer.remaining() >= 2 * safeChannels) {
      var monoSum = 0.0
      for (channel in 0 until safeChannels) {
        monoSum += buffer.short.toDouble() / 32768.0
      }
      samples.add((monoSum / safeChannels).toFloat())
    }
    return FloatArray(samples.size) { index -> samples[index] }
  }

  private fun normalizeSampleRate(samples: FloatArray, sampleRate: Int): FloatArray {
    if (samples.isEmpty() || sampleRate <= 0 || sampleRate == TARGET_SAMPLE_RATE) {
      return samples
    }

    if (sampleRate % TARGET_SAMPLE_RATE == 0) {
      val factor = sampleRate / TARGET_SAMPLE_RATE
      val outputSize = samples.size / factor
      if (outputSize <= 0) {
        return floatArrayOf()
      }
      val downsampled = FloatArray(outputSize)
      var outputIndex = 0
      var inputIndex = 0
      while (outputIndex < outputSize && inputIndex + factor <= samples.size) {
        var sum = 0.0
        for (offset in 0 until factor) {
          sum += samples[inputIndex + offset]
        }
        downsampled[outputIndex] = (sum / factor.toDouble()).toFloat()
        outputIndex += 1
        inputIndex += factor
      }
      return downsampled
    }

    val targetLength = max(1, ((samples.size.toDouble() * TARGET_SAMPLE_RATE.toDouble()) / sampleRate.toDouble()).toInt())
    val resampled = FloatArray(targetLength)
    val scale = sampleRate.toDouble() / TARGET_SAMPLE_RATE.toDouble()
    for (index in 0 until targetLength) {
      val sourcePosition = index * scale
      val leftIndex = sourcePosition.toInt().coerceIn(0, samples.lastIndex)
      val rightIndex = min(samples.lastIndex, leftIndex + 1)
      val fraction = sourcePosition - leftIndex.toDouble()
      val leftValue = samples[leftIndex]
      val rightValue = samples[rightIndex]
      resampled[index] = (leftValue + ((rightValue - leftValue) * fraction)).toFloat()
    }
    return resampled
  }

  private fun emitProgress(stage: String, progress: Double) {
    val params = Arguments.createMap().apply {
      putString("stage", stage)
      putDouble("progress", progress.coerceIn(0.0, 1.0))
    }
    reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(PROGRESS_EVENT_NAME, params)
  }

  private fun enforceTimeBudget(loopStartedAtMs: Long) {
    if (System.currentTimeMillis() - loopStartedAtMs > MAX_ANALYSIS_DURATION_MS) {
      throw IllegalStateException("Audio analysis exceeded the time budget.")
    }
  }

  companion object {
    private const val NAME = "DeviceAudioAnalysis"
    private const val PROGRESS_EVENT_NAME = "DeviceAudioAnalysisProgress"
    private const val TIMEOUT_US = 1_000L
    private const val TARGET_SAMPLE_RATE = 16000
    private const val CHUNK_PROGRESS_INTERVAL = 8
    private const val MAX_ANALYSIS_DURATION_MS = 30_000L
    private const val MAX_STALLED_LOOPS = 350
  }
}
