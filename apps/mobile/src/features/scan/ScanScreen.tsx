import { useEffect } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  launchCameraAsync,
  useCameraPermissions,
  PermissionStatus,
} from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/RootNavigator";
import { useScanStore } from "../../stores/scanStore";
import { extractAndNormalize } from "../../services/ocr";

type ScanNavProp = NativeStackNavigationProp<RootStackParamList, "Scan">;

export default function ScanScreen() {
  const navigation = useNavigation<ScanNavProp>();
  const [permission, requestPermission] = useCameraPermissions();

  const {
    status,
    normalizedText,
    ocrError,
    bookTitleHint,
    setCaptured,
    setExtracting,
    setExtracted,
    setOcrError,
    setBookTitleHint,
    analyze,
    reset,
  } = useScanStore();

  // Reset scan state on mount so a fresh capture flow is always shown.
  useEffect(() => {
    reset();
  }, [reset]);

  async function handleCapture() {
    // Ensure camera permission before launching the native camera.
    if (!permission || permission.status !== PermissionStatus.GRANTED) {
      const result = await requestPermission();
      if (result.status !== PermissionStatus.GRANTED) return;
    }

    // Launch the native iOS camera — full resolution, autofocus, optimized exposure.
    // allowsEditing lets the user crop tightly to the text before OCR, which is the single
    // biggest practical accuracy boost: Vision performs far better when the frame is mostly text.
    const result = await launchCameraAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsEditing: true,
      exif: false,
    });
    if (result.canceled) return;

    const uri = result.assets?.at(0)?.uri;
    if (!uri) return;

    setCaptured(uri);
    setExtracting();
    try {
      const { normalizedText, rawText } = await extractAndNormalize(uri);
      setExtracted(rawText, normalizedText);
      console.log("[OCR] ───── RAW TEXT ─────\n" + rawText);
      console.log("[OCR] ───── NORMALIZED ─────\n" + normalizedText);
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message ?? "Text extraction failed.";
      setOcrError(msg);
    }
  }

  // ── Permission permanently denied (must open Settings) ──────────────────────
  if (permission && permission.status === PermissionStatus.DENIED && !permission.canAskAgain) {
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

  // ── OCR error state ──────────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <View style={styles.centeredContainer}>
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{ocrError ?? "Text extraction failed."}</Text>
        </View>
        <TouchableOpacity style={styles.retakeButton} onPress={reset}>
          <Text style={styles.retakeButtonText}>Retake</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Extracted: show text preview + Retake / Continue ────────────────────────
  if (status === "extracted" && normalizedText) {
    return (
      <View style={styles.extractedContainer}>
        <Text style={styles.extractedHeading}>Extracted text</Text>
        <ScrollView
          style={styles.textScroll}
          contentContainerStyle={styles.textScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.extractedText}>{normalizedText}</Text>
        </ScrollView>
        <Text style={styles.inputLabel}>Book title</Text>
        <TextInput
          style={styles.titleInput}
          placeholder="Optional, helps improve context"
          placeholderTextColor="#999"
          value={bookTitleHint}
          onChangeText={setBookTitleHint}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
        />
        <View style={styles.extractedActions}>
          <TouchableOpacity style={styles.retakeButton} onPress={reset}>
            <Text style={styles.retakeButtonText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => {
              // Kick off analysis and move to the Reader, which renders the
              // loading / result / error states from the store.
              void analyze();
              navigation.navigate("Reader");
            }}
          >
            <Text style={styles.continueButtonText}>Analyze →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Extracting ───────────────────────────────────────────────────────────────
  if (status === "captured" || status === "extracting") {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#6858e9" />
        <Text style={styles.processingText}>
          {status === "extracting" ? "Extracting text…" : "Processing…"}
        </Text>
        <TouchableOpacity style={styles.retakeButton} onPress={reset}>
          <Text style={styles.retakeButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Idle: prompt to capture ──────────────────────────────────────────────────
  return (
    <View style={styles.centeredContainer}>
      <Text style={styles.title}>Capture a passage</Text>
      <Text style={styles.subtitle}>
        Point your camera at a book page and take a clear, well-lit photo.
      </Text>
      <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
        <Text style={styles.captureButtonText}>Capture Book Page</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 36,
  },
  captureButton: {
    backgroundColor: "#6858e9",
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 12,
  },
  captureButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 17,
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
  errorBanner: {
    width: "100%",
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#FFF3E0",
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    color: "#E65100",
    fontWeight: "500",
  },
  // ── Extracted state ──────────────────────────────────────────────────────────
  extractedContainer: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  extractedHeading: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6858e9",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  textScroll: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#F7F6FF",
    marginBottom: 14,
  },
  textScrollContent: {
    padding: 16,
  },
  extractedText: {
    fontSize: 16,
    color: "#222",
    lineHeight: 26,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6858e9",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  titleInput: {
    borderWidth: 1.5,
    borderColor: "#dedbf9",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#222",
    marginBottom: 18,
  },
  extractedActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  continueButton: {
    flex: 1,
    backgroundColor: "#6858e9",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  continueButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
