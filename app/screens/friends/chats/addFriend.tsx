import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAppState } from "@/state/AppState";

export default function AddFriendScreen() {
  const [friendUsername, setFriendUsername] = useState("");
  const { sendFriendRequest } = useAppState();

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
        style={styles.input}
        placeholderTextColor="#888"
      />

      <Pressable style={styles.btn} onPress={sendRequest}>
        <ThemedText style={{ color: "white", fontWeight: "600" }}>Send request</ThemedText>
      </Pressable>

      <Pressable onPress={() => router.back()} style={{ alignItems: "center" }}>
        <ThemedText type="link">Back</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, justifyContent: "center" },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "white",
    color: "black",
  },
  btn: {
    height: 48,
    borderRadius: 10,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
});