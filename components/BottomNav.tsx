import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "./themed-text";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (route: string) => pathname === route;

  return (
    <View style={styles.container}>
      <Pressable style={styles.btn} onPress={() => router.push("/tabs")}>
        <Ionicons
          name={isActive("/tabs") ? "home" : "home-outline"}
          size={24}
          color="#111"
        />
        <ThemedText style={styles.label}>Home</ThemedText>
      </Pressable>

      <Pressable style={styles.btn} onPress={() => router.push("/tabs/chats")}>
        <Ionicons
          name={isActive("/tabs/chats") ? "chatbubble" : "chatbubble-outline"}
          size={24}
          color="#111"
        />
        <ThemedText style={styles.label}>Chats</ThemedText>
      </Pressable>

      <Pressable style={styles.btn} onPress={() => router.push("/tabs/blog")}>
        <Ionicons
          name={isActive("/tabs/blog") ? "newspaper" : "newspaper-outline"}
          size={24}
          color="#111"
        />
        <ThemedText style={styles.label}>Blog</ThemedText>
      </Pressable>

      <Pressable style={styles.btn} onPress={() => router.push("/tabs/nearby")}>
        <Ionicons
          name={isActive("/tabs/nearby") ? "map" : "map-outline"}
          size={24}
          color="#111"
        />
        <ThemedText style={styles.label}>Nearby</ThemedText>
      </Pressable>

      <Pressable style={styles.btn} onPress={() => router.push("/tabs/friends")}>
        <Ionicons
          name={isActive("/tabs/friends") ? "people" : "people-outline"}
          size={24}
          color="#111"
        />
        <ThemedText style={styles.label}>Friends</ThemedText>
      </Pressable>

      <Pressable
        style={styles.btn}
        onPress={() => router.push("/tabs/settings")}
      >
        <Ionicons
          name={isActive("/tabs/settings") ? "settings" : "settings-outline"}
          size={24}
          color="#111"
        />
        <ThemedText style={styles.label}>Settings</ThemedText>
      </Pressable>
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
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
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