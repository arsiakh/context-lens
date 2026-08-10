import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, spacing, typography } from "../theme";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

export default function ScreenHeader({ title, subtitle, onBack }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity
          accessibilityLabel="Back"
          accessibilityRole="button"
          style={styles.backButton}
          onPress={onBack}
        >
          <Ionicons name="chevron-back" size={23} color={colors.brownDeep} />
        </TouchableOpacity>
      ) : (
        <View style={styles.backSpacer} />
      )}
      <View style={styles.heading}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View style={styles.backSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  backSpacer: { width: 40 },
  heading: { flex: 1, alignItems: "center" },
  title: {
    color: colors.ink,
    fontFamily: typography.reading,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "700",
  },
  subtitle: { marginTop: 1, color: colors.inkSoft, fontSize: 11, fontWeight: "600" },
});
