/**
 * Ghaafeedi Music — Admin Control Center
 * Tab navigator: Overview / Jobs / Providers / Revenue
 */
import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { C } from "../../lib/adminTheme";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Overview:  "⬡",
    Jobs:      "⚙",
    Providers: "◈",
    Revenue:   "◎",
  };
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.iconText, focused && styles.iconFocused]}>
        {icons[label] ?? "•"}
      </Text>
      <Text style={[styles.labelText, focused && styles.labelFocused]}>
        {label}
      </Text>
    </View>
  );
}

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle:      { backgroundColor: C.surface },
        headerTintColor:  C.gold,
        headerTitleStyle: { fontWeight: "700", fontSize: 16 },
        tabBarStyle:      { backgroundColor: C.surface, borderTopColor: C.border, height: 64 },
        tabBarShowLabel:  false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Admin — Overview",
          tabBarIcon: ({ focused }) => <TabIcon label="Overview" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: "Admin — Jobs",
          tabBarIcon: ({ focused }) => <TabIcon label="Jobs" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="providers"
        options={{
          title: "Admin — Providers",
          tabBarIcon: ({ focused }) => <TabIcon label="Providers" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="revenue"
        options={{
          title: "Admin — Revenue",
          tabBarIcon: ({ focused }) => <TabIcon label="Revenue" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 6,
    gap: 2,
  },
  iconText: {
    fontSize: 20,
    color: "#4A5E8A",
  },
  iconFocused: {
    color: "#D4AF37",
  },
  labelText: {
    fontSize: 9,
    color: "#4A5E8A",
    fontWeight: "600",
  },
  labelFocused: {
    color: "#D4AF37",
  },
});
