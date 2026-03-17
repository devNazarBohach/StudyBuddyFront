import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "./themed-text";

export default function BottomNav() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Pressable style={styles.btn} onPress={() => router.push("/tabs")}>
        <Ionicons name="home-outline" size={24} />
        <ThemedText>Home</ThemedText>
      </Pressable>

      <Pressable style={styles.btn} onPress={() => router.push("/tabs/Chats")}>
        <Ionicons name="chatbubble-outline" size={24} />
        <ThemedText>Chats</ThemedText>
      </Pressable>

      <Pressable style={styles.btn} onPress={() => router.push("/friends")}>
        <Ionicons name="people-outline" size={24} />
        <ThemedText>Friends</ThemedText>
      </Pressable>

      <Pressable style={styles.btn} onPress={() => router.push("/tabs/settings")}>
        <Ionicons name="settings-outline" size={24} />
        <ThemedText>Settings</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "white",
  },
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});