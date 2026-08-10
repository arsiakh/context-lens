import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import type { NavigatorScreenParams } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SignInScreen from "../features/auth/SignInScreen";
import BookDetailScreen from "../features/library/BookDetailScreen";
import SavedReaderScreen from "../features/reader/SavedReaderScreen";
import { useAuthStore } from "../stores/authStore";
import type { AnalyzeResponse } from "../types";
import AppTabs from "./AppTabs";
import type { AppTabParamList } from "./AppTabs";
import { colors } from "../ui/theme";

export interface SavedNoteReaderParams {
  noteId: string;
  bookId: string;
  bookTitle: string;
  passageText: string;
  annotations: AnalyzeResponse;
  createdAt: string;
}

export type RootStackParamList = {
  SignIn: undefined;
  AppTabs: NavigatorScreenParams<AppTabParamList> | undefined;
  BookDetail: { bookId: string; title: string };
  SavedReader: { savedNote: SavedNoteReaderParams };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { session, isLoading } = useAuthStore();

  // Show a spinner while the persisted session is being loaded from SecureStore.
  // Without this, users see a flash of the SignIn screen on every cold launch.
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.paper }}>
        <ActivityIndicator size="large" color={colors.brownDeep} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          // Authenticated stack — user is signed in
          <>
            <Stack.Screen name="AppTabs" component={AppTabs} />
            <Stack.Screen name="BookDetail" component={BookDetailScreen} />
            <Stack.Screen name="SavedReader" component={SavedReaderScreen} />
          </>
        ) : (
          // Unauthenticated stack — only SignIn is accessible
          <Stack.Screen name="SignIn" component={SignInScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
