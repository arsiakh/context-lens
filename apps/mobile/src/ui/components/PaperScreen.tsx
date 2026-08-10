import type { PropsWithChildren } from "react";
import { ImageBackground, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Edge } from "react-native-safe-area-context";
import { colors } from "../theme";

const paperTexture = require("../../../assets/textures/paper-grain.png");

interface PaperScreenProps extends PropsWithChildren {
  edges?: Edge[];
  safe?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function PaperScreen({ children, edges = ["top"], safe = true, style }: PaperScreenProps) {
  const content = safe ? (
    <SafeAreaView style={[styles.content, style]} edges={edges}>{children}</SafeAreaView>
  ) : (
    <View style={[styles.content, style]}>{children}</View>
  );

  return (
    <ImageBackground
      source={paperTexture}
      resizeMode="cover"
      style={styles.background}
      imageStyle={styles.texture}
    >
      {content}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: colors.paper },
  texture: { opacity: 0.55 },
  content: { flex: 1, backgroundColor: "rgba(234, 227, 218, 0.42)" },
});
