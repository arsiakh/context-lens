import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useEffect, useState } from "react";
import { useScanStore } from "../../stores/scanStore";
import type { InBookRef, RealWorldRef, VocabItem } from "../../types";

// NOTE: This is an interim Reader used to iterate on the analysis prompt.
// It shows the raw analysis output (passage, every annotation with the exact
// sliced substring so offsets can be verified, plus model meta). The polished
// inline-highlight rendering, popover, and bottom sheets are Week 4.

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
        <Text style={styles.passageText}>{text}</Text>
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
              <OffsetCheck text={text} start={v.start} end={v.end} expected={v.term} />
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
              <OffsetCheck text={text} start={r.start} end={r.end} expected={r.label} />
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
              <OffsetCheck text={text} start={r.start} end={r.end} expected={r.label} />
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
    </>
  );
}

// Shows the exact substring at [start, end) so prompt offsets can be verified by eye.
function OffsetCheck({
  text,
  start,
  end,
  expected,
}: {
  text: string;
  start: number;
  end: number;
  expected: string;
}) {
  const slice = text.slice(start, end);
  const matches = slice.trim().toLowerCase() === expected.trim().toLowerCase();
  return (
    <Text style={[styles.offset, matches ? styles.offsetOk : styles.offsetBad]}>
      [{start}–{end}] “{slice}” {matches ? "✓" : "✗ mismatch"}
    </Text>
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
  offset: { fontSize: 11, marginTop: 6, fontFamily: "Courier" },
  offsetOk: { color: "#2E7D32" },
  offsetBad: { color: "#C62828" },
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
});
