import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { useTheme } from "@/context/ThemeContext";
import { ThemedText } from "./themed-text";

const TABS = [
  { route: "/tabs", label: "Home", icon: "home", iconOutline: "home-outline" },
  { route: "/tabs/chats", label: "Chats", icon: "chatbubble", iconOutline: "chatbubble-outline" },
  { route: "/tabs/blog", label: "Blog", icon: "newspaper", iconOutline: "newspaper-outline" },
  { route: "/tabs/nearby", label: "Nearby", icon: "map", iconOutline: "map-outline" },
  { route: "/tabs/friends", label: "Friends", icon: "people", iconOutline: "people-outline" },
  { route: "/tabs/settings", label: "Settings", icon: "settings", iconOutline: "settings-outline" },
] as const;

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.card, borderTopColor: theme.border },
      ]}
    >
      {TABS.map(({ route, label, icon, iconOutline }) => {
        const active = pathname === route;
        const iconColor = active ? theme.primary : theme.icon;

        return (
          <Pressable
            key={route}
            style={styles.btn}
            onPress={() => router.push(route as any)}
          >
            <Ionicons
              name={active ? icon : iconOutline}
              size={24}
              color={iconColor}
            />
            <ThemedText style={[styles.label, { color: iconColor }]}>
              {label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 78,
    borderTopWidth: 1,
    flexDirection: "row",
    paddingTop: 6,
    paddingBottom: 8,
  },
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    marginTop: 2,
  },
});
