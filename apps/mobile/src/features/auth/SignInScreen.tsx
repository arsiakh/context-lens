import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "SignIn">;
};

export default function SignInScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Context Lens</Text>
      <Text style={styles.subtitle}>Sign in to get started</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Scan")}
      >
        <Text style={styles.buttonText}>Continue to Scan (placeholder)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 40 },
  button: { backgroundColor: "#6858e9", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 10 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
