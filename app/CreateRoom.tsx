import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { roomsApi } from "@/services/api";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput } from "react-native";

export default function CreateChatScreen() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  async function onCreate() {
    const u = username.trim();
    if (!u) return;

    setLoading(true);
    try {
      const room = await roomsApi.createDirect(u);
      router.replace({ pathname: "/chat", params: { roomId: String(room.id) } });
    } catch (e: any) {
      Alert.alert("Create chat error", e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">New chat</ThemedText>
      <ThemedText style={{ opacity: 0.75 }}>
        Enter username to create direct room (invitation)
      </ThemedText>

      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="friend username"
        autoCapitalize="none"
        style={styles.input}
      />

      <Pressable style={styles.btn} onPress={onCreate} disabled={loading}>
        <ThemedText style={styles.btnText}>{loading ? "Creating..." : "Create"}</ThemedText>
      </Pressable>

      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <ThemedText>Back</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, justifyContent: "center" },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 12,
    backgroundColor: "white",
  },
  btn: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
  },
  btnText: { color: "white", fontWeight: "700" },
  backBtn: {
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e6e6e6",
  },
});