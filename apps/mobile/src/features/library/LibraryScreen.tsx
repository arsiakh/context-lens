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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { Book } from "../../types";
import { useAuthStore } from "../../stores/authStore";
import { fetchBooks } from "../../services/supabase/library";
import { colors } from "../../ui/theme";

export default function LibraryScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((state) => state.user);
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBooks = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (!user) {
      setError("Sign in again to view your Library.");
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (mode === "refresh") setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      setBooks(await fetchBooks(user.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saved books could not be loaded. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadBooks();
    }, [loadBooks])
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brown} />
        <Text style={styles.muted}>Loading saved books…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Library</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => void loadBooks()}>
          <Text style={styles.primaryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (books.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Library</Text>
        <Text style={styles.subtitle}>No saved notes yet. Capture a passage to get started.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("Capture")}>
          <Text style={styles.primaryButtonText}>Capture a passage</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={books}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadBooks("refresh")} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Library</Text>
          <Text style={styles.subtitle}>{books.length} saved {books.length === 1 ? "book" : "books"}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.bookRow}
          onPress={() => navigation.navigate("BookDetail", { bookId: item.id, title: item.title })}
        >
          <View style={styles.bookIcon}>
            <Text style={styles.bookIconText}>{item.title.trim().charAt(0).toUpperCase() || "B"}</Text>
          </View>
          <View style={styles.bookText}>
            <Text style={styles.bookTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.bookMeta}>Saved {formatDate(item.createdAt)}</Text>
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
    backgroundColor: colors.paper,
  },
  list: { flex: 1, backgroundColor: colors.paper },
  listContent: { padding: 20, paddingBottom: 112 },
  header: { marginBottom: 18 },
  title: { fontSize: 30, fontWeight: "800", color: colors.ink, marginBottom: 8 },
  subtitle: { fontSize: 15, color: colors.inkSoft, lineHeight: 22, textAlign: "center" },
  muted: { marginTop: 14, color: colors.inkSoft, fontSize: 15 },
  errorText: { color: "#C62828", fontSize: 15, textAlign: "center", lineHeight: 22 },
  primaryButton: {
    marginTop: 24,
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: colors.brownDeep,
  },
  primaryButtonText: { color: colors.paper, fontWeight: "700", fontSize: 15 },
  bookRow: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: "#F8F5F0",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(86, 57, 37, 0.14)",
  },
  bookIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E9DED2",
  },
  bookIconText: { color: "#563925", fontSize: 18, fontWeight: "800" },
  bookText: { flex: 1, minWidth: 0 },
  bookTitle: { fontSize: 17, fontWeight: "700", color: "#2F2620" },
  bookMeta: { marginTop: 4, fontSize: 12, color: "#74675D" },
  chevron: { color: "#765238", fontSize: 28, fontWeight: "300" },
});
