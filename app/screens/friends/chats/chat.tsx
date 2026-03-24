import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";
import { Ionicons } from "@expo/vector-icons";
import { Client } from "@stomp/stompjs";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView, PanResponder, Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View
} from "react-native";
import SockJS from "sockjs-client";

type BackendMessageDTO = {
  content: string;
  messageType?: string;
  senderUsername: string;
};

type WsMessageDTO = {
  id?: number;
  roomId?: number;
  senderUsername: string;
  content: string;
  messageType?: string;
  createdAt?: string;
};

type ChatMessage = {
  id: string;
  text: string;
  ts: number;
  fromMe: boolean;
  senderUsername?: string;
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function getWsBaseUrl() {
  return API_BASE_URL.replace(/\/$/, "");
}

export default function ChatScreen() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const room = Number(roomId);

  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [myUsername, setMyUsername] = useState<string>("");
  const [connected, setConnected] = useState(false);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const stompRef = useRef<Client | null>(null);

  const sorted = useMemo(() => {
    return [...messages];
  }, [messages]);

  const scrollToEnd = () => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);
  };

  const loadHistory = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/room/enter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: String(room),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.log("ENTER ROOM ERROR", result?.message);
        return;
      }

      const data: BackendMessageDTO[] = result.data ?? [];

      const mapped: ChatMessage[] = data.map((m, index) => ({
        id: `${m.senderUsername}-${index}-${uid()}`,
        text: m.content,
        ts: Date.now() + index,
        fromMe: myUsername ? m.senderUsername === myUsername : false,
        senderUsername: m.senderUsername,
      }));

      setMessages(mapped);
      scrollToEnd();
    } catch (e) {
      console.log("LOAD HISTORY ERROR", e);
    }
  }, [room, myUsername]);

  const markAsRead = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      await fetch(`${API_BASE_URL}/room/read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: String(room),
        }),
      });
    } catch (e) {
      console.log("READ ERROR", e);
    }
  }, [room]);

  const connectWs = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const wsUrl = `${getWsBaseUrl()}/ws`;

      const client = new Client({
        webSocketFactory: () => new SockJS(wsUrl),
        reconnectDelay: 5000,
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },
        debug: (str) => {
          console.log("STOMP:", str);
        },
        onConnect: () => {
          console.log("WS CONNECTED");
          setConnected(true);

          client.subscribe(`/topic/rooms/${room}`, (frame) => {
            try {
              const body: WsMessageDTO = JSON.parse(frame.body);

              setMessages((prev) => [
                ...prev,
                {
                  id: body.id ? String(body.id) : uid(),
                  text: body.content,
                  ts: body.createdAt ? new Date(body.createdAt).getTime() : Date.now(),
                  fromMe: body.senderUsername === myUsername,
                  senderUsername: body.senderUsername,
                },
              ]);

              markAsRead();
              scrollToEnd();
            } catch (e) {
              console.log("WS PARSE ERROR", e);
            }
          });
        },
        onDisconnect: () => {
          console.log("WS DISCONNECTED");
          setConnected(false);
        },
        onStompError: (frame) => {
          console.log("STOMP ERROR", frame.headers["message"], frame.body);
        },
        onWebSocketError: (e) => {
          console.log("WS SOCKET ERROR", e);
        },
      });

      client.activate();
      stompRef.current = client;
    } catch (e) {
      console.log("CONNECT WS ERROR", e);
    }
  }, [room, myUsername, markAsRead]);

  useEffect(() => {
    async function init() {
      const token = await getToken();
      if (!token) return;

      try {
        const payloadPart = token.split(".")[1];
        if (payloadPart) {
          const decoded = JSON.parse(atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/")));
          const username =
            decoded?.sub ||
            decoded?.username ||
            decoded?.preferred_username ||
            "";

          setMyUsername(String(username));
        }
      } catch (e) {
        console.log("JWT PARSE ERROR", e);
      }
    }

    init();
  }, []);

  useEffect(() => {
    if (!room || !myUsername) return;

    loadHistory();
    markAsRead();
    connectWs();

    return () => {
      if (stompRef.current) {
        stompRef.current.deactivate();
        stompRef.current = null;
      }
    };
  }, [room, myUsername, loadHistory, markAsRead, connectWs]);

  useFocusEffect(
    useCallback(() => {
      markAsRead();
    }, [markAsRead])
  );

  useEffect(() => {
    scrollToEnd();
  }, [sorted.length]);

  function send() {
    const t = text.trim();
    if (!t) return;

    if (!stompRef.current || !connected) {
      console.log("WS NOT CONNECTED");
      return;
    }

    stompRef.current.publish({
      destination: "/app/send-message",
      body: JSON.stringify({
        roomId: String(room),
        content: t,
        messageType: "TEXT",
      }),
    });

    setText("");
  }

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.messageWrap, item.fromMe ? styles.messageWrapMe : styles.messageWrapThem]}>
      {!item.fromMe && !!item.senderUsername && (
        <ThemedText style={styles.senderName}>{item.senderUsername}</ThemedText>
      )}

      <View style={[styles.bubble, item.fromMe ? styles.bubbleMe : styles.bubbleThem]}>
        <ThemedText style={styles.bubbleText}>{item.text}</ThemedText>
      </View>
    </View>
  );

 const panResponder = useRef(
  PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 20;
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx < -80) {
        router.push({
          pathname: "/screens/friends/chats/members",
          params: { roomId: String(room) },
        });
      }
    },
  })
).current;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
    >
      <ThemedView style={styles.container}>
        <View
        {...panResponder.panHandlers}
         style={styles.swipeZone}
          />

        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111" />
          </Pressable>

          <View style={{ flex: 1 }}>
            <ThemedText style={styles.title}>Room #{room}</ThemedText>
            <ThemedText style={styles.subtitle}>
              {connected ? "connected" : "connecting..."}
            </ThemedText>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor="#888"
            style={styles.input}
            multiline
          />

          <Pressable onPress={send} style={styles.sendBtn}>
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </ThemedView>

      
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  swipeZone: {
  position: "absolute",
  top: 0,
  right: 0,
  width: 28,
  height: "100%",
  zIndex: 999,
},
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
  },

  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ededed",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "#777",
  },

  list: {
    padding: 14,
    paddingBottom: 12,
  },

  messageWrap: {
    marginBottom: 10,
    maxWidth: "82%",
  },
  messageWrapMe: {
    alignSelf: "flex-end",
  },
  messageWrapThem: {
    alignSelf: "flex-start",
  },

  senderName: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    marginLeft: 4,
  },

  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: "#34207E",
  },
  bubbleThem: {
    backgroundColor: "#6960EC",
  },
  bubbleText: {
    color: "#fff",
    fontSize: 15,
  },

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: 16,
    backgroundColor: "#f1f1f1",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111",
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
});