package com.anonymous.Vision.mlkit

import androidx.annotation.OptIn
import androidx.camera.core.ExperimentalGetImage
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.pose.Pose
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.PoseLandmark
import com.google.mlkit.vision.pose.PoseDetector
import com.google.mlkit.vision.pose.defaults.PoseDetectorOptions
import com.mrousavy.camera.frameprocessors.Frame
import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin
import kotlin.math.max
import kotlin.math.min

@OptIn(ExperimentalGetImage::class)
class MLKitPoseFrameProcessorPlugin : FrameProcessorPlugin() {
  private val detector: PoseDetector =
    PoseDetection.getClient(
      PoseDetectorOptions.Builder()
        .setDetectorMode(PoseDetectorOptions.STREAM_MODE)
        .build()
    )

  override fun callback(frame: Frame, params: MutableMap<String, Any>?): Any {
    val imageProxy = frame.imageProxy
    val inputImage = InputImage.fromMediaImage(frame.image, imageProxy.imageInfo.rotationDegrees)
    val rotationDegrees = imageProxy.imageInfo.rotationDegrees
    val isRotated = rotationDegrees == 90 || rotationDegrees == 270
    val effectiveWidth = if (isRotated) frame.height.toDouble() else frame.width.toDouble()
    val effectiveHeight = if (isRotated) frame.width.toDouble() else frame.height.toDouble()
    val maxDimension = max(effectiveWidth, effectiveHeight).coerceAtLeast(1.0)

    val pose = Tasks.await(detector.process(inputImage))
    val landmarks = ArrayList<Map<String, Double>>(LANDMARK_TYPES.size)
    var poseDetected = false

    for (landmarkType in LANDMARK_TYPES) {
      val landmark = pose.getPoseLandmark(landmarkType)
      val normalized = normalizeLandmark(landmark, effectiveWidth, effectiveHeight, maxDimension)
      if ((normalized["visibility"] ?: 0.0) > 0.0) {
        poseDetected = true
      }
      landmarks.add(normalized)
    }

    return hashMapOf(
      "poseDetected" to poseDetected,
      "landmarks" to landmarks
    )
  }

  private fun normalizeLandmark(
    landmark: PoseLandmark?,
    width: Double,
    height: Double,
    maxDimension: Double
  ): Map<String, Double> {
    if (landmark == null) {
      return emptyLandmark()
    }

    val point = landmark.position
    val x = clamp(point.x.toDouble() / width)
    val y = clamp(point.y.toDouble() / height)
    val z = try {
      val position3D = landmark.position3D
      (position3D.z.toDouble() / maxDimension).coerceIn(-1.0, 1.0)
    } catch (_: Throwable) {
      0.0
    }

    return hashMapOf(
      "x" to x,
      "y" to y,
      "z" to z,
      "visibility" to clamp(landmark.inFrameLikelihood.toDouble())
    )
  }

  private fun emptyLandmark(): Map<String, Double> =
    hashMapOf(
      "x" to 0.0,
      "y" to 0.0,
      "z" to 0.0,
      "visibility" to 0.0
    )

  private fun clamp(value: Double): Double = min(1.0, max(0.0, value))

  companion object {
    val LANDMARK_TYPES = intArrayOf(
      PoseLandmark.NOSE,
      PoseLandmark.LEFT_EYE_INNER,
      PoseLandmark.LEFT_EYE,
      PoseLandmark.LEFT_EYE_OUTER,
      PoseLandmark.RIGHT_EYE_INNER,
      PoseLandmark.RIGHT_EYE,
      PoseLandmark.RIGHT_EYE_OUTER,
      PoseLandmark.LEFT_EAR,
      PoseLandmark.RIGHT_EAR,
      PoseLandmark.LEFT_MOUTH,
      PoseLandmark.RIGHT_MOUTH,
      PoseLandmark.LEFT_SHOULDER,
      PoseLandmark.RIGHT_SHOULDER,
      PoseLandmark.LEFT_ELBOW,
      PoseLandmark.RIGHT_ELBOW,
      PoseLandmark.LEFT_WRIST,
      PoseLandmark.RIGHT_WRIST,
      PoseLandmark.LEFT_PINKY,
      PoseLandmark.RIGHT_PINKY,
      PoseLandmark.LEFT_INDEX,
      PoseLandmark.RIGHT_INDEX,
      PoseLandmark.LEFT_THUMB,
      PoseLandmark.RIGHT_THUMB,
      PoseLandmark.LEFT_HIP,
      PoseLandmark.RIGHT_HIP,
      PoseLandmark.LEFT_KNEE,
      PoseLandmark.RIGHT_KNEE,
      PoseLandmark.LEFT_ANKLE,
      PoseLandmark.RIGHT_ANKLE,
      PoseLandmark.LEFT_HEEL,
      PoseLandmark.RIGHT_HEEL,
      PoseLandmark.LEFT_FOOT_INDEX,
      PoseLandmark.RIGHT_FOOT_INDEX,
    )
  }
}
