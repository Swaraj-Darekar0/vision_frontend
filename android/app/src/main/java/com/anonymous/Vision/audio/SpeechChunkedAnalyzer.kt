package com.anonymous.Vision.audio

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

internal class SpeechChunkedAnalyzer(
  private val sampleRate: Int,
  private val analysisStartedAtMs: Long
) {
  private val frameLength = max(1, (sampleRate * FRAME_LENGTH_MS) / 1000)
  private val hopLength = max(1, (sampleRate * HOP_LENGTH_MS) / 1000)
  private val analysisBuffer = ArrayList<Float>(frameLength * 2)
  private val energyStats = RunningStats()
  private val pitchStats = RunningStats()
  private val windowAccumulators = linkedMapOf<Int, WindowAccumulator>()

  private var nextFrameStartSample = 0L
  private var totalSamplesReceived = 0L
  private var totalFrames = 0
  private var pauseFrames = 0
  private var voicedFrames = 0
  private var skippedUnvoicedFrames = 0
  private var jitterDiffSum = 0.0
  private var jitterDiffCount = 0
  private var lastVoicedF0: Double? = null

  fun processSamples(samples: FloatArray) {
    if (samples.isEmpty()) {
      return
    }

    totalSamplesReceived += samples.size.toLong()

    val combined = FloatArray(analysisBuffer.size + samples.size)
    for (index in analysisBuffer.indices) {
      combined[index] = analysisBuffer[index]
    }
    for (index in samples.indices) {
      combined[analysisBuffer.size + index] = samples[index]
    }

    var frameStart = 0
    while (frameStart + frameLength <= combined.size) {
      processFrame(combined, frameStart)
      frameStart += hopLength
      nextFrameStartSample += hopLength.toLong()
    }

    analysisBuffer.clear()
    for (index in frameStart until combined.size) {
      analysisBuffer.add(combined[index])
    }
  }

  fun getProcessedDurationSeconds(): Double {
    return totalSamplesReceived.toDouble() / sampleRate.toDouble()
  }

  fun buildResult(): WritableMap {
    val pitchMean = pitchStats.mean
    val pitchVarianceRaw = if (pitchStats.count > 1 && pitchMean > EPSILON) {
      pitchStats.standardDeviation / pitchMean
    } else {
      0.0
    }
    val jitterRaw = if (jitterDiffCount > 0 && pitchMean > EPSILON) {
      (jitterDiffSum / jitterDiffCount.toDouble()) / pitchMean
    } else {
      0.0
    }
    val energyVariationRaw = if (energyStats.count > 1 && energyStats.mean > EPSILON) {
      energyStats.standardDeviation / energyStats.mean
    } else {
      0.0
    }
    val pauseRatio = if (totalFrames > 0) {
      pauseFrames.toDouble() / totalFrames.toDouble()
    } else {
      0.0
    }

    val result = Arguments.createMap()
    result.putDouble("sample_rate", sampleRate.toDouble())
    result.putDouble("duration_seconds", getProcessedDurationSeconds())
    result.putDouble("pitch_variance_raw", pitchVarianceRaw)
    result.putDouble(
      "pitch_variance_normalized",
      clamp01((pitchVarianceRaw - PITCH_VARIANCE_MIN) / (PITCH_VARIANCE_MAX - PITCH_VARIANCE_MIN))
    )
    result.putDouble("jitter_raw", jitterRaw)
    result.putDouble("jitter_normalized", clamp01(jitterRaw / JITTER_THRESHOLD))
    result.putDouble("energy_variation_raw", energyVariationRaw)
    result.putDouble("energy_variation_normalized", clamp01(energyVariationRaw / ENERGY_VARIATION_THRESHOLD))
    result.putDouble("pause_ratio", clamp01(pauseRatio))
    result.putArray("acoustic_windows", buildWindowsArray())
    result.putMap("debug_stats", buildDebugStats())
    return result
  }

  private fun processFrame(samples: FloatArray, frameStart: Int) {
    totalFrames += 1

    val frameRms = computeRms(samples, frameStart, frameLength)
    val isPauseFrame = frameRms < PAUSE_RMS_THRESHOLD
    if (isPauseFrame) {
      pauseFrames += 1
    }
    energyStats.add(frameRms)

    val frameTimeSeconds = nextFrameStartSample.toDouble() / sampleRate.toDouble()
    val windowIndex = floor(frameTimeSeconds / WINDOW_SIZE_SECONDS).toInt()
    val window = windowAccumulators.getOrPut(windowIndex) { WindowAccumulator(windowIndex) }
    window.addFrame(frameRms, isPauseFrame)

    if (!isVoicedCandidate(samples, frameStart, frameLength, frameRms)) {
      skippedUnvoicedFrames += 1
      return
    }

    val pitch = estimatePitch(samples, frameStart, frameLength) ?: run {
      skippedUnvoicedFrames += 1
      return
    }

    voicedFrames += 1
    pitchStats.add(pitch)
    window.addPitch(pitch)

    val previousPitch = lastVoicedF0
    if (previousPitch != null) {
      jitterDiffSum += abs(pitch - previousPitch)
      jitterDiffCount += 1
    }
    lastVoicedF0 = pitch
  }

  private fun estimatePitch(samples: FloatArray, frameStart: Int, frameLength: Int): Double? {
    val minLag = max(2, sampleRate / MAX_F0_HZ)
    val maxLag = min(frameLength - 2, sampleRate / MIN_F0_HZ)
    if (maxLag <= minLag) {
      return null
    }

    val yinWindowLength = frameLength - maxLag - 1
    if (yinWindowLength <= 8) {
      return null
    }

    val diff = DoubleArray(maxLag + 1)
    for (lag in minLag..maxLag) {
      var difference = 0.0
      for (offset in 0 until yinWindowLength) {
        val delta = samples[frameStart + offset] - samples[frameStart + offset + lag]
        difference += delta * delta
      }
      diff[lag] = difference
    }

    val cmnd = DoubleArray(maxLag + 1)
    cmnd[minLag] = 1.0
    var runningSum = 0.0
    for (lag in (minLag + 1)..maxLag) {
      runningSum += diff[lag]
      cmnd[lag] = if (runningSum <= EPSILON) {
        1.0
      } else {
        diff[lag] * (lag - minLag).toDouble() / runningSum
      }
    }

    var selectedLag = -1
    var bestScore = Double.MAX_VALUE
    var lag = minLag
    while (lag <= maxLag) {
      val score = cmnd[lag]
      if (score < YIN_THRESHOLD) {
        selectedLag = lag
        while (selectedLag + 1 <= maxLag && cmnd[selectedLag + 1] < score) {
          selectedLag += 1
        }
        break
      }
      if (score < bestScore) {
        bestScore = score
        selectedLag = lag
      }
      lag += LAG_STEP
    }

    if (selectedLag <= 0) {
      return null
    }

    val confidence = 1.0 - cmnd[selectedLag].coerceIn(0.0, 1.0)
    if (confidence < MIN_PITCH_CONFIDENCE) {
      return null
    }

    return sampleRate.toDouble() / selectedLag.toDouble()
  }

  private fun isVoicedCandidate(
    samples: FloatArray,
    frameStart: Int,
    frameLength: Int,
    frameRms: Double
  ): Boolean {
    if (frameRms < VOICED_RMS_THRESHOLD) {
      return false
    }

    val zeroCrossingRate = computeZeroCrossingRate(samples, frameStart, frameLength)
    return zeroCrossingRate in MIN_ZERO_CROSSING_RATE..MAX_ZERO_CROSSING_RATE
  }

  private fun computeRms(samples: FloatArray, frameStart: Int, frameLength: Int): Double {
    var sumSquares = 0.0
    for (offset in 0 until frameLength) {
      val sample = samples[frameStart + offset].toDouble()
      sumSquares += sample * sample
    }
    return sqrt(sumSquares / frameLength.toDouble())
  }

  private fun computeZeroCrossingRate(samples: FloatArray, frameStart: Int, frameLength: Int): Double {
    var crossings = 0
    for (offset in 1 until frameLength) {
      val previous = samples[frameStart + offset - 1]
      val current = samples[frameStart + offset]
      if ((previous >= 0f && current < 0f) || (previous < 0f && current >= 0f)) {
        crossings += 1
      }
    }
    return crossings.toDouble() / frameLength.toDouble()
  }

  private fun buildWindowsArray(): WritableArray {
    val array = Arguments.createArray()
    windowAccumulators.values.forEach { window ->
      array.pushMap(window.toWritableMap())
    }
    return array
  }

  private fun buildDebugStats(): WritableMap {
    val debug = Arguments.createMap()
    debug.putDouble("analysis_duration_ms", (System.currentTimeMillis() - analysisStartedAtMs).toDouble())
    debug.putDouble("analyzed_frames", totalFrames.toDouble())
    debug.putDouble("voiced_frames", voicedFrames.toDouble())
    debug.putDouble("skipped_unvoiced_frames", skippedUnvoicedFrames.toDouble())
    debug.putDouble("decoded_duration_seconds", getProcessedDurationSeconds())
    return debug
  }

  private fun clamp01(value: Double): Double = min(1.0, max(0.0, value))

  private class RunningStats {
    var count: Int = 0
      private set
    var mean: Double = 0.0
      private set
    private var m2: Double = 0.0

    val standardDeviation: Double
      get() = if (count <= 1) 0.0 else sqrt(m2 / count.toDouble())

    fun add(value: Double) {
      count += 1
      val delta = value - mean
      mean += delta / count.toDouble()
      val delta2 = value - mean
      m2 += delta * delta2
    }
  }

  private class WindowAccumulator(
    private val windowIndex: Int
  ) {
    private val pitchStats = RunningStats()
    private var frameCount = 0
    private var pauseCount = 0

    fun addFrame(rms: Double, isPauseFrame: Boolean) {
      frameCount += 1
      if (isPauseFrame || rms < PAUSE_RMS_THRESHOLD) {
        pauseCount += 1
      }
    }

    fun addPitch(pitch: Double) {
      pitchStats.add(pitch)
    }

    fun toWritableMap(): WritableMap {
      val map = Arguments.createMap()
      val pitchVarianceRaw = if (pitchStats.count > 1 && pitchStats.mean > EPSILON) {
        pitchStats.standardDeviation / pitchStats.mean
      } else {
        0.0
      }
      val pauseRatio = if (frameCount > 0) {
        pauseCount.toDouble() / frameCount.toDouble()
      } else {
        0.0
      }

      map.putDouble("window_index", windowIndex.toDouble())
      map.putDouble("time_start", windowIndex * WINDOW_SIZE_SECONDS)
      map.putDouble("time_end", (windowIndex + 1) * WINDOW_SIZE_SECONDS)
      map.putDouble(
        "pitch_variance_normalized",
        min(
          1.0,
          max(0.0, (pitchVarianceRaw - PITCH_VARIANCE_MIN) / (PITCH_VARIANCE_MAX - PITCH_VARIANCE_MIN))
        )
      )
      map.putDouble("pause_ratio", min(1.0, max(0.0, pauseRatio)))
      return map
    }
  }

  companion object {
    private const val EPSILON = 1e-8
    private const val FRAME_LENGTH_MS = 25
    private const val HOP_LENGTH_MS = 10
    private const val WINDOW_SIZE_SECONDS = 5.0
    private const val MIN_F0_HZ = 75
    private const val MAX_F0_HZ = 300
    private const val LAG_STEP = 2
    private const val YIN_THRESHOLD = 0.18
    private const val MIN_PITCH_CONFIDENCE = 0.60
    private const val PITCH_VARIANCE_MIN = 0.05
    private const val PITCH_VARIANCE_MAX = 0.50
    private const val JITTER_THRESHOLD = 0.02
    private const val ENERGY_VARIATION_THRESHOLD = 0.1
    private const val PAUSE_RMS_THRESHOLD = 0.01
    private const val VOICED_RMS_THRESHOLD = 0.015
    private const val MIN_ZERO_CROSSING_RATE = 0.01
    private const val MAX_ZERO_CROSSING_RATE = 0.30
  }
}
