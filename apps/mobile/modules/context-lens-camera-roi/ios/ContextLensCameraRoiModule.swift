import AVFoundation
import ExpoModulesCore
import UIKit

private final class CameraPreviewNotFoundException: Exception, @unchecked Sendable {
  override var reason: String {
    "The camera preview layer is not available."
  }
}

public final class ContextLensCameraRoiModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ContextLensCameraRoi")

    // Uses AVFoundation's own conversion rather than approximating aspect-fill in JS.
    // This incorporates the preview's current orientation, gravity, and crop offset.
    AsyncFunction("convertPreviewRect") { (viewTag: Int, x: Double, y: Double, width: Double, height: Double) throws -> [String: Double] in
      guard let cameraView: UIView = self.appContext?.findView(withTag: viewTag, ofType: UIView.self),
            let previewLayer = self.findPreviewLayer(in: cameraView.layer) else {
        throw CameraPreviewNotFoundException()
      }

      let layerRect = CGRect(x: x, y: y, width: width, height: height)
      let sensorRect = previewLayer.metadataOutputRectConverted(fromLayerRect: layerRect).standardized
      let visibleSensorRect = previewLayer.metadataOutputRectConverted(fromLayerRect: previewLayer.bounds).standardized
      guard visibleSensorRect.width > 0, visibleSensorRect.height > 0 else {
        throw CameraPreviewNotFoundException()
      }

      // Expo Camera center-crops the saved still image to the preview's aspect ratio.
      // Rebase the sensor-space ROI into that visible crop before JS applies it to
      // the already-cropped photo.
      let visibleNormalized = CGRect(
        x: (sensorRect.minX - visibleSensorRect.minX) / visibleSensorRect.width,
        y: (sensorRect.minY - visibleSensorRect.minY) / visibleSensorRect.height,
        width: sensorRect.width / visibleSensorRect.width,
        height: sensorRect.height / visibleSensorRect.height
      ).standardized

      // AVFoundation metadata coordinates remain landscape-oriented while the app's
      // preview and processed still are portrait. Rotate the visible-local ROI back
      // into the portrait image coordinate system.
      let normalized: CGRect
      if previewLayer.bounds.height >= previewLayer.bounds.width {
        normalized = CGRect(
          x: 1 - visibleNormalized.maxY,
          y: visibleNormalized.minX,
          width: visibleNormalized.height,
          height: visibleNormalized.width
        ).standardized
      } else {
        normalized = visibleNormalized
      }
      return [
        "x": max(0, min(1, normalized.origin.x)),
        "y": max(0, min(1, normalized.origin.y)),
        "width": max(0, min(1, normalized.width)),
        "height": max(0, min(1, normalized.height)),
        "sensorX": sensorRect.origin.x,
        "sensorY": sensorRect.origin.y,
        "sensorWidth": sensorRect.width,
        "sensorHeight": sensorRect.height,
        "visibleSensorX": visibleSensorRect.origin.x,
        "visibleSensorY": visibleSensorRect.origin.y,
        "visibleSensorWidth": visibleSensorRect.width,
        "visibleSensorHeight": visibleSensorRect.height,
        "metadataLocalX": visibleNormalized.origin.x,
        "metadataLocalY": visibleNormalized.origin.y,
        "metadataLocalWidth": visibleNormalized.width,
        "metadataLocalHeight": visibleNormalized.height
      ]
    }
    .runOnQueue(DispatchQueue.main)
  }

  private func findPreviewLayer(in layer: CALayer) -> AVCaptureVideoPreviewLayer? {
    if let previewLayer = layer as? AVCaptureVideoPreviewLayer {
      return previewLayer
    }
    for sublayer in layer.sublayers ?? [] {
      if let previewLayer = findPreviewLayer(in: sublayer) {
        return previewLayer
      }
    }
    return nil
  }
}
