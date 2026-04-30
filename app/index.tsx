import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getToken } from "@/constants/tokens";
import { useTheme } from "@/context/ThemeContext";
import { useScreenTracking } from "@/hooks/useScreenTracking";

export default function HomeAuthChoiceScreen() {
  useScreenTracking("HomeAuthChoiceScreen");
  const { theme } = useTheme();

  useEffect(() => {
    const checkToken = async () => {
      const token = await getToken();

      if (token) {
        router.replace("/tabs/blog");
      }
    };

    checkToken();
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Study Buddy
      </ThemedText>

      <ThemedText style={styles.subtitle}>
        Choose how you want to continue
      </ThemedText>

      <Pressable
        style={[
          styles.blogBtn,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
        onPress={() => router.push("/tabs/blog")}
      >
        <ThemedText style={[styles.btnText, { color: theme.text }]}>
          Continue to blogs
        </ThemedText>
      </Pressable>

      <Pressable
        style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
        onPress={() => router.push("/auth/login")}
      >
        <ThemedText style={[styles.btnText, { color: theme.onPrimary }]}>
          Login
        </ThemedText>
      </Pressable>

      <Pressable
        style={[styles.secondaryBtn, { borderColor: theme.border }]}
        onPress={() => router.push("/auth/register")}
      >
        <ThemedText style={[styles.btnText, { color: theme.text }]}>
          Create account
        </ThemedText>
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

  blogBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
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