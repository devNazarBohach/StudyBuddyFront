import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import BottomNav from "@/components/BottomNav";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { UserAvatar } from "@/components/UserAvatar";
import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";
import { useTheme } from "@/context/ThemeContext";
import { useAppState } from "@/state/AppState";

async function createDirectRoom(username: string) {
  const token = await getToken();
  const res = await fetch(`${API_BASE_URL}/room/create-direct`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ username }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Server returned non-JSON: ${text}`); }
  if (!res.ok || !data?.success) throw new Error(data?.message || `HTTP ${res.status}`);
  return data.data;
}

export default function FriendsScreen() {
  const { friends, removeFriend, refreshAll, adminMode } = useAppState();
  const [loadingUsername, setLoadingUsername] = useState<string | null>(null);
  const { theme } = useTheme();

  useFocusEffect(
    useCallback(() => {
      refreshAll().catch((e) => console.log("AUTO REFRESH ERROR", e));
    }, [refreshAll])
  );

  const openDirectChat = async (username: string) => {
    try {
      setLoadingUsername(username);
      const room = await createDirectRoom(username);
      router.push({ pathname: "/screens/friends/chats/chat", params: { roomId: String(room.id), username } });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Cannot create direct room");
    } finally {
      setLoadingUsername(null);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Friends</ThemedText>

      <Pressable style={[styles.sectionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => router.push("/screens/friends/chats/friendRequests")}>
        <ThemedText style={{ fontWeight: "600", color: theme.text }}>
          Friend requests {adminMode ? "(mock)" : "(backend)"}
        </ThemedText>
      </Pressable>

      <Pressable style={[styles.sectionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => router.push("/screens/friends/chats/addFriend")}>
        <ThemedText style={{ fontWeight: "600", color: theme.text }}>Add friend</ThemedText>
      </Pressable>

      {friends.length === 0 && (
        <ThemedText style={{ opacity: 0.7, color: theme.secondaryText }}>
          No friends yet. Accept a request first.
        </ThemedText>
      )}

      <Pressable style={[styles.sectionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={async () => {
          try { await refreshAll(); Alert.alert("OK", "Refreshed"); }
          catch (e: any) { Alert.alert("Refresh error", e?.message ?? JSON.stringify(e)); }
        }}>
        <ThemedText style={{ fontWeight: "600", color: theme.text }}>Refresh</ThemedText>
      </Pressable>

      <ThemedText style={{ opacity: 0.7, color: theme.secondaryText }}>
        friends count: {friends.length}
      </ThemedText>

      {friends.map((f) => (
        <Pressable key={f.username} style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}
          onPress={() => openDirectChat(f.username)}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <UserAvatar username={f.username} size={44} />
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontWeight: "700", color: theme.text }}>{f.displayName}</ThemedText>
              <ThemedText style={{ color: theme.secondaryText }}>@{f.username}</ThemedText>
            </View>
          </View>
          <View style={styles.rowBtns}>
            <Pressable style={[styles.lightBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => openDirectChat(f.username)}>
              <ThemedText style={{ color: theme.text }}>
                {loadingUsername === f.username ? "opening..." : "message"}
              </ThemedText>
            </Pressable>
            <Pressable style={[styles.lightBtn, { backgroundColor: theme.danger + "18", borderColor: theme.danger }]}
              onPress={() => Alert.alert("Remove friend", `Remove @${f.username}?`, [
                { text: "Cancel" },
                { text: "Remove", style: "destructive", onPress: () => removeFriend(f.username).catch((e) => Alert.alert("Error", e.message)) },
              ])}>
              <ThemedText style={{ color: theme.danger }}>remove</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      ))}

      <BottomNav />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingBottom: 90, gap: 12 },
  sectionBtn: { height: 44, borderRadius: 10, justifyContent: "center", paddingHorizontal: 12, borderWidth: 1 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  rowBtns: { flexDirection: "row", gap: 10 },
  lightBtn: { flex: 1, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
});
