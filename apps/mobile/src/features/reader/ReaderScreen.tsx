import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { GestureResponderEvent } from "react-native";
import { useEffect, useState } from "react";
import { useScanStore } from "../../stores/scanStore";
import type { InBookRef, RealWorldRef, VocabItem } from "../../types";
import { renderAnnotatedText, type AnnotatedTextSegment } from "./renderAnnotatedText";

type ReferenceSelection =
  | { type: "inBookRef"; item: InBookRef }
  | { type: "realWorldRef"; item: RealWorldRef }
  | null;

type VocabSelection = {
  item: VocabItem;
  anchorX: number;
  anchorY: number;
} | null;

export default function ReaderScreen() {
  const {
    analyzeStatus,
    analyzeResponse,
    analyzeError,
    normalizedText,
    confirmedBookTitle,
    needsBookTitleConfirmation,
    confirmBookTitle,
    analyze,
  } = useScanStore();
  const [titleDraft, setTitleDraft] = useState("");
  const [selectedVocab, setSelectedVocab] = useState<VocabSelection>(null);
  const [selectedReference, setSelectedReference] = useState<ReferenceSelection>(null);

  useEffect(() => {
    if (needsBookTitleConfirmation) {
      setTitleDraft(analyzeResponse?.bookInference.title ?? "");
    }
  }, [analyzeResponse?.bookInference.title, needsBookTitleConfirmation]);

  if (analyzeStatus === "analyzing") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6858e9" />
        <Text style={styles.muted}>Analyzing passage…</Text>
      </View>
    );
  }

  if (analyzeStatus === "error") {
    return (
      <View style={styles.centered}>
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{analyzeError?.message ?? "Analysis failed."}</Text>
          {analyzeError?.retryAfterSeconds != null && (
            <Text style={styles.errorSub}>Try again in {analyzeError.retryAfterSeconds}s.</Text>
          )}
        </View>
        <TouchableOpacity style={styles.retryButton} onPress={() => void analyze()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (analyzeStatus !== "done" || !analyzeResponse) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>No analysis yet. Capture a passage to begin.</Text>
      </View>
    );
  }

  const { bookInference, vocab, inBookRefs, realWorldRefs, meta } = analyzeResponse;
  const text = analyzeResponse.normalizedText ?? normalizedText ?? "";
  const totalAnnotations = vocab.length + inBookRefs.length + realWorldRefs.length;
  const displayTitle = confirmedBookTitle ?? bookInference.title ?? "Unknown";
  const segments = renderAnnotatedText(text, vocab, inBookRefs, realWorldRefs);

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Book inference */}
      <Text style={styles.sectionLabel}>Book</Text>
      <Text style={styles.bookTitle}>{displayTitle}</Text>
      <Text style={styles.confidence}>
        confidence {bookInference.confidence.toFixed(2)}
        {confirmedBookTitle ? "  · confirmed" : ""}
      </Text>

      {/* Passage */}
      <Text style={styles.sectionLabel}>Passage</Text>
      <View style={styles.passageBox}>
        <Text style={styles.passageText}>
          {segments.map((segment, index) => (
            <Text
              key={`${segment.type}-${index}`}
              style={segmentStyle(segment)}
              suppressHighlighting={segment.type !== "plain"}
              onPress={(event) => {
                if (segment.annotationIndex === null) return;
                if (segment.type === "vocab") {
                  const item = vocab[segment.annotationIndex];
                  if (item) setSelectedVocab(toVocabSelection(item, event));
                }
                if (segment.type === "inBookRef") {
                  const item = inBookRefs[segment.annotationIndex];
                  if (item) setSelectedReference({ type: "inBookRef", item });
                }
                if (segment.type === "realWorldRef") {
                  const item = realWorldRefs[segment.annotationIndex];
                  if (item) setSelectedReference({ type: "realWorldRef", item });
                }
              }}
            >
              {segment.text}
            </Text>
          ))}
        </Text>
      </View>

      {totalAnnotations === 0 && (
        <Text style={styles.empty}>No highlights found for this passage.</Text>
      )}

      {/* Vocab */}
      {vocab.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Vocab ({vocab.length})</Text>
          {vocab.map((v: VocabItem, i) => (
            <View key={`v${i}`} style={[styles.card, styles.vocabCard]}>
              <Text style={styles.term}>
                {v.term} <Text style={styles.pos}>· {v.pos}</Text>
              </Text>
              <Text style={styles.body}>{v.definition}</Text>
              <Text style={styles.example}>“{v.example}”</Text>
            </View>
          ))}
        </>
      )}

      {/* In-book refs */}
      {inBookRefs.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>In-book references ({inBookRefs.length})</Text>
          {inBookRefs.map((r: InBookRef, i) => (
            <View key={`ib${i}`} style={[styles.card, styles.inBookCard]}>
              <Text style={styles.term}>{r.label}</Text>
              <Text style={styles.body}>{r.explanation}</Text>
              <Text style={styles.confidenceSmall}>confidence {r.confidence.toFixed(2)}</Text>
            </View>
          ))}
        </>
      )}

      {/* Real-world refs */}
      {realWorldRefs.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Real-world references ({realWorldRefs.length})</Text>
          {realWorldRefs.map((r: RealWorldRef, i) => (
            <View key={`rw${i}`} style={[styles.card, styles.realWorldCard]}>
              <Text style={styles.term}>{r.label}</Text>
              <Text style={styles.body}>{r.explanation}</Text>
              <Text style={styles.confidenceSmall}>confidence {r.confidence.toFixed(2)}</Text>
            </View>
          ))}
        </>
      )}

      {/* Meta */}
      <Text style={styles.sectionLabel}>Debug</Text>
      <Text style={styles.meta}>
        model: {meta.model} · {meta.latencyMs}ms · fallback: {meta.fallbackUsed ? "yes" : "no"}
      </Text>
    </ScrollView>
    <Modal transparent visible={needsBookTitleConfirmation} animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Which book is this from?</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Book title"
            placeholderTextColor="#999"
            value={titleDraft}
            onChangeText={setTitleDraft}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
          />
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalSecondaryButton}
              onPress={() => confirmBookTitle("")}
            >
              <Text style={styles.modalSecondaryText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={() => confirmBookTitle(titleDraft)}
            >
              <Text style={styles.modalPrimaryText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    <VocabPopover selection={selectedVocab} onDismiss={() => setSelectedVocab(null)} />
    <ReferenceSheet selection={selectedReference} onDismiss={() => setSelectedReference(null)} />
    </>
  );
}

function toVocabSelection(item: VocabItem, event: GestureResponderEvent): VocabSelection {
  return {
    item,
    anchorX: event.nativeEvent.pageX,
    anchorY: event.nativeEvent.pageY,
  };
}

function segmentStyle(segment: AnnotatedTextSegment) {
  switch (segment.type) {
    case "vocab":
      return styles.vocabText;
    case "inBookRef":
      return styles.inBookText;
    case "realWorldRef":
      return styles.realWorldText;
    default:
      return undefined;
  }
}

function VocabPopover({
  selection,
  onDismiss,
}: {
  selection: VocabSelection;
  onDismiss: () => void;
}) {
  const item = selection?.item ?? null;
  const layout = selection ? getPopoverLayout(selection.anchorX, selection.anchorY) : null;

  return (
    <Modal transparent visible={selection !== null} animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.popoverBackdrop} onPress={onDismiss}>
        <Pressable style={[
          styles.dictionaryCard,
          layout && { width: layout.width, left: layout.left, top: layout.top },
        ]}>
          {layout && (
            <View
              style={[
                styles.popoverPointer,
                {
                  left: layout.pointerLeft,
                  top: layout.isBelow ? -8 : undefined,
                  bottom: layout.isBelow ? undefined : -8,
                },
              ]}
            />
          )}
          <Text style={styles.dictionaryTitle}>Dictionary</Text>
          <View style={styles.dictionaryRule} />
          {item && (
            <>
              <Text style={styles.dictionaryTerm}>
                {item.term} <Text style={styles.dictionaryPos}>{item.pos}</Text>
              </Text>
              <Text style={styles.dictionaryDefinition}>{item.definition}</Text>
              <Text style={styles.dictionaryExample}>{item.example}</Text>
            </>
          )}
          <View style={styles.dictionaryDivider} />
          <Text style={styles.dictionaryAction}>Definition from Context Lens</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function getPopoverLayout(anchorX: number, anchorY: number) {
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const margin = 14;
  const cardWidth = Math.min(390, screenWidth - margin * 2);
  const estimatedCardHeight = 230;
  const canFitBelow = anchorY + estimatedCardHeight + 18 < screenHeight - margin;
  const isBelow = canFitBelow || anchorY < estimatedCardHeight + margin;
  const left = clamp(anchorX - cardWidth / 2, margin, screenWidth - cardWidth - margin);
  const top = isBelow
    ? clamp(anchorY + 16, margin, screenHeight - estimatedCardHeight - margin)
    : clamp(anchorY - estimatedCardHeight - 16, margin, screenHeight - estimatedCardHeight - margin);
  const pointerLeft = clamp(anchorX - left - 9, 18, cardWidth - 36);

  return { width: cardWidth, left, top, pointerLeft, isBelow };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function ReferenceSheet({
  selection,
  onDismiss,
}: {
  selection: ReferenceSelection;
  onDismiss: () => void;
}) {
  const item = selection?.item ?? null;
  const title = selection?.type === "realWorldRef" ? "Real-world reference" : "In-book reference";

  return (
    <Modal transparent visible={selection !== null} animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.sheetBackdrop} onPress={onDismiss}>
        <Pressable style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          {item && (
            <>
              <Text style={styles.sheetLabel}>{item.label}</Text>
              <Text style={styles.sheetBody}>{item.explanation}</Text>
              <Text style={styles.sheetConfidence}>confidence {item.confidence.toFixed(2)}</Text>
            </>
          )}
          <TouchableOpacity style={styles.sheetButton} onPress={onDismiss}>
            <Text style={styles.sheetButtonText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, backgroundColor: "#fff" },
  muted: { marginTop: 16, fontSize: 15, color: "#666", textAlign: "center" },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6858e9",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 22,
    marginBottom: 6,
  },
  bookTitle: { fontSize: 20, fontWeight: "700", color: "#111" },
  confidence: { fontSize: 13, color: "#888", marginTop: 2 },
  passageBox: { backgroundColor: "#F7F6FF", borderRadius: 12, padding: 16 },
  passageText: { fontSize: 16, lineHeight: 26, color: "#222" },
  vocabText: { backgroundColor: "#FFF9C4" },
  inBookText: { textDecorationLine: "underline", textDecorationColor: "#5C6BC0" },
  realWorldText: { fontWeight: "800" },
  empty: { marginTop: 18, fontSize: 15, color: "#888", fontStyle: "italic" },
  card: { borderRadius: 10, padding: 14, marginBottom: 10 },
  vocabCard: { backgroundColor: "#FFF9C4" },
  inBookCard: { backgroundColor: "#F0F4FF", borderLeftWidth: 3, borderLeftColor: "#5C6BC0" },
  realWorldCard: { backgroundColor: "#F3F0FF", borderLeftWidth: 3, borderLeftColor: "#7E57C2" },
  term: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 4 },
  pos: { fontSize: 13, fontWeight: "400", color: "#777", fontStyle: "italic" },
  body: { fontSize: 14, lineHeight: 20, color: "#333" },
  example: { fontSize: 13, color: "#555", fontStyle: "italic", marginTop: 6 },
  confidenceSmall: { fontSize: 12, color: "#888", marginTop: 6 },
  errorBanner: {
    width: "100%",
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#FFF0F0",
    borderLeftWidth: 4,
    borderLeftColor: "#E53935",
    marginBottom: 20,
  },
  errorText: { color: "#C62828", fontSize: 14, fontWeight: "500" },
  errorSub: { color: "#C62828", fontSize: 13, marginTop: 4 },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 8,
    backgroundColor: "#6858e9",
  },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  meta: { fontSize: 12, color: "#999", fontFamily: "Courier" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111",
    marginBottom: 14,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: "#dedbf9",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#222",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 18,
  },
  modalSecondaryButton: {
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  modalSecondaryText: {
    color: "#6858e9",
    fontWeight: "600",
  },
  modalPrimaryButton: {
    backgroundColor: "#6858e9",
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  modalPrimaryText: {
    color: "#fff",
    fontWeight: "700",
  },
  popoverBackdrop: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.42)",
  },
  dictionaryCard: {
    position: "absolute",
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0, 0, 0, 0.18)",
    paddingTop: 16,
    paddingHorizontal: 22,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  popoverPointer: {
    position: "absolute",
    width: 18,
    height: 18,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    transform: [{ rotate: "45deg" }],
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0, 0, 0, 0.14)",
  },
  dictionaryTitle: {
    fontSize: 20,
    fontWeight: "400",
    color: "#444",
  },
  dictionaryRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#d8d8d8",
    marginTop: 6,
    marginBottom: 10,
  },
  dictionaryTerm: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    marginBottom: 4,
  },
  dictionaryPos: {
    fontSize: 14,
    fontWeight: "600",
    color: "#888",
  },
  dictionaryDefinition: {
    fontSize: 15,
    lineHeight: 21,
    color: "#111",
  },
  dictionaryExample: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#666",
    fontStyle: "italic",
  },
  dictionaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ddd",
    marginVertical: 12,
  },
  dictionaryAction: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.16)",
  },
  sheet: {
    minHeight: "42%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: "#fff",
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 34,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#d4d4d4",
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#6858e9",
    marginBottom: 8,
  },
  sheetLabel: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    marginBottom: 10,
  },
  sheetBody: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
  },
  sheetConfidence: {
    marginTop: 12,
    fontSize: 12,
    color: "#888",
  },
  sheetButton: {
    marginTop: 22,
    alignSelf: "flex-start",
    backgroundColor: "#6858e9",
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  sheetButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
