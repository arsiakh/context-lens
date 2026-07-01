import {
  ActivityIndicator,
  Animated,
  Dimensions,
  ImageBackground,
  Pressable,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { GestureResponderEvent } from "react-native";
import type { RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BlurTargetView, BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { useScanStore } from "../../stores/scanStore";
import { useAuthStore } from "../../stores/authStore";
import type { RootStackParamList } from "../../navigation/RootNavigator";
import { saveNote, SaveError } from "../../services/supabase/saveNote";
import type { InBookRef, RealWorldRef, VocabItem } from "../../types";
import { colors, radii, spacing, typography } from "../../ui/theme";
import { getPopoverLayout, type PopoverAnchor } from "./getPopoverLayout";
import { renderAnnotatedText, type AnnotatedTextSegment } from "./renderAnnotatedText";
import { persistHighlightGuideDismissal, shouldShowHighlightGuide } from "./highlightGuideStorage";
import { shouldDismissReferenceSheet } from "./referenceSheetGesture";

const paperTexture = require("../../../assets/textures/paper-grain.png");

type ReferenceSelection =
  | { type: "inBookRef"; item: InBookRef; quote: string }
  | { type: "realWorldRef"; item: RealWorldRef; quote: string }
  | null;

type VocabSelection = {
  item: VocabItem;
  anchor: PopoverAnchor;
} | null;

type SaveStatus = "idle" | "saving" | "saved";
type SaveToastState = { kind: "success" | "error"; message: string } | null;

export default function ReaderScreen() {
  const {
    analyzeStatus,
    analyzeResponse,
    analyzeError,
    normalizedText,
    authorHint,
    confirmedBookTitle,
    needsBookTitleConfirmation,
    confirmBookTitle,
    analyze,
  } = useScanStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((state) => state.user);
  const [titleDraft, setTitleDraft] = useState("");
  const [selectedVocab, setSelectedVocab] = useState<VocabSelection>(null);
  const [selectedReference, setSelectedReference] = useState<ReferenceSelection>(null);
  const [showHighlightGuide, setShowHighlightGuide] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveToast, setSaveToast] = useState<SaveToastState>(null);
  const highlightGuideChecked = useRef(false);
  const blurTargetRef = useRef<View>(null);

  useEffect(() => {
    if (needsBookTitleConfirmation) {
      setTitleDraft(analyzeResponse?.bookInference.title ?? "");
    }
  }, [analyzeResponse?.bookInference.title, needsBookTitleConfirmation]);

  useEffect(() => {
    if (analyzeStatus !== "done" || !analyzeResponse || highlightGuideChecked.current) return;

    highlightGuideChecked.current = true;
    let active = true;
    void shouldShowHighlightGuide(AsyncStorage).then((shouldShow) => {
      if (active) setShowHighlightGuide(shouldShow);
    });

    return () => {
      active = false;
    };
  }, [analyzeResponse, analyzeStatus]);

  useEffect(() => {
    if (!saveToast) return;
    const timer = setTimeout(() => setSaveToast(null), 6500);
    return () => clearTimeout(timer);
  }, [saveToast]);

  useEffect(() => {
    setSaveStatus("idle");
    setSaveToast(null);
  }, [analyzeResponse]);

  function dismissHighlightGuide() {
    setShowHighlightGuide(false);
    void persistHighlightGuideDismissal(AsyncStorage);
  }

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
      <SafeAreaView style={styles.stateShell} edges={["top", "bottom"]}>
        <TouchableOpacity
          accessibilityLabel="Back"
          accessibilityRole="button"
          style={styles.stateBackButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.centered}>
        <View style={styles.errorBanner}>
          <Text style={styles.errorTitle}>Analysis failed</Text>
          <Text style={styles.errorText}>{analyzeError?.message ?? "Something went wrong. Please try again."}</Text>
          {analyzeError?.retryAfterSeconds != null && (
            <Text style={styles.errorSub}>Try again in {analyzeError.retryAfterSeconds}s.</Text>
          )}
        </View>
        <TouchableOpacity
          accessibilityLabel="Retry analysis"
          accessibilityRole="button"
          style={styles.retryButton}
          onPress={() => void analyze()}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (analyzeStatus !== "done" || !analyzeResponse) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>No analysis yet. Capture a passage to begin.</Text>
      </View>
    );
  }

  const response = analyzeResponse;
  const { bookInference, vocab, inBookRefs, realWorldRefs } = response;
  const text = response.normalizedText ?? normalizedText ?? "";
  const totalAnnotations = vocab.length + inBookRefs.length + realWorldRefs.length;
  const displayTitle = confirmedBookTitle ?? bookInference.title ?? "Unknown";
  const segments = renderAnnotatedText(text, vocab, inBookRefs, realWorldRefs);

  async function handleSave() {
    if (saveStatus !== "idle") return;
    if (!user) {
      setSaveToast({ kind: "error", message: "Your session expired. Sign in again before saving." });
      return;
    }

    setSaveStatus("saving");
    setSaveToast(null);
    try {
      await saveNote({
        userId: user.id,
        bookTitle: displayTitle,
        passageText: text,
        annotations: response,
      });
      setSaveStatus("saved");
      setSaveToast({ kind: "success", message: "Saved to Library" });
    } catch (error) {
      setSaveStatus("idle");
      setSaveToast({
        kind: "error",
        message: error instanceof SaveError ? error.message : "The passage could not be saved. Please try again.",
      });
    }
  }

  return (
    <>
    <BlurTargetView ref={blurTargetRef} style={styles.blurTarget}>
    <ImageBackground
      source={paperTexture}
      style={styles.readerPaper}
      imageStyle={styles.readerPaperTexture}
      resizeMode="cover"
    >
    <SafeAreaView style={styles.readerShell} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View style={styles.readerHeader}>
        <TouchableOpacity
          accessibilityLabel="Back"
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.readerHeading}>
          <Text style={styles.readerEyebrow} numberOfLines={1}>{displayTitle}</Text>
          <Text style={styles.readerByline} numberOfLines={1}>
            {authorHint.trim() || "Reading analysis"}
          </Text>
        </View>
        <View style={styles.insightPill}>
          <View style={styles.insightDot} />
          <Text style={styles.insightPillText}>{totalAnnotations} insights</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        style={styles.legendScroll}
        contentContainerStyle={styles.legendContent}
        showsHorizontalScrollIndicator={false}
      >
        <LegendChip marker="H" label="Vocabulary" kind="vocab" />
        <LegendChip marker="U" label="Real-world" kind="realWorld" />
        <LegendChip marker="B" label="In-book" kind="inBook" />
      </ScrollView>

      <View style={styles.readerDivider} />

      <ScrollView
        style={styles.readerScroll}
        contentContainerStyle={styles.readerContent}
        showsVerticalScrollIndicator={false}
      >
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
        {totalAnnotations === 0 && (
          <Text style={styles.empty}>No highlights found.</Text>
        )}
      </ScrollView>

      {saveToast && (
        <View
          accessibilityLiveRegion="polite"
          style={[styles.saveToast, saveToast.kind === "error" && styles.saveToastError]}
        >
          <Text style={styles.saveToastText}>{saveToast.message}</Text>
          {saveToast.kind === "success" && (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => navigation.navigate("Library")}
            >
              <Text style={styles.saveToastAction}>Go to Library</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            accessibilityLabel="Dismiss message"
            accessibilityRole="button"
            onPress={() => setSaveToast(null)}
          >
            <Text style={styles.saveToastClose}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.saveBar}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={saveStatus === "saved" ? "Passage saved" : "Save passage to Library"}
          disabled={saveStatus !== "idle" || needsBookTitleConfirmation}
          style={[styles.saveButton, saveStatus !== "idle" && styles.saveButtonDisabled]}
          onPress={() => void handleSave()}
        >
          {saveStatus === "saving" ? (
            <ActivityIndicator size="small" color={colors.paper} />
          ) : (
            <Text style={styles.saveButtonText}>{saveStatus === "saved" ? "Saved ✓" : "Save passage"}</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.readerTabBar}>
        <ReaderTab icon="▣" label="Text" active />
        <ReaderTab icon="◎" label="Context" />
        <ReaderTab icon="⌄" label="Summary" />
      </View>
    </SafeAreaView>
    </ImageBackground>
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
      onDismiss={() => setSelectedVocab(null)}
    />
    <ReferenceSheet
      selection={selectedReference}
      blurTarget={blurTargetRef}
      onDismiss={() => setSelectedReference(null)}
    />
    <HighlightGuide
      visible={showHighlightGuide && !needsBookTitleConfirmation}
      onDismiss={dismissHighlightGuide}
    />
    </>
  );
}

function HighlightGuide({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onDismiss}
    >
      <Pressable
        accessibilityLabel="Highlight guide. Tap to dismiss."
        accessibilityRole="button"
        style={styles.guideBackdrop}
        onPress={onDismiss}
      >
        <View style={styles.guideCard} pointerEvents="none">
          <Text style={styles.guideEyebrow}>QUICK GUIDE</Text>
          <Text style={styles.guideTitle}>Three ways to explore</Text>
          <View style={styles.guideItems}>
            <LegendChip marker="H" label="Vocabulary" kind="vocab" />
            <LegendChip marker="U" label="Real-world" kind="realWorld" />
            <LegendChip marker="B" label="In-book" kind="inBook" />
          </View>
          <Text style={styles.guideBody}>Tap a highlighted passage to see its definition or context.</Text>
          <Text style={styles.guideDismiss}>Tap anywhere to continue</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

function LegendChip({
  marker,
  label,
  kind,
}: {
  marker: string;
  label: string;
  kind: "vocab" | "realWorld" | "inBook";
}) {
  return (
    <View style={[
      styles.legendChip,
      kind === "realWorld" ? styles.legendChipBlue : styles.legendChipBrown,
    ]}>
      <Text style={[
        styles.legendMarker,
        kind === "realWorld" ? styles.legendMarkerBlue : styles.legendMarkerBrown,
        kind === "inBook" && styles.legendMarkerBold,
      ]}>{marker}</Text>
      <Text style={[
        styles.legendLabel,
        kind === "realWorld" ? styles.legendLabelBlue : styles.legendLabelBrown,
      ]}>{label}</Text>
    </View>
  );
}

function ReaderTab({ icon, label, active = false }: { icon: string; label: string; active?: boolean }) {
  return (
    <View style={styles.readerTab}>
      <Text style={[styles.readerTabIcon, active && styles.readerTabActive]}>{icon}</Text>
      <Text style={[styles.readerTabLabel, active && styles.readerTabActive]}>{label}</Text>
    </View>
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
  onDismiss,
}: {
  selection: VocabSelection;
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
    <Modal
      transparent
      visible={selection !== null}
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onDismiss}
    >
      <View style={styles.modalOverlay}>
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
          <ImageBackground
            source={paperTexture}
            style={styles.dictionarySurface}
            imageStyle={styles.dictionarySurfaceTexture}
            resizeMode="cover"
          >
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
          </ImageBackground>
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

  const closeSheet = useCallback(() => {
    Animated.timing(sheetTranslateY, {
      toValue: 500,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDismiss();
    });
  }, [onDismiss, sheetTranslateY]);

  const dragResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => (
      gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx)
    ),
    onPanResponderMove: (_, gesture) => {
      sheetTranslateY.setValue(Math.max(0, gesture.dy));
    },
    onPanResponderRelease: (_, gesture) => {
      if (shouldDismissReferenceSheet(gesture.dy, gesture.vy)) {
        closeSheet();
        return;
      }
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        damping: 28,
        stiffness: 300,
        mass: 1,
        useNativeDriver: true,
      }).start();
    },
    onPanResponderTerminate: () => {
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        damping: 28,
        stiffness: 300,
        mass: 1,
        useNativeDriver: true,
      }).start();
    },
  }), [closeSheet, sheetTranslateY]);

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
    <Modal
      transparent
      visible={selection !== null}
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={closeSheet}
    >
      <View style={styles.modalOverlay}>
      <ModalBlur blurTarget={blurTarget} />
      <Pressable style={styles.sheetBackdrop} onPress={closeSheet}>
        <Animated.View style={[
          styles.sheetAnimatedContainer,
          { transform: [{ translateY: sheetTranslateY }] },
        ]} {...dragResponder.panHandlers}>
        <Pressable style={styles.sheet}>
          <ImageBackground
            source={paperTexture}
            style={styles.sheetSurface}
            imageStyle={styles.sheetSurfaceTexture}
            resizeMode="cover"
          >
          <View
            accessibilityLabel="Drag down to close"
            accessibilityRole="adjustable"
            style={styles.sheetDragTarget}
          >
            <View style={styles.sheetHandle} />
          </View>
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
              <Text style={[
                styles.sheetTitle,
                isRealWorld ? styles.sheetTitleRealWorld : styles.sheetTitleInBook,
              ]}>{title}</Text>
              {item && <Text style={styles.sheetLabel}>{item.label}</Text>}
            </View>
            <TouchableOpacity style={styles.sheetCloseButton} onPress={closeSheet}>
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
          </ImageBackground>
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
      intensity={6}
      tint="default"
      style={StyleSheet.absoluteFill}
    />
  );
}

const styles = StyleSheet.create({
  blurTarget: { flex: 1, backgroundColor: colors.paper },
  stateShell: { flex: 1, backgroundColor: colors.paper },
  stateBackButton: {
    position: "absolute",
    zIndex: 1,
    top: spacing.lg,
    left: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: { flex: 1 },
  readerPaper: { flex: 1 },
  readerPaperTexture: { opacity: 0.72 },
  readerShell: {
    flex: 1,
    backgroundColor: "rgba(226, 217, 207, 0.42)",
  },
  readerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  backButtonText: {
    color: colors.brown,
    fontSize: 27,
    lineHeight: 28,
    fontWeight: "300",
    marginTop: -2,
  },
  readerHeading: { flex: 1, minWidth: 0 },
  readerEyebrow: {
    color: colors.brown,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "700",
    letterSpacing: 1.35,
    textTransform: "uppercase",
  },
  readerByline: {
    marginTop: 2,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: typography.reading,
    fontWeight: "600",
  },
  insightPill: {
    height: 31,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  insightDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.brown,
  },
  insightPillText: {
    color: colors.brownDeep,
    fontSize: 11,
    fontWeight: "700",
  },
  legendScroll: { flexGrow: 0 },
  legendContent: {
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  legendChip: {
    height: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  legendChipBrown: {
    backgroundColor: colors.brownWash,
    borderColor: "rgba(118, 82, 56, 0.22)",
  },
  legendChipBlue: {
    backgroundColor: colors.blueWash,
    borderColor: "rgba(101, 122, 140, 0.24)",
  },
  legendMarker: { fontSize: 10, lineHeight: 13 },
  legendMarkerBrown: { color: colors.brown },
  legendMarkerBlue: {
    color: colors.blue,
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
  },
  legendMarkerBold: { fontWeight: "800" },
  legendLabel: { fontSize: 10, fontWeight: "600" },
  legendLabelBrown: { color: colors.brown },
  legendLabelBlue: { color: colors.blue },
  readerDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.line,
  },
  readerScroll: { flex: 1 },
  readerContent: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: spacing.xl,
  },
  passageText: {
    fontSize: 17,
    lineHeight: 28,
    color: colors.ink,
    fontFamily: typography.reading,
  },
  vocabText: {
    backgroundColor: colors.amberWash,
    color: colors.ink,
  },
  inBookText: { fontWeight: "800", color: colors.brownDeep },
  realWorldText: {
    color: colors.ink,
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
    textDecorationColor: colors.blue,
  },
  empty: {
    marginTop: spacing.lg,
    fontSize: 14,
    color: colors.inkSoft,
    fontStyle: "italic",
  },
  saveBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: "rgba(246, 241, 234, 0.84)",
  },
  saveButton: {
    minHeight: 44,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brownDeep,
  },
  saveButtonDisabled: {
    opacity: 0.58,
  },
  saveButtonText: {
    color: colors.paper,
    fontSize: 14,
    fontWeight: "700",
  },
  saveToast: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    minHeight: 48,
    borderRadius: radii.medium,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.brownDeep,
  },
  saveToastError: {
    backgroundColor: "#8E1B1B",
  },
  saveToastText: {
    flex: 1,
    color: colors.paper,
    fontSize: 13,
    fontWeight: "600",
  },
  saveToastAction: {
    color: colors.paper,
    fontSize: 13,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  saveToastClose: {
    color: colors.paper,
    fontSize: 22,
    lineHeight: 24,
  },
  readerTabBar: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.glass,
  },
  readerTab: {
    width: 82,
    alignItems: "center",
    gap: 2,
  },
  readerTabIcon: {
    color: colors.inkFaint,
    fontSize: 19,
    lineHeight: 22,
  },
  readerTabLabel: {
    color: colors.inkFaint,
    fontSize: 10,
    fontWeight: "600",
  },
  readerTabActive: { color: colors.brownDeep },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: colors.paper,
  },
  muted: { marginTop: 16, fontSize: 15, color: colors.inkSoft, textAlign: "center" },
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
  errorTitle: { color: "#8E1B1B", fontSize: 20, fontWeight: "700", marginBottom: 6 },
  errorSub: { color: "#C62828", fontSize: 13, marginTop: 4 },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 8,
    backgroundColor: "#6858e9",
  },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  guideBackdrop: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingTop: 150,
    backgroundColor: "rgba(37, 28, 22, 0.32)",
  },
  guideCard: {
    padding: spacing.lg,
    borderRadius: radii.large,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    shadowColor: colors.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  guideEyebrow: {
    color: colors.brown,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  guideTitle: {
    marginTop: 4,
    color: colors.ink,
    fontFamily: typography.reading,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
  },
  guideItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: spacing.md,
  },
  guideBody: {
    marginTop: spacing.md,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  guideDismiss: {
    marginTop: spacing.md,
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: "600",
  },
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
    borderRadius: radii.large,
    backgroundColor: colors.glassStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(86, 57, 37, 0.24)",
    shadowColor: colors.shadow,
    shadowOpacity: 0.24,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  dictionarySurface: {
    overflow: "hidden",
    borderRadius: radii.large,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 16,
    backgroundColor: "rgba(249, 245, 239, 0.84)",
  },
  dictionarySurfaceTexture: {
    opacity: 0.38,
    borderRadius: radii.large,
  },
  popoverPointer: {
    position: "absolute",
    width: 18,
    height: 18,
    backgroundColor: "rgba(246, 240, 232, 0.98)",
    transform: [{ rotate: "45deg" }],
  },
  popoverPointerBelow: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(86, 57, 37, 0.24)",
  },
  popoverPointerAbove: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(86, 57, 37, 0.24)",
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
    color: colors.brown,
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
    color: colors.ink,
  },
  dictionaryPos: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "400",
    color: colors.inkFaint,
    fontStyle: "italic",
  },
  dictionaryCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brownWash,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  dictionaryCloseText: {
    color: colors.brown,
    fontSize: 19,
    lineHeight: 21,
  },
  dictionaryDefinition: {
    fontSize: 13,
    lineHeight: 21,
    color: colors.inkSoft,
    marginBottom: 10,
  },
  dictionaryExampleCard: {
    borderRadius: 13,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: "rgba(118, 82, 56, 0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  dictionaryExample: {
    fontSize: 12,
    lineHeight: 19,
    color: colors.brown,
    fontFamily: typography.reading,
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
    backgroundColor: colors.brownWash,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  dictionaryTagText: {
    fontSize: 11,
    color: colors.brown,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },
  sheetAnimatedContainer: {
    width: "100%",
    maxHeight: "82%",
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    maxHeight: "100%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: "rgba(86, 57, 37, 0.22)",
    backgroundColor: colors.glassStrong,
    shadowColor: colors.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  sheetSurface: {
    maxHeight: "100%",
    overflow: "hidden",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 38,
    backgroundColor: "rgba(249, 245, 239, 0.88)",
  },
  sheetSurfaceTexture: {
    opacity: 0.42,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 36,
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(86, 57, 37, 0.32)",
  },
  sheetDragTarget: {
    height: 36,
    marginTop: -12,
    marginHorizontal: -18,
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: colors.blueWash,
    borderColor: "rgba(101, 122, 140, 0.26)",
  },
  sheetIconInBook: {
    backgroundColor: colors.brownWash,
    borderColor: colors.line,
  },
  sheetIconTextRealWorld: {
    color: colors.blue,
    fontSize: 20,
    fontWeight: "700",
  },
  sheetIconTextInBook: {
    color: colors.brown,
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
    marginBottom: 3,
  },
  sheetTitleRealWorld: { color: colors.blue },
  sheetTitleInBook: { color: colors.brown },
  sheetLabel: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.ink,
  },
  sheetCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brownWash,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  sheetCloseText: {
    color: colors.brown,
    fontSize: 19,
    lineHeight: 21,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 2,
  },
  sheetQuote: {
    borderRadius: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  sheetQuoteRealWorld: {
    backgroundColor: colors.blueWash,
    borderColor: "rgba(101, 122, 140, 0.20)",
  },
  sheetQuoteInBook: {
    backgroundColor: colors.brownWash,
    borderColor: colors.line,
  },
  sheetQuoteTextRealWorld: {
    color: colors.blue,
    fontSize: 13,
    lineHeight: 21,
    fontStyle: "italic",
    fontFamily: typography.reading,
  },
  sheetQuoteTextInBook: {
    color: colors.brown,
    fontSize: 13,
    lineHeight: 21,
    fontStyle: "italic",
    fontFamily: typography.reading,
  },
  sheetBody: {
    fontSize: 13,
    lineHeight: 21,
    color: colors.inkSoft,
    marginBottom: 16,
  },
  sheetInsight: {
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 13,
    backgroundColor: "rgba(118, 82, 56, 0.07)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  sheetInsightLabel: {
    color: colors.brown,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  sheetConfidence: {
    fontSize: 12,
    color: colors.inkFaint,
  },
});
