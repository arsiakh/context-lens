import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SignInScreen from "../features/auth/SignInScreen";
import ScanScreen from "../features/scan/ScanScreen";
import ReaderScreen from "../features/reader/ReaderScreen";
import LibraryScreen from "../features/library/LibraryScreen";

export type RootStackParamList = {
  SignIn: undefined;
  Scan: undefined;
  Reader: undefined;
  Library: undefined;
}; //how parents pass down data to child components (constructor arguments in Java) 

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="SignIn">
        <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: "Sign In" }} />
        <Stack.Screen name="Scan" component={ScanScreen} options={{ title: "Scan" }} />
        <Stack.Screen name="Reader" component={ReaderScreen} options={{ title: "Reader" }} />
        <Stack.Screen name="Library" component={LibraryScreen} options={{ title: "Library" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
