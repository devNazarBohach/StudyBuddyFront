import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

type ChatMessage = {
  id: string;
  text: string;
  ts: number;
  fromMe: boolean;
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export default function ChatScreen() {
  const { username } = useLocalSearchParams<{ username?: string }>();
  const peer = (username ?? "unknown").toString();

  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: uid(), text: `Chat with @${peer}`, ts: Date.now() - 60_000, fromMe: false },
    { id: uid(), text: "This is a mock chat screen. Next step: connect backend.", ts: Date.now() - 30_000, fromMe: false },
  ]);

  const listRef = useRef<FlatList<ChatMessage>>(null);

  const sorted = useMemo(
    () => [...messages].sort((a, b) => a.ts - b.ts),
    [messages]
  );

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [sorted.length]);

  function send() {
    const t = text.trim();
    if (!t) return;

    setMessages((prev) => [
      ...prev,
      { id: uid(), text: t, ts: Date.now(), fromMe: true },
      { id: uid(), text: "delivered (mock)", ts: Date.now() + 200, fromMe: false },
    ]);

    setText("");
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={{ fontWeight: "700" }}>‹</ThemedText>
          </Pressable>

          <ThemedView style={{ flex: 1 }}>
            <ThemedText style={styles.title}>@{peer}</ThemedText>
            <ThemedText style={styles.subtitle}>online (mock)</ThemedText>
          </ThemedView>
        </ThemedView>

        <FlatList
          ref={listRef}
          data={sorted}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.fromMe ? styles.bubbleMe : styles.bubbleThem]}>
              <ThemedText style={styles.bubbleText}>{item.text}</ThemedText>
              <ThemedText style={styles.time}>
                {new Date(item.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </ThemedText>
            </View>
          )}
        />

        <ThemedView style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor="#888"
            style={styles.input}
            multiline
          />

          <Pressable onPress={send} style={styles.sendBtn}>
            <ThemedText style={{ color: "white", fontWeight: "700" }}>Send</ThemedText>
          </Pressable>
        </ThemedView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#e6e6e6",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { opacity: 0.7, marginTop: 2 },

  list: { padding: 12, gap: 10, paddingBottom: 10 },

  bubble: {
    maxWidth: "80%",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e2e2e2",
  },
  bubbleMe: { alignSelf: "flex-end", backgroundColor: "#111" },
  bubbleThem: { alignSelf: "flex-start", backgroundColor: "#fff" },

  bubbleText: { color: "#000" },
  time: { opacity: 0.6, marginTop: 6, fontSize: 12 },

  composer: {
    flexDirection: "row",
    gap: 10,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 12,
    backgroundColor: "#f2f2f2",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
});