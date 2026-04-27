import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/context/ThemeContext";
import { useAppState } from "@/state/AppState";

export default function AddFriendScreen() {
  const [friendUsername, setFriendUsername] = useState("");
  const { sendFriendRequest } = useAppState();
  const { theme } = useTheme();

  async function sendRequest() {
    const u = friendUsername.trim().replace(/^@/, "");
    if (!u) return;
    try {
      await sendFriendRequest(u);
      Alert.alert("Success", "Request sent");
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Unknown error");
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Add friend</ThemedText>

      <TextInput
        value={friendUsername}
        onChangeText={setFriendUsername}
        placeholder="@username"
        autoCapitalize="none"
        style={[styles.input, {
          backgroundColor: theme.inputBackground,
          borderColor: theme.border,
          color: theme.text,
        }]}
        placeholderTextColor={theme.placeholder}
      />

      <Pressable style={[styles.btn, { backgroundColor: theme.primary }]} onPress={sendRequest}>
        <ThemedText style={{ color: theme.onPrimary, fontWeight: "600" }}>Send request</ThemedText>
      </Pressable>

      <Pressable onPress={() => router.back()} style={{ alignItems: "center" }}>
        <ThemedText type="link">Back</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, justifyContent: "center" },
  input: { height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  btn: { height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
