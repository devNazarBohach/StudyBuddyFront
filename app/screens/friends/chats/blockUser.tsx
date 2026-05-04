import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";
import { useTheme } from "@/context/ThemeContext";
import { useScreenTracking } from "@/hooks/useScreenTracking";

export default function BlockUserScreen() {
  useScreenTracking("BlockUserScreen");

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  async function blockUser() {
    const cleanUsername = username.trim().replace(/^@/, "");

    if (!cleanUsername) {
      Alert.alert("Error", "Username is required");
      return;
    }

    try {
      setLoading(true);

      const token = await getToken();

      if (!token) {
        Alert.alert("Error", "You are not authorized");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/user/block-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: cleanUsername,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        Alert.alert("Error", result?.message || "Failed to block user");
        return;
      }

      Alert.alert("Success", "User blocked");
      setUsername("");
      router.back();
    } catch (e: any) {
      console.log("BLOCK USER ERROR", e);
      Alert.alert("Error", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Block user</ThemedText>

      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="@username"
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.input,
          {
            backgroundColor: theme.inputBackground,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
        placeholderTextColor={theme.placeholder}
      />

      <Pressable
        style={[
          styles.btn,
          {
            backgroundColor: theme.danger,
            opacity: loading ? 0.6 : 1,
          },
        ]}
        onPress={blockUser}
        disabled={loading}
      >
        <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
          {loading ? "Blocking..." : "Block user"}
        </ThemedText>
      </Pressable>

      <Pressable onPress={() => router.back()} style={{ alignItems: "center" }}>
        <ThemedText type="link">Back</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
    justifyContent: "center",
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },

  btn: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});