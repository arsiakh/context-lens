import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SignInScreen from "../features/auth/SignInScreen";
import ScanScreen from "../features/scan/ScanScreen";
import ReaderScreen from "../features/reader/ReaderScreen";
import LibraryScreen from "../features/library/LibraryScreen";
import { useAuthStore } from "../stores/authStore";

export type RootStackParamList = {
  SignIn: undefined;
  Scan: undefined;
  Reader: undefined;
  Library: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { session, isLoading } = useAuthStore();

  // Show a spinner while the persisted session is being loaded from SecureStore.
  // Without this, users see a flash of the SignIn screen on every cold launch.
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {session ? (
          // Authenticated stack — user is signed in
          <>
            <Stack.Screen name="Scan" component={ScanScreen} options={{ title: "Scan" }} />
            <Stack.Screen name="Reader" component={ReaderScreen} options={{ title: "Reader" }} />
            <Stack.Screen name="Library" component={LibraryScreen} options={{ title: "Library" }} />
          </>
        ) : (
          // Unauthenticated stack — only SignIn is accessible
          <Stack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
