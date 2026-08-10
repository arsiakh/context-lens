import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ImageBackground,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "../services/supabase/authService";
import { useScanStore } from "../stores/scanStore";
import { shouldDismissReferenceSheet } from "../features/reader/referenceSheetGesture";
import { colors, radii, spacing, typography } from "../ui/theme";

const paperTexture = require("../../assets/textures/paper-grain.png");
type IconName = ComponentProps<typeof Ionicons>["name"];

const placeholderItems: Array<{ label: string; icon: IconName }> = [
  { label: "Profile", icon: "person-outline" },
  { label: "Settings", icon: "settings-outline" },
  { label: "Help", icon: "help-circle-outline" },
  { label: "About", icon: "information-circle-outline" },
];

interface MoreSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function MoreSheet({ visible, onDismiss }: MoreSheetProps) {
  const translateY = useRef(new Animated.Value(620)).current;
  const [message, setMessage] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const close = useCallback(() => {
    Animated.timing(translateY, {
      toValue: 620,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDismiss();
    });
  }, [onDismiss, translateY]);

  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => (
      gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx)
    ),
    onPanResponderMove: (_, gesture) => translateY.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_, gesture) => {
      if (shouldDismissReferenceSheet(gesture.dy, gesture.vy)) {
        close();
        return;
      }
      Animated.spring(translateY, {
        toValue: 0,
        damping: 28,
        stiffness: 300,
        mass: 1,
        useNativeDriver: true,
      }).start();
    },
  }), [close, translateY]);

  useEffect(() => {
    if (!visible) return;
    setMessage(null);
    translateY.setValue(620);
    Animated.spring(translateY, {
      toValue: 0,
      damping: 30,
      stiffness: 290,
      mass: 1,
      useNativeDriver: true,
    }).start();
  }, [translateY, visible]);

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setMessage(null);
    try {
      useScanStore.getState().reset();
      await signOut();
      onDismiss();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign out failed. Please try again.");
      setIsSigningOut(false);
    }
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Animated.View
          style={[styles.animatedSheet, { transform: [{ translateY }] }]}
          {...responder.panHandlers}
        >
          <Pressable style={styles.sheet}>
            <ImageBackground
              source={paperTexture}
              resizeMode="cover"
              style={styles.surface}
              imageStyle={styles.texture}
            >
              <View style={styles.handleTarget}>
                <View style={styles.handle} />
              </View>
              <Text style={styles.eyebrow}>CONTEXT LENS</Text>
              <Text style={styles.title}>More</Text>
              <Text style={styles.subtitle}>Account, support, and app information.</Text>

              <View style={styles.grid}>
                {placeholderItems.map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    accessibilityRole="button"
                    style={styles.item}
                    onPress={() => setMessage(`${item.label} is coming soon.`)}
                  >
                    <View style={styles.iconCircle}>
                      <Ionicons name={item.icon} size={27} color={colors.brownDeep} />
                    </View>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={isSigningOut}
                  style={styles.item}
                  onPress={() => void handleSignOut()}
                >
                  <View style={[styles.iconCircle, styles.signOutCircle]}>
                    {isSigningOut ? (
                      <ActivityIndicator color={colors.brownDeep} />
                    ) : (
                      <Ionicons name="log-out-outline" size={27} color={colors.brownDeep} />
                    )}
                  </View>
                  <Text style={styles.itemLabel}>Sign out</Text>
                </TouchableOpacity>
              </View>

              {message ? <Text style={styles.message}>{message}</Text> : null}
            </ImageBackground>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(36, 28, 22, 0.42)" },
  animatedSheet: { width: "100%" },
  sheet: {
    overflow: "hidden",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: colors.paper,
  },
  surface: { minHeight: 510, paddingHorizontal: spacing.xl, paddingBottom: 36 },
  texture: { opacity: 0.52 },
  handleTarget: { height: 42, alignItems: "center", justifyContent: "center" },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.inkFaint },
  eyebrow: { color: colors.brown, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  title: {
    marginTop: 3,
    color: colors.ink,
    fontFamily: typography.reading,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
  },
  subtitle: { marginTop: 4, color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: spacing.xl, rowGap: 22 },
  item: { width: "33.333%", alignItems: "center", paddingHorizontal: 4 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glassStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  signOutCircle: { backgroundColor: "rgba(118, 82, 56, 0.13)" },
  itemLabel: { marginTop: 8, color: colors.ink, fontSize: 12, fontWeight: "700", textAlign: "center" },
  message: {
    alignSelf: "center",
    marginTop: spacing.xl,
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: radii.pill,
    color: colors.brownDeep,
    backgroundColor: colors.brownWash,
    fontSize: 12,
    fontWeight: "700",
  },
});
