import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/context/ThemeContext";

export default function HomeAuthChoiceScreen() {
  const { theme } = useTheme();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Study Buddy
      </ThemedText>

      <ThemedText style={styles.subtitle}>
        Choose how you want to continue
      </ThemedText>

      <Pressable
        style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
        onPress={() => router.push("/auth/login")}
      >
        <ThemedText style={[styles.btnText, { color: theme.onPrimary }]}>Login</ThemedText>
      </Pressable>

      <Pressable
        style={[styles.secondaryBtn, { borderColor: theme.border }]}
        onPress={() => router.push("/auth/register")}
      >
        <ThemedText style={[styles.btnText, { color: theme.text }]}>Create account</ThemedText>
      </Pressable>

      <Pressable
        style={[styles.adminBtn, { backgroundColor: theme.surface }]}
        onPress={() => router.replace("/tabs/friends")}
      >
        <ThemedText style={[styles.btnText, { color: theme.secondaryText }]}>
          Enter as admin
        </ThemedText>
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
  },
  secondaryBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  adminBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnText: { fontWeight: "600" },
});
