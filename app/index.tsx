import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function HomeAuthChoiceScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Study Buddy
      </ThemedText>

      <ThemedText style={styles.subtitle}>
        Choose how you want to continue
      </ThemedText>

      <Pressable style={styles.primaryBtn} onPress={() => router.push("/auth/login")}>
        <ThemedText style={styles.primaryBtnText}>Login</ThemedText>
      </Pressable>

      <Pressable style={styles.secondaryBtn} onPress={() => router.push("/auth/register")}>
        <ThemedText style={styles.secondaryBtnText}>Create account</ThemedText>
      </Pressable>

      <Pressable style={styles.adminBtn} onPress={() => router.replace("/tabs/friends")}>
        <ThemedText style={styles.adminBtnText}>Enter as admin</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center", gap: 12 },
  title: { marginBottom: 4 },
  subtitle: { marginBottom: 16, opacity: 0.8 },

  primaryBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
  },
  primaryBtnText: { color: "white", fontWeight: "600" },

  secondaryBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#111",
    backgroundColor: "transparent",
  },
  secondaryBtnText: { color: "#111", fontWeight: "600" },

  adminBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e6e6e6",
    marginTop: 8,
  },
  adminBtnText: { fontWeight: "600" },
});