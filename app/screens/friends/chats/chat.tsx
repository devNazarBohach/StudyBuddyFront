import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";
import { useTheme } from "@/context/ThemeContext";
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
  const { roomId, username: paramUsername } = useLocalSearchParams<{
    roomId?: string;
    username?: string;
  }>();
  const room = Number(roomId);
  const { theme } = useTheme();

  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [myUsername, setMyUsername] = useState<string>("");
  const [connected, setConnected] = useState(false);
  const [sendingPhoto, setSendingPhoto] = useState(false);
  const [roomTitle, setRoomTitle] = useState<string>(
    paramUsername ? paramUsername : `Room #${room}`
  );
  const [roomType, setRoomType] = useState<"DIRECT" | "GROUP" | null>(null);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const stompRef = useRef<Client | null>(null);
  const subscriptionRef = useRef<StompSubscription | null>(null);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 120);
  }, []);

  // Load room info to get real title
useEffect(() => {
  async function loadRoomInfo() {
    try {
      const token = await getToken();
      if (!token) return;

      // If username was passed directly (from friends screen) — use it
      if (paramUsername) {
        setRoomTitle(paramUsername);
        return;
      }

      // Otherwise fetch room list to determine type
      const res = await fetch(`${API_BASE_URL}/room/all-rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) return;

      const found = (json.data ?? []).find((r: any) => r.id === room);
      if (!found) return;

      setRoomType(found.roomType);

      if (found.roomType === "GROUP") {
        const name = found.message?.trim();
        setRoomTitle(name || `Room #${room}`);
        return;
      }

      if (found.roomType === "DIRECT") {
        // Fetch members to get the other person's username
        const membersRes = await fetch(`${API_BASE_URL}/room/member/${room}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const membersJson = await membersRes.json();
        if (!membersJson.success) return;

        const members: { username: string; role: string }[] = membersJson.data ?? [];
        const other = members.find((m) => m.username !== myUsername);
        if (other) setRoomTitle(other.username);
      }
    } catch {}
  }

  if (myUsername) loadRoomInfo();
}, [room, myUsername, paramUsername]);
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
        body: JSON.stringify({ id: String(room) }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) return;

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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: String(room) }),
      });
    } catch {}
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
    try { subscriptionRef.current?.unsubscribe(); subscriptionRef.current = null; } catch {}
    try {
      if (stompRef.current) { await stompRef.current.deactivate(); stompRef.current = null; }
    } catch {}
    setConnected(false);
  }, []);

  const connectWs = useCallback(async () => {
    try {
      if (!room) return;
      if (stompRef.current?.active || stompRef.current?.connected) return;
      const token = await getToken();
      if (!token) return;

      const client = new Client({
        webSocketFactory: () => new SockJS(`${getWsBaseUrl()}/ws`),
        reconnectDelay: 5000,
        connectHeaders: { Authorization: `Bearer ${token}` },
        debug: (str) => console.log("STOMP:", str),
        onConnect: () => {
          setConnected(true);
          try { subscriptionRef.current?.unsubscribe(); } catch {}
          subscriptionRef.current = client.subscribe(`/topic/rooms/${room}`, (frame) => {
            try { appendIncomingMessage(JSON.parse(frame.body)); } catch {}
          });
        },
        onDisconnect: () => setConnected(false),
        onStompError: () => setConnected(false),
        onWebSocketError: () => setConnected(false),
        onWebSocketClose: () => setConnected(false),
      });

      stompRef.current = client;
      client.activate();
    } catch {
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
          setMyUsername(String(decoded?.sub || decoded?.username || decoded?.preferred_username || ""));
        }
      } catch {}
    }
    init();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!room || !myUsername) return;
      loadHistory();
      markAsRead();
      connectWs();
      return () => { void disconnectWs(); };
    }, [room, myUsername, loadHistory, markAsRead, connectWs, disconnectWs])
  );

  useEffect(() => { scrollToEnd(); }, [messages.length, scrollToEnd]);

  function sendText() {
    const t = text.trim();
    if (!t || !stompRef.current?.connected) return;
    stompRef.current.publish({
      destination: "/app/send-message",
      body: JSON.stringify({ roomId: Number(room), content: t, messageType: "TEXT" }),
    });
    setText("");
  }

  async function pickAndSendPhoto() {
    try {
      const client = stompRef.current;
      if (!client?.connected) { Alert.alert("Error", "WebSocket isn't connected"); return; }
      if (!room || Number.isNaN(Number(room))) { Alert.alert("Error", "Invalid room id"); return; }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { Alert.alert("No permission", "Media library permission is required"); return; }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], allowsEditing: true, quality: 0.7, base64: false,
      });
      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) { Alert.alert("Error", "Can't receive photo"); return; }

      setSendingPhoto(true);
      const token = await getToken();
      if (!token) { Alert.alert("Error", "No token"); return; }

      const rawName = asset.fileName || asset.uri.split("/").pop() || `photo_${Date.now()}.jpg`;
      const lowerName = rawName.toLowerCase();
      let mimeType = asset.mimeType || "image/jpeg";
      if (!asset.mimeType) {
        if (lowerName.endsWith(".png")) mimeType = "image/png";
        else if (lowerName.endsWith(".webp")) mimeType = "image/webp";
        else mimeType = "image/jpeg";
      }

      const formData = new FormData();
      formData.append("file", { uri: asset.uri, name: rawName, type: mimeType } as any);
      formData.append("roomId", String(room));

      const uploadResponse = await fetch(`${API_BASE_URL}/room/upload-photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const uploadText = await uploadResponse.text();
      if (!uploadResponse.ok) { Alert.alert("Error", uploadText || "Can't upload the photo"); return; }

      let uploadResult: UploadPhotoResponse | null = null;
      try { uploadResult = uploadText ? JSON.parse(uploadText) : null; } catch {
        Alert.alert("Error", "Upload response is not valid JSON"); return;
      }

      const uploadedUrl = uploadResult?.fileUrl || uploadResult?.url || uploadResult?.photoUrl || null;
      const uploadedName = uploadResult?.fileName || uploadResult?.name || uploadResult?.photoName || rawName;
      const uploadedContentType = uploadResult?.contentType || uploadResult?.photoContentType || mimeType;

      if (!uploadedUrl) { Alert.alert("Error", "Backend did not return file URL"); return; }

      client.publish({
        destination: "/app/send-message",
        body: JSON.stringify({
          roomId: Number(room), content: uploadedUrl, messageType: "PHOTO",
          fileName: uploadedName, contentType: uploadedContentType,
        }),
      });
    } catch {
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
        <ThemedText style={[styles.senderName, { color: theme.secondaryText }]}>
          {item.senderUsername}
        </ThemedText>
      )}
      <View style={[
        styles.bubble,
        item.fromMe
          ? { backgroundColor: theme.primary }
          : { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
      ]}>
        {item.messageType === "PHOTO" && imageUri ? (
          <>
            <Image source={{ uri: imageUri }} style={styles.photo} resizeMode="cover" />
            {!!item.text && item.text !== "[PHOTO]" && (
              <ThemedText style={[styles.bubbleText, { color: item.fromMe ? theme.onPrimary : theme.text }]}>
                {item.text}
              </ThemedText>
            )}
          </>
        ) : (
          <ThemedText style={[styles.bubbleText, { color: item.fromMe ? theme.onPrimary : theme.text }]}>
            {item.text}
          </ThemedText>
        )}
      </View>
    </View>
  );
};

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dy) < 20,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -80) {
          router.push({ pathname: "/screens/friends/chats/members", params: { roomId: String(room) } });
        }
      },
    })
  ).current;

  const isConnected = connected;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
    >
      <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
        <View {...panResponder.panHandlers} style={styles.swipeZone} />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: theme.surface }]}>
            <Ionicons name="arrow-back" size={24} color={theme.icon} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {roomTitle}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: isConnected ? theme.primary : theme.secondaryText }]}>
              {isConnected ? "connected" : "connecting..."}
            </ThemedText>
          </View>

          <Pressable
            onPress={() => router.push({ pathname: "/screens/friends/chats/group-management", params: { roomId: String(room) } })}
            style={[styles.iconBtn, { backgroundColor: theme.surface }]}
          >
            <Ionicons name="add" size={24} color={theme.icon} />
          </Pressable>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />

        {/* Composer */}
        <View style={[styles.composer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <Pressable
            onPress={pickAndSendPhoto}
            style={[styles.attachBtn, { backgroundColor: theme.surface }]}
            disabled={sendingPhoto || !isConnected}
          >
            <Ionicons
              name="attach"
              size={20}
              color={sendingPhoto || !isConnected ? theme.placeholder : theme.icon}
            />
          </Pressable>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor={theme.placeholder}
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
            multiline
          />

          <Pressable
            onPress={sendText}
            style={[styles.sendBtn, { backgroundColor: isConnected ? theme.primary : theme.border }]}
            disabled={!isConnected}
          >
            <Ionicons name="send" size={18} color={theme.onPrimary} />
          </Pressable>
        </View>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  swipeZone: { position: "absolute", top: 0, right: 0, width: 28, height: "100%", zIndex: 999 },
  container: { flex: 1 },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { marginTop: 2, fontSize: 13 },
  list: { padding: 14, paddingBottom: 12 },
  messageWrap: { marginBottom: 10, maxWidth: "82%" },
  messageWrapMe: { alignSelf: "flex-end" },
  messageWrapThem: { alignSelf: "flex-start" },
  senderName: { fontSize: 12, marginBottom: 4, marginLeft: 4 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { fontSize: 15, marginTop: 2 },
  photo: { width: 220, height: 220, borderRadius: 12 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 12, paddingTop: 10, paddingBottom: Platform.OS === "ios" ? 24 : 12, borderTopWidth: 1 },
  attachBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  input: { flex: 1, minHeight: 46, maxHeight: 120, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  sendBtn: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
});