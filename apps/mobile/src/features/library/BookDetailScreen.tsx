import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { Note } from "../../types";
import type { RootStackParamList } from "../../navigation/RootNavigator";
import { useAuthStore } from "../../stores/authStore";
import { fetchNotesForBook } from "../../services/supabase/library";
import { getNotePreview } from "../../services/supabase/libraryLogic";

type BookDetailRoute = RouteProp<RootStackParamList, "BookDetail">;
type BookDetailNav = NativeStackNavigationProp<RootStackParamList, "BookDetail">;

export default function BookDetailScreen() {
  const route = useRoute<BookDetailRoute>();
  const navigation = useNavigation<BookDetailNav>();
  const user = useAuthStore((state) => state.user);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (!user) {
      setError("Sign in again to view your saved notes.");
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (mode === "refresh") setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      setNotes(await fetchNotesForBook(user.id, route.params.bookId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saved notes could not be loaded. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [route.params.bookId, user]);

  useFocusEffect(
    useCallback(() => {
      void loadNotes();
    }, [loadNotes])
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6858e9" />
        <Text style={styles.muted}>Loading saved notes…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>{route.params.title}</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => void loadNotes()}>
          <Text style={styles.primaryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (notes.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>{route.params.title}</Text>
        <Text style={styles.subtitle}>No saved notes for this book yet.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={notes}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadNotes("refresh")} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>{route.params.title}</Text>
          <Text style={styles.subtitle}>{notes.length} saved {notes.length === 1 ? "note" : "notes"}</Text>
        </View>
      }
      renderItem={({ item, index }) => (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.noteRow}
          onPress={() => navigation.navigate("Reader", {
            savedNote: {
              noteId: item.id,
              bookId: item.bookId,
              bookTitle: route.params.title,
              passageText: item.passageText,
              annotations: item.annotations,
              createdAt: item.createdAt,
            },
          })}
        >
          <Text style={styles.noteIndex}>#{index + 1}</Text>
          <View style={styles.noteText}>
            <Text style={styles.notePreview} numberOfLines={2}>{getNotePreview(item.passageText)}</Text>
            <Text style={styles.noteMeta}>Saved {formatDate(item.createdAt)}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      )}
    />
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
    backgroundColor: "#fff",
  },
  list: { flex: 1, backgroundColor: "#fff" },
  listContent: { padding: 20, paddingBottom: 36 },
  header: { marginBottom: 18 },
  title: { fontSize: 28, fontWeight: "800", color: "#111", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 15, color: "#666", lineHeight: 22, textAlign: "center" },
  muted: { marginTop: 14, color: "#666", fontSize: 15 },
  errorText: { color: "#C62828", fontSize: 15, textAlign: "center", lineHeight: 22 },
  primaryButton: {
    marginTop: 24,
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: "#6858e9",
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  noteRow: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: "#F8F5F0",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(86, 57, 37, 0.14)",
  },
  noteIndex: { width: 34, color: "#765238", fontWeight: "800", fontSize: 13 },
  noteText: { flex: 1, minWidth: 0 },
  notePreview: { color: "#2F2620", fontSize: 15, lineHeight: 21, fontWeight: "600" },
  noteMeta: { marginTop: 6, fontSize: 12, color: "#74675D" },
  chevron: { color: "#765238", fontSize: 28, fontWeight: "300" },
});
