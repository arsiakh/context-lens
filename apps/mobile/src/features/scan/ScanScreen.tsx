import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Scan">;
};

export default function ScanScreen({ navigation }: Props) { //automatically injects navigation prop
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan</Text>
      <Text style={styles.subtitle}>Camera preview will appear here</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Reader")}
      >
        <Text style={styles.buttonText}>Go to Reader (placeholder)</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={() => navigation.navigate("Library")} //expects a function to call when button is tapped, () => us the function being passed inline
      >
        <Text style={styles.buttonText}>Go to Library (placeholder)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 40 },
  button: { backgroundColor: "#6858e9", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 10, marginBottom: 12 },
  secondaryButton: { backgroundColor: "#444" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
