import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { findNodeHandle } from "react-native";
import { CameraView, PermissionStatus, useCameraPermissions } from "expo-camera";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useScanStore } from "../../stores/scanStore";
import { useLatencyStore } from "../../stores/latencyStore";
import { extractAndNormalize } from "../../services/ocr";
import { colors, radii } from "../../ui/theme";
import PaperScreen from "../../ui/components/PaperScreen";
import CaptureSelectionFrame from "./CaptureSelectionFrame";
import {
  createInitialCaptureFrame,
  getCaptureFrameBounds,
  mapCaptureFrameToImageCrop,
  mapNormalizedRoiToImageCrop,
  type Rect,
  type Size,
} from "./captureFrameLogic";
import { convertPreviewRect } from "../../native/cameraRoi";
import { readerPreviewAuthor, readerPreviewFixture } from "../reader/readerPreviewFixture";

export default function ScanScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const cameraRef = useRef<CameraView>(null);
  const captureInFlight = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [previewSize, setPreviewSize] = useState<Size | null>(null);
  const [selection, setSelection] = useState<Rect | null>(null);
  const {
    status, imageUri, normalizedText, ocrError, bookTitleHint, authorHint,
    setCaptured, setExtracting, setExtracted, setOcrError, setBookTitleHint, setAuthorHint,
    loadPreviewAnalysis, analyze, resetCaptureView,
  } = useScanStore();
  const startCaptureLatency = useLatencyStore((state) => state.startCapture);
  const completeOcrLatency = useLatencyStore((state) => state.completeOcr);
  const resetLatency = useLatencyStore((state) => state.reset);

  useEffect(() => {
    resetCaptureView();
    resetLatency();
  }, [resetCaptureView, resetLatency]);

  function prepareFrame(size: Size) {
    setPreviewSize(size);
    setSelection(createInitialCaptureFrame(size));
  }

  async function ensurePermission() {
    if (permission?.status === PermissionStatus.GRANTED) return true;
    const result = await requestPermission();
    return result.status === PermissionStatus.GRANTED;
  }

  async function handleCapture() {
    if (captureInFlight.current || !(await ensurePermission()) || !cameraRef.current || !previewSize || !selection || !cameraReady) return;
    captureInFlight.current = true;
    try {
      startCaptureLatency();
      const camera = cameraRef.current;
      const cameraTag = findNodeHandle(camera);
      // Resolve the ROI while the native camera view and preview layer are still
      // mounted. The loading state unmounts CameraView.
      const nativeRoi = Platform.OS === "ios" && cameraTag != null
        ? await convertPreviewRect(cameraTag, selection)
        : null;
      // On iOS, CameraView can otherwise capture a frame that arrives after the
      // user releases the shutter. Freeze the visible preview first so the ROI is
      // applied to the exact frame the user composed inside the rectangle.
      if (Platform.OS === "ios") {
        await camera.pausePreview();
      }
      // Keep Expo's processing enabled: it rotates the returned image to match the
      // portrait preview, which is essential for applying our viewfinder coordinates.
      const photo = await camera.takePictureAsync({ quality: 1, exif: false, skipProcessing: false });
      if (!photo?.uri || !photo.width || !photo.height) throw new Error("The camera did not return an image.");
      setExtracting();

      const imageSize = {
        width: photo.width,
        height: photo.height,
      };
      // ImageManipulator operates on the decoded full-resolution pixel buffer,
      // which can be larger than CameraView's reported/scaled dimensions.
      const sourceContext = ImageManipulator.manipulate(photo.uri);
      const sourceImage = await sourceContext.renderAsync();
      const cropperImageSize = { width: sourceImage.width, height: sourceImage.height };
      const crop = nativeRoi
        ? mapNormalizedRoiToImageCrop(nativeRoi, cropperImageSize)
        : mapCaptureFrameToImageCrop(selection, previewSize, cropperImageSize, 0);
      console.info("[OCR] capture geometry", {
        preview: previewSize,
        selection,
        image: imageSize,
        cropperImage: cropperImageSize,
        nativeRoi,
        crop,
      });
      const context = ImageManipulator.manipulate(photo.uri);
      context.crop({ originX: crop.x, originY: crop.y, width: crop.width, height: crop.height });
      const rendered = await context.renderAsync();
      const cropped = await rendered.saveAsync({ compress: 1, format: SaveFormat.JPEG });
      // Retain the actual submitted crop, so an OCR failure can show the user exactly
      // what was selected instead of the entire camera image.
      setCaptured(cropped.uri);
      setExtracting();
      // OCR receives only this image-manipulator crop. No full-photo fallback is used:
      // the draggable rectangle is the source of truth for the selected passage.
      const { normalizedText: extracted, rawText } = await extractAndNormalize(cropped.uri);
      completeOcrLatency();
      setExtracted(rawText, extracted);
    } catch (error: unknown) {
      const message = (error as { message?: string }).message ?? "Text extraction failed.";
      setOcrError(message);
    } finally {
      captureInFlight.current = false;
    }
  }

  function startAnalysis() {
    void analyze();
    resetCaptureView();
    navigation.navigate("Analysis");
  }

  if (permission && permission.status === PermissionStatus.DENIED && !permission.canAskAgain) {
    return <StateScreen title="Camera access blocked" detail="Enable camera access in Settings to capture a passage." action="Open Settings" onPress={() => Linking.openSettings()} />;
  }

  if (status === "error") {
    return <StateScreen title="We couldn’t read that page" detail={ocrError ?? "Text extraction failed."} action="Try again" onPress={resetCaptureView} previewUri={imageUri} />;
  }

  if (status === "extracted" && normalizedText) {
    return (
      <PaperScreen style={styles.paperScreen}>
        <Text style={styles.eyebrow}>Ready to analyze</Text>
        <Text style={styles.heading}>Review your passage</Text>
        <ScrollView style={styles.textScroll} contentContainerStyle={styles.textScrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.extractedText}>{normalizedText}</Text>
        </ScrollView>
        <Text style={styles.inputLabel}>Book title</Text>
        <TextInput style={styles.input} placeholder="Optional, helps improve context" placeholderTextColor={colors.inkFaint} value={bookTitleHint} onChangeText={setBookTitleHint} autoCapitalize="words" />
        <Text style={styles.inputLabel}>Author</Text>
        <TextInput style={styles.input} placeholder="Optional" placeholderTextColor={colors.inkFaint} value={authorHint} onChangeText={setAuthorHint} autoCapitalize="words" />
        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={resetCaptureView}><Text style={styles.secondaryText}>Retake</Text></TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={startAnalysis}><Text style={styles.primaryText}>Analyze passage</Text></TouchableOpacity>
        </View>
      </PaperScreen>
    );
  }

  if (status === "captured" || status === "extracting") {
    return <StateScreen title="Reading your passage" detail="Extracting the selected text…" busy action="Cancel" onPress={resetCaptureView} />;
  }

  return (
    <View style={styles.cameraRoot}>
      {isFocused && permission?.status === PermissionStatus.GRANTED ? (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setCameraReady(true)} onLayout={(event) => prepareFrame(event.nativeEvent.layout)} />
      ) : (
        <View style={styles.cameraFallback} />
      )}
      {previewSize && selection && (
        <CaptureSelectionFrame frame={selection} bounds={getCaptureFrameBounds(previewSize)} onChange={setSelection} />
      )}
      <View pointerEvents="none" style={styles.captureTop}><Text style={styles.captureTitle}>Capture a passage</Text><Text style={styles.captureHint}>Resize the frame around the text you want to understand.</Text></View>
      <View style={styles.cameraControls}>
        <Text style={styles.alignHint}>Align the passage inside the frame</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Capture passage" disabled={!cameraReady} style={[styles.shutter, !cameraReady && styles.shutterDisabled]} onPressIn={() => void handleCapture()}>
          <View style={styles.shutterInner}><Ionicons name="book-outline" size={27} color={colors.brownDeep} /></View>
        </TouchableOpacity>
        {__DEV__ && <TouchableOpacity style={styles.previewButton} onPress={() => { startCaptureLatency(); completeOcrLatency(); loadPreviewAnalysis(readerPreviewFixture, readerPreviewAuthor); navigation.navigate("Analysis"); }}><Text style={styles.previewText}>Preview analysis</Text></TouchableOpacity>}
      </View>
      {!permission && <View style={styles.permissionOverlay}><ActivityIndicator color={colors.paper} /></View>}
      {permission?.status !== PermissionStatus.GRANTED && permission?.canAskAgain && (
        <TouchableOpacity style={styles.permissionOverlay} onPress={() => void ensurePermission()}><Ionicons name="camera-outline" size={34} color={colors.paper} /><Text style={styles.permissionText}>Allow camera access</Text></TouchableOpacity>
      )}
    </View>
  );
}

function StateScreen({ title, detail, action, onPress, busy = false, previewUri = null }: { title: string; detail: string; action: string; onPress: () => void; busy?: boolean; previewUri?: string | null }) {
  return <PaperScreen style={styles.stateScreen}><View style={styles.stateCard}>{busy ? <ActivityIndicator size="large" color={colors.brown} /> : <Ionicons name="scan-outline" size={34} color={colors.brown} />}<Text style={styles.heading}>{title}</Text><Text style={styles.detail}>{detail}</Text>{previewUri && <><Text style={styles.previewLabel}>Selected region sent to OCR</Text><Image source={{ uri: previewUri }} resizeMode="contain" style={styles.cropPreview} /></>}<TouchableOpacity style={styles.primaryButton} onPress={onPress}><Text style={styles.primaryText}>{action}</Text></TouchableOpacity></View></PaperScreen>;
}

const styles = StyleSheet.create({
  cameraRoot: { flex: 1, backgroundColor: "#2E2824" }, cameraFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: "#2E2824" },
  captureTop: { position: "absolute", top: 66, left: 28, right: 28, alignItems: "center" }, captureTitle: { color: colors.paper, fontSize: 22, fontWeight: "800" }, captureHint: { color: "rgba(248,243,236,0.82)", fontSize: 13, textAlign: "center", lineHeight: 19, marginTop: 6 },
  cameraControls: { position: "absolute", bottom: 26, left: 0, right: 0, alignItems: "center" }, alignHint: { color: colors.paper, backgroundColor: "rgba(45,38,33,0.74)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: radii.pill, fontWeight: "700", marginBottom: 18 },
  shutter: { width: 76, height: 76, borderRadius: 38, padding: 6, backgroundColor: "rgba(234,227,218,0.52)", borderWidth: 1, borderColor: colors.paper }, shutterDisabled: { opacity: 0.55 }, shutterInner: { flex: 1, borderRadius: 32, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  previewButton: { marginTop: 10, padding: 6 }, previewText: { color: colors.paper, fontWeight: "700", fontSize: 12 }, permissionOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(35,29,26,0.86)", alignItems: "center", justifyContent: "center", gap: 12 }, permissionText: { color: colors.paper, fontWeight: "700" },
  paperScreen: { padding: 22 }, stateScreen: { padding: 24, justifyContent: "center" }, stateCard: { alignItems: "center", backgroundColor: colors.glassStrong, borderWidth: 1, borderColor: colors.line, borderRadius: radii.large, padding: 28 }, eyebrow: { color: colors.brown, fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: "800", marginTop: 18 }, heading: { color: colors.ink, fontSize: 25, fontWeight: "800", textAlign: "center", marginTop: 7 }, detail: { color: colors.inkSoft, fontSize: 15, textAlign: "center", lineHeight: 22, marginTop: 10, marginBottom: 16 }, previewLabel: { color: colors.brown, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8, alignSelf: "flex-start", marginBottom: 8 }, cropPreview: { width: "100%", height: 170, marginBottom: 18, backgroundColor: "#EDE5D9", borderRadius: radii.small },
  textScroll: { flex: 1, minHeight: 180, marginTop: 18, marginBottom: 16, borderRadius: radii.medium, backgroundColor: colors.glassStrong, borderWidth: 1, borderColor: colors.line }, textScrollContent: { padding: 16 }, extractedText: { color: colors.ink, fontFamily: "Georgia", fontSize: 17, lineHeight: 27 }, inputLabel: { color: colors.brown, fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginBottom: 7 }, input: { backgroundColor: colors.glassStrong, color: colors.ink, borderWidth: 1, borderColor: colors.line, borderRadius: radii.small, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 12, fontSize: 16 }, actions: { flexDirection: "row", gap: 10, marginTop: 4 }, primaryButton: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: colors.brownDeep, borderRadius: radii.medium, paddingHorizontal: 18 }, primaryText: { color: colors.paper, fontSize: 15, fontWeight: "800" }, secondaryButton: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radii.medium, borderWidth: 1, borderColor: colors.brown, paddingHorizontal: 18 }, secondaryText: { color: colors.brownDeep, fontSize: 15, fontWeight: "800" },
});
