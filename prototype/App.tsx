import {
  launchCameraAsync,
  requestCameraPermissionsAsync,
  PermissionStatus,
  launchImageLibraryAsync,
} from "expo-image-picker";
import { extractTextFromImage, isSupported } from "expo-text-extractor";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

//main app component (entry point)
export default function App() {
  const [rawText, setRawText] = useState<string>("");
  const [normalizedText, setNormalizedText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [noTextError, setNoTextError] = useState<string | null>(null);
  function normalize(input: string): string { 
    return input
      .replace(/[\n\r]+/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\u00AD/g, "")
      .trim();
  }

  async function handleCaptureFake() {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsLoading(false);
  }
  
  /*function to handle camera capture and OCR processing
  - requests camera permission
  - launches camera
  - extracts text from image
  - normalizes text
  - sets raw text and normalized text states
  - logs raw and normalized text
  - sets loading state to false
  - shows error if no text is detected
  - shows loading indicator if loading is true
  Pattern: Event Happens (button press) -> Handler Runs (handleCapture) -> State Changes (loading, rawText, normalizedText, noTextError) -> React re-runs App() -> return reads the updated values (rawText, normalizedText) and shows em
  */
  async function handleCapture() { //async function so we can use await for permission, camera, and OCR calls as they don't finish instantly; pauses function @ await someAsyncCall() then continues with result
    const { status } = await requestCameraPermissionsAsync();
    if (status !== PermissionStatus.GRANTED) {
      Alert.alert("Permission required", "Camera access is needed for OCR.");
      return;
    }

    const result = await launchCameraAsync({ mediaTypes: ["images"] });
    if (result.canceled) return;

    const uri = result.assets?.at(0)?.uri; // if asset is undefined / null the whole expression becomes undefined instead of crashing
    if (!uri) return;

    setIsLoading(true);
    setRawText(""); //reset raw text to empty string after each go 
    setNormalizedText("");
    setNoTextError(null);

    try {
      if (!isSupported) {
        Alert.alert("Not supported", "OCR is not available on this device.");
        return;
      }

      const lines = await extractTextFromImage(uri);
      const raw = lines.join("\n");
      const norm = normalize(raw);

      if (norm.length === 0 || norm.trim().length < 20) {
        setNoTextError(
          "No text detected. Try adjusting the angle or lighting, or capture a page with clear text."
        );
        return;
      }

      setRawText(raw);
      setNormalizedText(norm);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("OCR Error", error.message);
      }
    } finally {
      setIsLoading(false);
    }
  
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.title}>OCR Prototype</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={handleCapture} //call handleCapture function when button is pressed
            disabled={isLoading} //disable button if loading is true
          >
            <Text style={styles.buttonText}>
              {isLoading ? "Processing..." : "Capture Book Page"} 
            </Text>
          </TouchableOpacity>

          {isLoading && ( //show loading indicator if loading is true
            <ActivityIndicator size="large" style={{ marginTop: 20 }} />
          )}

          {noTextError !== null && (
            <View style={styles.noTextBanner}>
              <Text style={styles.noTextMessage}>{noTextError}</Text>
              <Text style={styles.noTextHint}>Tap "Capture Book Page" to try again.</Text>
            </View>
          )}

          {normalizedText.length > 0 && (
            <View style={styles.resultBox}>
              <Text style={styles.sectionHeader}>
                Normalized ({normalizedText.length} chars)
              </Text>
              <ScrollView style={styles.resultScroll} nestedScrollEnabled>
                <Text style={styles.resultText}>{normalizedText}</Text>
              </ScrollView>
            </View>
          )}

          {rawText.length > 0 && (
            <View style={styles.resultBox}>
              <Text style={styles.sectionHeader}>Raw OCR</Text>
              <ScrollView style={styles.resultScroll} nestedScrollEnabled>
                <Text style={styles.resultText}>{rawText}</Text>
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );





}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#6858e9",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  resultBox: {
    width: "100%",
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    maxHeight: 200,
  },
  resultScroll: {
    maxHeight: 160,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#666",
  },
  resultText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#333",
  },
  noTextBanner: {
    width: "100%",
    marginTop: 16,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#FFF3E0",
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  noTextMessage: {
    fontSize: 14,
    color: "#E65100",
    fontWeight: "500",
  },
  noTextHint: {
    fontSize: 12,
    color: "#BF360C",
    marginTop: 6,
  },
});
