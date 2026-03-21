import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";

type ChatMessage = {
  id: string;
  text: string;
  ts: number;
  fromMe: boolean;
  senderUsername?: string;
};

type EnterMessageDTO = {
  content: string;
  messageType: string;
  senderUsername: string;
};

type WsMessageDTO = {
  id: number;
  roomId: number;
  senderUsername: string;
  content: string;
  messageType: string;
  createdAt: string;
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

async function enterRoom(roomId: string) {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}/room/enter`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ id: roomId }),
  });

  const text = await res.text();
  console.log("ENTER ROOM STATUS:", res.status);
  console.log("ENTER ROOM RAW RESPONSE:", text);

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server returned non-JSON: ${text}`);
  }

  if (!res.ok || !data?.success) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }

  return data.data as EnterMessageDTO[];
}

async function readRoom(roomId: string) {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}/room/read`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ id: roomId }),
  });

  const text = await res.text();
  console.log("READ ROOM STATUS:", res.status);
  console.log("READ ROOM RAW RESPONSE:", text);

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server returned non-JSON: ${text}`);
  }

  if (!res.ok || !data?.success) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }

  return data.data;
}

export default function ChatScreen() {
  const { username, roomId } = useLocalSearchParams<{
    username?: string;
    roomId?: string;
  }>();

  const peer = (username ?? "unknown").toString();
  const roomIdStr = (roomId ?? "").toString();

  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [myUsername, setMyUsername] = useState<string>("");
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const stompRef = useRef<Client | null>(null);

  const sorted = useMemo(
    () => [...messages].sort((a, b) => a.ts - b.ts),
    [messages]
  );

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [sorted.length]);

  useEffect(() => {
    let active = true;

    async function init() {
      try {
        if (!roomIdStr) {
          throw new Error("roomId is missing");
        }

        const token = await getToken();
        if (!token) {
          throw new Error("token missing");
        }

        const payload = JSON.parse(atob(token.split(".")[1]));
        const me = payload?.sub?.toString?.() ?? "";
        if (active) setMyUsername(me);

        const history = await enterRoom(roomIdStr);

        if (!active) return;

        const mapped: ChatMessage[] = history.map((m, idx) => ({
          id: `history-${idx}-${m.senderUsername}-${m.content}`,
          text: m.content,
          ts: Date.now() + idx,
          fromMe: m.senderUsername === me,
          senderUsername: m.senderUsername,
        }));

        setMessages(mapped);

        await readRoom(roomIdStr);

        const wsBase = API_BASE_URL.replace(/^http/, "ws");
        const client = new Client({
          webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`),
          reconnectDelay: 5000,
          connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
          debug: (msg) => console.log("STOMP:", msg),
          onConnect: () => {
            console.log("WS CONNECTED");

            client.subscribe(`/topic/rooms/${roomIdStr}`, (frame) => {
              console.log("WS MESSAGE RAW:", frame.body);

              try {
                const msg: WsMessageDTO = JSON.parse(frame.body);

                setMessages((prev) => {
                  const exists = prev.some((m) => m.id === String(msg.id));
                  if (exists) return prev;

                  return [
                    ...prev,
                    {
                      id: String(msg.id),
                      text: msg.content,
                      ts: new Date(msg.createdAt).getTime(),
                      fromMe: msg.senderUsername === me,
                      senderUsername: msg.senderUsername,
                    },
                  ];
                });

                if (msg.senderUsername !== me) {
                  readRoom(roomIdStr).catch((e) =>
                    console.log("AUTO READ ERROR:", e)
                  );
                }
              } catch (e) {
                console.log("WS PARSE ERROR:", e);
              }
            });
          },
          onStompError: (frame) => {
            console.log("STOMP ERROR:", frame.headers, frame.body);
          },
          onWebSocketError: (e) => {
            console.log("WS ERROR:", e);
          },
        });

        client.activate();
        stompRef.current = client;
      } catch (e: any) {
        console.log("CHAT INIT ERROR:", e);
        Alert.alert("Chat error", e?.message ?? "Failed to open chat");
      }
    }

    init();

    return () => {
      active = false;
      stompRef.current?.deactivate();
      stompRef.current = null;
    };
  }, [roomIdStr]);

  function send() {
    const t = text.trim();
    if (!t) return;

    if (!stompRef.current?.connected) {
      Alert.alert("Error", "WebSocket is not connected yet");
      return;
    }

    stompRef.current.publish({
      destination: "/app/send-message",
      body: JSON.stringify({
        roomId: roomIdStr,
        content: t,
        messageType: "TEXT",
      }),
    });

    setText("");
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={{ fontWeight: "700" }}>‹</ThemedText>
          </Pressable>

          <ThemedView style={{ flex: 1 }}>
            <ThemedText style={styles.title}>@{peer}</ThemedText>
            <ThemedText style={styles.subtitle}>
              room #{roomIdStr || "?"}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <FlatList
          ref={listRef}
          data={sorted}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.fromMe ? styles.bubbleMe : styles.bubbleThem,
              ]}
            >
              {!item.fromMe ? (
                <ThemedText style={styles.sender}>
                  @{item.senderUsername}
                </ThemedText>
              ) : null}

              <ThemedText style={styles.bubbleText}>{item.text}</ThemedText>

              <ThemedText style={styles.time}>
                {new Date(item.ts).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
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
            <ThemedText style={{ color: "white", fontWeight: "700" }}>
              Send
            </ThemedText>
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

  bubbleMe: { alignSelf: "flex-end", backgroundColor: "#0000FF" },
  bubbleThem: { alignSelf: "flex-start", backgroundColor: "#6960EC" },

  sender: {
    color: "#fff",
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 4,
    fontWeight: "700",
  },

  bubbleText: { color: "#fff" },
  time: { opacity: 0.6, marginTop: 6, fontSize: 12, color: "#fff" },

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