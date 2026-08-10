import type { ComponentProps } from "react";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import ScanScreen from "../features/scan/ScanScreen";
import AnalysisScreen from "../features/analyze/AnalysisScreen";
import LibraryScreen from "../features/library/LibraryScreen";
import MoreSheet from "./MoreSheet";
import { colors, radii } from "../ui/theme";

export type AppTabParamList = {
  Capture: undefined;
  Analysis: undefined;
  Library: undefined;
  More: undefined;
};

type IconName = ComponentProps<typeof Ionicons>["name"];
const icons: Record<keyof AppTabParamList, IconName> = {
  Capture: "camera-outline",
  Analysis: "sparkles-outline",
  Library: "library-outline",
  More: "grid-outline",
};

const Tab = createBottomTabNavigator<AppTabParamList>();

export default function AppTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Capture"
      screenOptions={{ headerShown: false, lazy: false }}
      tabBar={(props) => <ContextLensTabBar {...props} />}
    >
      <Tab.Screen name="Capture" component={ScanScreen} />
      <Tab.Screen name="Analysis" component={AnalysisScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="More" component={MorePlaceholderScreen} />
    </Tab.Navigator>
  );
}

function MorePlaceholderScreen() {
  return <View style={styles.placeholder} />;
}

function ContextLensTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const [moreVisible, setMoreVisible] = useState(false);

  return (
    <>
      <SafeAreaView edges={["bottom"]} style={styles.tabShell}>
        <View style={styles.tabBar}>
          {state.routes.map((route, index) => {
            const focused = state.index === index && route.name !== "More";
            const label = descriptors[route.key]?.options.title ?? route.name;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={{ selected: focused || (route.name === "More" && moreVisible) }}
                accessibilityLabel={`${label} tab`}
                style={styles.tabItem}
                onPress={() => {
                  if (route.name === "More") {
                    setMoreVisible(true);
                    return;
                  }
                  const event = navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
                }}
              >
                <View style={[styles.iconWell, focused && styles.iconWellActive]}>
                  <Ionicons
                    name={icons[route.name as keyof AppTabParamList]}
                    size={21}
                    color={focused || (route.name === "More" && moreVisible) ? colors.brownDeep : colors.inkFaint}
                  />
                </View>
                <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{String(label)}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
      <MoreSheet visible={moreVisible} onDismiss={() => setMoreVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  placeholder: { flex: 1, backgroundColor: colors.paper },
  tabShell: {
    paddingHorizontal: 14,
    paddingTop: 8,
    backgroundColor: colors.paper,
  },
  tabBar: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.large,
    backgroundColor: colors.glassStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  tabItem: { flex: 1, minHeight: 58, alignItems: "center", justifyContent: "center", gap: 2 },
  iconWell: {
    width: 38,
    height: 29,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWellActive: { backgroundColor: colors.brownWash },
  tabLabel: { color: colors.inkFaint, fontSize: 10, fontWeight: "600" },
  tabLabelActive: { color: colors.brownDeep, fontWeight: "800" },
});
