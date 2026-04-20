import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";
import { Ionicons } from "@expo/vector-icons";
import { Client, StompSubscription } from "@stomp/stompjs";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import SockJS from "sockjs-client";

type BackendMessageDTO = {
  id?: number;
  content: string;
  messageType?: string;
  senderUsername?: string;
  sender?: string;
  createdAt?: string;
  photoUrl?: string | null;
  photoContentType?: string | null;
  photoName?: string | null;
};

type WsMessageDTO = {
  id?: number;
  roomId?: number;
  senderUsername?: string;
  sender?: string;
  content: string;
  messageType?: string;
  createdAt?: string;
  photoUrl?: string | null;
  photoContentType?: string | null;
  photoName?: string | null;
};

type ChatMessage = {
  id: string;
  text: string;
  ts: number;
  fromMe: boolean;
  senderUsername?: string;
  messageType: "TEXT" | "PHOTO";
  photoUrl?: string;
  photoContentType?: string;
  photoName?: string;
};

type UploadPhotoResponse = {
  fileUrl?: string;
  url?: string;
  photoUrl?: string;
  fileName?: string;
  name?: string;
  photoName?: string;
  contentType?: string;
  photoContentType?: string;
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function getWsBaseUrl() {
  return API_BASE_URL.replace(/\/$/, "");
}

function normalizeSender(m: { senderUsername?: string; sender?: string }) {
  return m.senderUsername || m.sender || "";
}

function buildFileUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export default function ChatScreen() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const room = Number(roomId);

  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [myUsername, setMyUsername] = useState<string>("");
  const [connected, setConnected] = useState(false);
  const [sendingPhoto, setSendingPhoto] = useState(false);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const stompRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<StompSubscription | null>(null);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 120);
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token || !room) return;

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

      const mapped: ChatMessage[] = data.map((m, index) => {
        const sender = normalizeSender(m);
        const type = m.messageType === "PHOTO" ? "PHOTO" : "TEXT";

        return {
          id: m.id ? String(m.id) : `${sender}-${index}-${uid()}`,
          text: m.content ?? "",
          ts: m.createdAt ? new Date(m.createdAt).getTime() : Date.now() + index,
          fromMe: myUsername ? sender === myUsername : false,
          senderUsername: sender,
          messageType: type,
          photoUrl: m.photoUrl ?? undefined,
          photoContentType: m.photoContentType ?? undefined,
          photoName: m.photoName ?? undefined,
        };
      });

      setMessages(mapped);
      scrollToEnd();
    } catch (e) {
      console.log("LOAD HISTORY ERROR", e);
    }
  }, [room, myUsername, scrollToEnd]);

  const markAsRead = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token || !room) return;

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

  const appendIncomingMessage = useCallback(
    (body: WsMessageDTO) => {
      const sender = normalizeSender(body);
      const type = body.messageType === "PHOTO" ? "PHOTO" : "TEXT";

      setMessages((prev) => [
        ...prev,
        {
          id: body.id ? String(body.id) : uid(),
          text: body.content ?? "",
          ts: body.createdAt ? new Date(body.createdAt).getTime() : Date.now(),
          fromMe: sender === myUsername,
          senderUsername: sender,
          messageType: type,
          photoUrl: body.photoUrl ?? undefined,
          photoContentType: body.photoContentType ?? undefined,
          photoName: body.photoName ?? undefined,
        },
      ]);

      markAsRead();
      scrollToEnd();
    },
    [myUsername, markAsRead, scrollToEnd]
  );

  const disconnectWs = useCallback(async () => {
    try {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    } catch (e) {
      console.log("UNSUBSCRIBE ERROR", e);
    }

    try {
      if (stompRef.current) {
        await stompRef.current.deactivate();
        stompRef.current = null;
      }
    } catch (e) {
      console.log("DEACTIVATE ERROR", e);
    }

    setConnected(false);
  }, []);

  const connectWs = useCallback(async () => {
    try {
      if (!room) return;

      if (stompRef.current?.active || stompRef.current?.connected) {
        console.log("WS ALREADY ACTIVE");
        return;
      }

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

          try {
            subscriptionRef.current?.unsubscribe();
          } catch {}

          subscriptionRef.current = client.subscribe(`/topic/rooms/${room}`, (frame) => {
            try {
              const body: WsMessageDTO = JSON.parse(frame.body);
              appendIncomingMessage(body);
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
          setConnected(false);
        },
        onWebSocketError: (e) => {
          console.log("WS SOCKET ERROR", e);
          setConnected(false);
        },
        onWebSocketClose: () => {
          console.log("WS CLOSED");
          setConnected(false);
        },
      });

      stompRef.current = client;
      client.activate();
    } catch (e) {
      console.log("CONNECT WS ERROR", e);
      setConnected(false);
    }
  }, [room, appendIncomingMessage]);

  useEffect(() => {
    async function init() {
      const token = await getToken();
      if (!token) return;

      try {
        const payloadPart = token.split(".")[1];
        if (payloadPart) {
          const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
          const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
          const decoded = JSON.parse(atob(padded));

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

  useFocusEffect(
    useCallback(() => {
      if (!room || !myUsername) return;

      loadHistory();
      markAsRead();
      connectWs();

      return () => {
        void disconnectWs();
      };
    }, [room, myUsername, loadHistory, markAsRead, connectWs, disconnectWs])
  );

  useEffect(() => {
    scrollToEnd();
  }, [messages.length, scrollToEnd]);

  function sendText() {
    const t = text.trim();
    if (!t) return;

    const client = stompRef.current;

    if (!client || !client.connected) {
      console.log("WS NOT CONNECTED");
      return;
    }

    client.publish({
      destination: "/app/send-message",
      body: JSON.stringify({
        roomId: Number(room),
        content: t,
        messageType: "TEXT",
      }),
    });

    setText("");
  }

  async function pickAndSendPhoto() {
    try {
      const client = stompRef.current;

      if (!client || !client.connected) {
        Alert.alert("Error", "WebSocket isn't connected");
        return;
      }

      if (!room || Number.isNaN(Number(room))) {
        Alert.alert("Error", "Invalid room id");
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("No permission", "Media library permission is required");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.7,
        base64: false,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert("Error", "Can't receive photo");
        return;
      }

      setSendingPhoto(true);

      const token = await getToken();
      if (!token) {
        Alert.alert("Error", "No token");
        return;
      }

      const rawName =
        asset.fileName ||
        asset.uri.split("/").pop() ||
        `photo_${Date.now()}.jpg`;

      const lowerName = rawName.toLowerCase();

      let mimeType = asset.mimeType || "image/jpeg";
      if (!asset.mimeType) {
        if (lowerName.endsWith(".png")) mimeType = "image/png";
        else if (lowerName.endsWith(".webp")) mimeType = "image/webp";
        else mimeType = "image/jpeg";
      }

      const formData = new FormData();

      formData.append("file", {
        uri: asset.uri,
        name: rawName,
        type: mimeType,
      } as any);

      formData.append("roomId", String(room));

      const uploadResponse = await fetch(`${API_BASE_URL}/room/upload-photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const uploadText = await uploadResponse.text();
      console.log("UPLOAD STATUS:", uploadResponse.status);
      console.log("UPLOAD RAW RESPONSE:", uploadText);

      if (!uploadResponse.ok) {
        Alert.alert("Error", uploadText || "Can't upload the photo");
        return;
      }

      let uploadResult: UploadPhotoResponse | null = null;
      try {
        uploadResult = uploadText ? JSON.parse(uploadText) : null;
      } catch (e) {
        console.log("UPLOAD JSON PARSE ERROR:", e);
        Alert.alert("Error", "Upload response is not valid JSON");
        return;
      }

      const uploadedUrl =
        uploadResult?.fileUrl ||
        uploadResult?.url ||
        uploadResult?.photoUrl ||
        null;

      const uploadedName =
        uploadResult?.fileName ||
        uploadResult?.name ||
        uploadResult?.photoName ||
        rawName;

      const uploadedContentType =
        uploadResult?.contentType ||
        uploadResult?.photoContentType ||
        mimeType;

      if (!uploadedUrl) {
        Alert.alert("Error", "Backend did not return file URL");
        return;
      }

      client.publish({
        destination: "/app/send-message",
        body: JSON.stringify({
          roomId: Number(room),
          content: uploadedUrl,
          messageType: "PHOTO",
          fileName: uploadedName,
          contentType: uploadedContentType,
        }),
      });
    } catch (e) {
      console.log("PICK/SEND PHOTO ERROR", e);
      Alert.alert("Error", "Failed to send photo");
    } finally {
      setSendingPhoto(false);
    }
  }

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const imageUri =
      item.messageType === "PHOTO" && item.photoUrl
        ? buildFileUrl(item.photoUrl)
        : null;

    return (
      <View style={[styles.messageWrap, item.fromMe ? styles.messageWrapMe : styles.messageWrapThem]}>
        {!item.fromMe && !!item.senderUsername && (
          <ThemedText style={styles.senderName}>{item.senderUsername}</ThemedText>
        )}

        <View style={[styles.bubble, item.fromMe ? styles.bubbleMe : styles.bubbleThem]}>
          {item.messageType === "PHOTO" && imageUri ? (
            <>
              <Image
                source={{ uri: imageUri }}
                style={styles.photo}
                resizeMode="cover"
                onLoad={() => console.log("IMAGE LOADED", item.id)}
                onError={(e) => console.log("IMAGE LOAD ERROR", item.id, e.nativeEvent)}
              />
              {!!item.text && item.text !== "[PHOTO]" && (
                <ThemedText style={styles.bubbleText}>{item.text}</ThemedText>
              )}
            </>
          ) : (
            <ThemedText style={styles.bubbleText}>{item.text}</ThemedText>
          )}
        </View>
      </View>
    );
  };

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
        <View {...panResponder.panHandlers} style={styles.swipeZone} />

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

          <Pressable
            onPress={() =>
              router.push({
                pathname: "/screens/friends/chats/group-management",
                params: { roomId: String(room) },
              })
            }
            style={styles.plusBtn}
          >
            <Ionicons name="add" size={24} color="#111" />
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.composer}>
          <Pressable
            onPress={pickAndSendPhoto}
            style={styles.attachBtn}
            disabled={sendingPhoto || !connected}
          >
            <Ionicons
              name="attach"
              size={20}
              color={sendingPhoto || !connected ? "#999" : "#111"}
            />
          </Pressable>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor="#888"
            style={styles.input}
            multiline
          />

          <Pressable onPress={sendText} style={styles.sendBtn} disabled={!connected}>
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  plusBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ededed",
    alignItems: "center",
    justifyContent: "center",
  },

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
    marginTop: 6,
  },

  photo: {
    width: 220,
    height: 220,
    borderRadius: 12,
    backgroundColor: "#ddd",
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

  attachBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#ededed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
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