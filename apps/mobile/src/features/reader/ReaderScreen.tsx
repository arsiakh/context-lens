import {
  ActivityIndicator,
  Animated,
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
import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { BlurTargetView, BlurView } from "expo-blur";
import { useScanStore } from "../../stores/scanStore";
import type { InBookRef, RealWorldRef, VocabItem } from "../../types";
import { getPopoverLayout, type PopoverAnchor } from "./getPopoverLayout";
import { renderAnnotatedText, type AnnotatedTextSegment } from "./renderAnnotatedText";

type ReferenceSelection =
  | { type: "inBookRef"; item: InBookRef; quote: string }
  | { type: "realWorldRef"; item: RealWorldRef; quote: string }
  | null;

type VocabSelection = {
  item: VocabItem;
  anchor: PopoverAnchor;
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
  const blurTargetRef = useRef<View>(null);

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
    <BlurTargetView ref={blurTargetRef} style={styles.blurTarget}>
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
            <AnnotationSegmentText
              key={`${segment.type}-${index}`}
              segment={segment}
              vocab={vocab}
              inBookRefs={inBookRefs}
              realWorldRefs={realWorldRefs}
              onSelectVocab={(item, anchor) => setSelectedVocab({ item, anchor })}
              onSelectReference={setSelectedReference}
            />
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
    </BlurTargetView>
    <Modal transparent visible={needsBookTitleConfirmation} animationType="fade">
      <View style={styles.modalOverlay}>
        <ModalBlur blurTarget={blurTargetRef} />
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
      </View>
    </Modal>
    <VocabPopover
      selection={selectedVocab}
      blurTarget={blurTargetRef}
      onDismiss={() => setSelectedVocab(null)}
    />
    <ReferenceSheet
      selection={selectedReference}
      blurTarget={blurTargetRef}
      onDismiss={() => setSelectedReference(null)}
    />
    </>
  );
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

function AnnotationSegmentText({
  segment,
  vocab,
  inBookRefs,
  realWorldRefs,
  onSelectVocab,
  onSelectReference,
}: {
  segment: AnnotatedTextSegment;
  vocab: VocabItem[];
  inBookRefs: InBookRef[];
  realWorldRefs: RealWorldRef[];
  onSelectVocab: (item: VocabItem, anchor: PopoverAnchor) => void;
  onSelectReference: (selection: ReferenceSelection) => void;
}) {
  const textRef = useRef<Text>(null);

  function handlePress(event: GestureResponderEvent) {
    if (segment.annotationIndex === null) return;

    if (segment.type === "vocab") {
      const item = vocab[segment.annotationIndex];
      if (!item) return;

      const fallbackAnchor: PopoverAnchor = {
        x: event.nativeEvent.pageX,
        y: event.nativeEvent.pageY - 13,
        width: 0,
        height: 26,
      };
      const node = textRef.current;
      if (!node) {
        onSelectVocab(item, fallbackAnchor);
        return;
      }

      node.measureInWindow((x, y, width, height) => {
        const measuredAnchor = width > 0 && height > 0
          ? { x, y, width, height }
          : fallbackAnchor;
        onSelectVocab(item, measuredAnchor);
      });
      return;
    }

    if (segment.type === "inBookRef") {
      const item = inBookRefs[segment.annotationIndex];
      if (item) onSelectReference({ type: "inBookRef", item, quote: segment.text });
      return;
    }

    if (segment.type === "realWorldRef") {
      const item = realWorldRefs[segment.annotationIndex];
      if (item) onSelectReference({ type: "realWorldRef", item, quote: segment.text });
    }
  }

  return (
    <Text
      ref={textRef}
      style={segmentStyle(segment)}
      suppressHighlighting={segment.type !== "plain"}
      onPress={handlePress}
    >
      {segment.text}
    </Text>
  );
}

function VocabPopover({
  selection,
  blurTarget,
  onDismiss,
}: {
  selection: VocabSelection;
  blurTarget: RefObject<View | null>;
  onDismiss: () => void;
}) {
  const item = selection?.item ?? null;
  const [cardHeight, setCardHeight] = useState(230);
  const viewport = Dimensions.get("window");
  const layout = selection
    ? getPopoverLayout(selection.anchor, viewport, { height: cardHeight })
    : null;

  useEffect(() => {
    setCardHeight(230);
  }, [item]);

  return (
    <Modal transparent visible={selection !== null} animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.modalOverlay}>
      <ModalBlur blurTarget={blurTarget} />
      <Pressable style={styles.popoverBackdrop} onPress={onDismiss}>
        <Pressable style={[
          styles.dictionaryCard,
          layout && { width: layout.width, left: layout.left, top: layout.top },
        ]}
        onLayout={(event) => {
          const measuredHeight = event.nativeEvent.layout.height;
          if (Math.abs(measuredHeight - cardHeight) > 0.5) setCardHeight(measuredHeight);
        }}>
          {layout && (
            <View
              style={[
                styles.popoverPointer,
                {
                  left: layout.arrowLeft,
                  top: layout.placement === "below" ? -9 : undefined,
                  bottom: layout.placement === "below" ? undefined : -9,
                },
                layout.placement === "below"
                  ? styles.popoverPointerBelow
                  : styles.popoverPointerAbove,
              ]}
            />
          )}
          {item && (
            <>
              <View style={styles.dictionaryHeader}>
                <View style={styles.dictionaryHeading}>
                  <Text style={styles.dictionaryTitle}>Vocabulary</Text>
                  <Text style={styles.dictionaryTerm}>{item.term}</Text>
                  <Text style={styles.dictionaryPos}>{item.pos}</Text>
                </View>
                <TouchableOpacity style={styles.dictionaryCloseButton} onPress={onDismiss}>
                  <Text style={styles.dictionaryCloseText}>×</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.dictionaryDefinition}>{item.definition}</Text>
              <View style={styles.dictionaryExampleCard}>
                <Text style={styles.dictionaryExample}>“{item.example}”</Text>
              </View>
              <View style={styles.dictionaryTags}>
                <View style={styles.dictionaryTag}>
                  <Text style={styles.dictionaryTagText}>{item.pos}</Text>
                </View>
                <View style={styles.dictionaryTag}>
                  <Text style={styles.dictionaryTagText}>contextual meaning</Text>
                </View>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
      </View>
    </Modal>
  );
}

function ReferenceSheet({
  selection,
  blurTarget,
  onDismiss,
}: {
  selection: ReferenceSelection;
  blurTarget: RefObject<View | null>;
  onDismiss: () => void;
}) {
  const item = selection?.item ?? null;
  const isRealWorld = selection?.type === "realWorldRef";
  const title = isRealWorld ? "Real-world Reference" : "In-book Context";
  const sheetTranslateY = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (!selection) return;
    sheetTranslateY.setValue(500);
    Animated.spring(sheetTranslateY, {
      toValue: 0,
      damping: 30,
      stiffness: 290,
      mass: 1,
      useNativeDriver: true,
    }).start();
  }, [selection, sheetTranslateY]);

  return (
    <Modal transparent visible={selection !== null} animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.modalOverlay}>
      <ModalBlur blurTarget={blurTarget} />
      <Pressable style={styles.sheetBackdrop} onPress={onDismiss}>
        <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
        <Pressable style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={[
              styles.sheetIcon,
              isRealWorld ? styles.sheetIconRealWorld : styles.sheetIconInBook,
            ]}>
              <Text style={isRealWorld ? styles.sheetIconTextRealWorld : styles.sheetIconTextInBook}>
                {isRealWorld ? "◎" : "B"}
              </Text>
            </View>
            <View style={styles.sheetHeading}>
              <Text style={styles.sheetTitle}>{title}</Text>
              {item && <Text style={styles.sheetLabel}>{item.label}</Text>}
            </View>
            <TouchableOpacity style={styles.sheetCloseButton} onPress={onDismiss}>
              <Text style={styles.sheetCloseText}>×</Text>
            </TouchableOpacity>
          </View>
          {item && (
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={[
                styles.sheetQuote,
                isRealWorld ? styles.sheetQuoteRealWorld : styles.sheetQuoteInBook,
              ]}>
                <Text style={isRealWorld ? styles.sheetQuoteTextRealWorld : styles.sheetQuoteTextInBook}>
                  “{selection?.quote}”
                </Text>
              </View>
              <Text style={styles.sheetBody}>{item.explanation}</Text>
              <View style={styles.sheetInsight}>
                <Text style={styles.sheetInsightLabel}>Context Lens</Text>
                <Text style={styles.sheetConfidence}>
                  Analysis confidence {Math.round(item.confidence * 100)}%
                </Text>
              </View>
            </ScrollView>
          )}
        </Pressable>
        </Animated.View>
      </Pressable>
      </View>
    </Modal>
  );
}

function ModalBlur({ blurTarget }: { blurTarget: RefObject<View | null> }) {
  return (
    <BlurView
      blurTarget={blurTarget}
      blurMethod="dimezisBlurViewSdk31Plus"
      intensity={24}
      tint="default"
      style={StyleSheet.absoluteFill}
    />
  );
}

const styles = StyleSheet.create({
  blurTarget: { flex: 1 },
  modalOverlay: { flex: 1 },
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
  vocabText: { backgroundColor: "rgba(196, 133, 42, 0.24)", color: "#3B2412" },
  inBookText: { fontWeight: "800", color: "#6F461C" },
  realWorldText: {
    color: "#356A9D",
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
    textDecorationColor: "#60A5FA",
  },
  empty: { marginTop: 18, fontSize: 15, color: "#888", fontStyle: "italic" },
  card: { borderRadius: 10, padding: 14, marginBottom: 10 },
  vocabCard: { backgroundColor: "#FFF9C4" },
  inBookCard: { backgroundColor: "#FFF7E8", borderLeftWidth: 3, borderLeftColor: "#C4852A" },
  realWorldCard: { backgroundColor: "#EEF6FF", borderLeftWidth: 3, borderLeftColor: "#60A5FA" },
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
    backgroundColor: "transparent",
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
    backgroundColor: "transparent",
  },
  dictionaryCard: {
    position: "absolute",
    borderRadius: 20,
    backgroundColor: "rgba(28, 13, 5, 0.98)",
    borderWidth: 1,
    borderColor: "rgba(196, 133, 42, 0.22)",
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.58,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  popoverPointer: {
    position: "absolute",
    width: 18,
    height: 18,
    backgroundColor: "rgba(28, 13, 5, 0.98)",
    transform: [{ rotate: "45deg" }],
  },
  popoverPointerBelow: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(196, 133, 42, 0.24)",
  },
  popoverPointerAbove: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(196, 133, 42, 0.24)",
  },
  dictionaryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  dictionaryHeading: {
    flex: 1,
  },
  dictionaryTitle: {
    color: "rgba(196, 133, 42, 0.55)",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "600",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  dictionaryTerm: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    color: "rgba(240, 226, 196, 0.97)",
  },
  dictionaryPos: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "400",
    color: "rgba(196, 133, 42, 0.48)",
    fontStyle: "italic",
  },
  dictionaryCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(196, 133, 42, 0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(196, 133, 42, 0.20)",
  },
  dictionaryCloseText: {
    color: "rgba(232, 185, 107, 0.72)",
    fontSize: 19,
    lineHeight: 21,
  },
  dictionaryDefinition: {
    fontSize: 13,
    lineHeight: 21,
    color: "rgba(240, 226, 196, 0.72)",
    marginBottom: 10,
  },
  dictionaryExampleCard: {
    borderRadius: 13,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: "rgba(196, 133, 42, 0.07)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(196, 133, 42, 0.15)",
  },
  dictionaryExample: {
    fontSize: 12,
    lineHeight: 19,
    color: "rgba(232, 185, 107, 0.58)",
    fontStyle: "italic",
  },
  dictionaryTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  dictionaryTag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(196, 133, 42, 0.07)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(196, 133, 42, 0.14)",
  },
  dictionaryTagText: {
    fontSize: 11,
    color: "rgba(196, 133, 42, 0.58)",
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },
  sheet: {
    maxHeight: "72%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(196, 133, 42, 0.24)",
    backgroundColor: "#1C0F07",
    paddingTop: 12,
    paddingBottom: 28,
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -10 },
    elevation: 12,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 36,
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(196, 133, 42, 0.32)",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  sheetIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  sheetIconRealWorld: {
    backgroundColor: "rgba(96, 165, 250, 0.10)",
    borderColor: "rgba(96, 165, 250, 0.24)",
  },
  sheetIconInBook: {
    backgroundColor: "rgba(196, 133, 42, 0.14)",
    borderColor: "rgba(196, 133, 42, 0.24)",
  },
  sheetIconTextRealWorld: {
    color: "rgba(147, 197, 253, 0.88)",
    fontSize: 20,
    fontWeight: "700",
  },
  sheetIconTextInBook: {
    color: "rgba(232, 185, 107, 0.88)",
    fontSize: 16,
    fontWeight: "800",
  },
  sheetHeading: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    color: "rgba(196, 133, 42, 0.58)",
    marginBottom: 3,
  },
  sheetLabel: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "700",
    color: "rgba(240, 226, 196, 0.92)",
  },
  sheetCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(196, 133, 42, 0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(196, 133, 42, 0.18)",
  },
  sheetCloseText: {
    color: "rgba(232, 185, 107, 0.72)",
    fontSize: 19,
    lineHeight: 21,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sheetQuote: {
    borderRadius: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  sheetQuoteRealWorld: {
    backgroundColor: "rgba(96, 165, 250, 0.07)",
    borderColor: "rgba(96, 165, 250, 0.17)",
  },
  sheetQuoteInBook: {
    backgroundColor: "rgba(196, 133, 42, 0.09)",
    borderColor: "rgba(196, 133, 42, 0.20)",
  },
  sheetQuoteTextRealWorld: {
    color: "rgba(191, 219, 254, 0.80)",
    fontSize: 13,
    lineHeight: 21,
    fontStyle: "italic",
  },
  sheetQuoteTextInBook: {
    color: "rgba(253, 230, 180, 0.82)",
    fontSize: 13,
    lineHeight: 21,
    fontStyle: "italic",
  },
  sheetBody: {
    fontSize: 13,
    lineHeight: 21,
    color: "rgba(240, 226, 196, 0.72)",
    marginBottom: 16,
  },
  sheetInsight: {
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 13,
    backgroundColor: "rgba(196, 133, 42, 0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(196, 133, 42, 0.13)",
  },
  sheetInsightLabel: {
    color: "rgba(196, 133, 42, 0.58)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  sheetConfidence: {
    fontSize: 12,
    color: "rgba(196, 133, 42, 0.68)",
  },
});
