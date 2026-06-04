import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CameraView, useCameraPermissions, PermissionStatus } from "expo-camera";
import { useScanStore } from "../../stores/scanStore";

export default function ScanScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);

  const { status, setCaptured, reset } = useScanStore();

  // Request camera permission on mount (state: not-yet-asked).
  // useCameraPermissions() returns null while the permission status is loading —
  // wait for it before rendering any permission-dependent UI.
  useEffect(() => {
    if (permission && permission.status === PermissionStatus.UNDETERMINED) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Reset scan state when the screen mounts so a fresh preview is always shown.
  useEffect(() => {
    reset();
  }, [reset]);

  async function handleCapture() {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      if (photo?.uri) {
        setCaptured(photo.uri);
        // TODO (Task 7): pass photo.uri to OCR service here
        console.log("[ScanScreen] captured:", photo.uri);
      }
    } catch (e) {
      console.warn("[ScanScreen] capture failed:", e);
    } finally {
      setIsCapturing(false);
    }
  }

  // ── Permission loading ───────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#6858e9" />
      </View>
    );
  }

  // ── Permission denied (can still request again) ──────────────────────────────
  if (permission.status === PermissionStatus.DENIED && permission.canAskAgain) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionSubtitle}>
          Context Lens needs the camera to capture book pages.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Permission permanently denied (must open Settings) ──────────────────────
  if (permission.status === PermissionStatus.DENIED && !permission.canAskAgain) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.permissionTitle}>Camera access blocked</Text>
        <Text style={styles.permissionSubtitle}>
          Camera permission was denied. Enable it in Settings to continue.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.permissionButtonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Captured state: show confirmation before OCR runs ───────────────────────
  if (status === "captured" || status === "extracting") {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#6858e9" />
        <Text style={styles.processingText}>
          {status === "extracting" ? "Extracting text…" : "Photo captured"}
        </Text>
        <TouchableOpacity style={styles.retakeButton} onPress={reset}>
          <Text style={styles.retakeButtonText}>Retake</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Camera preview ───────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      />

      {/* Capture button — centred at the bottom */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
          onPress={handleCapture}
          disabled={isCapturing}
          accessibilityLabel="Capture book page"
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  controls: {
    position: "absolute",
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#fff",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#fff",
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 12,
    textAlign: "center",
  },
  permissionSubtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: "#6858e9",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#555",
  },
  retakeButton: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#6858e9",
  },
  retakeButtonText: {
    color: "#6858e9",
    fontWeight: "600",
    fontSize: 15,
  },
});
