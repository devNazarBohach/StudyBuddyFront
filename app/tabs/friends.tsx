import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import BottomNav from "@/components/BottomNav";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";
import { useAppState } from "@/state/AppState";

function Avatar({ letter }: { letter: string }) {
  return (
    <View style={styles.avatar}>
      <ThemedText style={{ fontWeight: "700" }}>{letter}</ThemedText>
    </View>
  );
}

async function createDirectRoom(username: string) {
  const token = await getToken();

  console.log("TOKEN:", token);
  console.log("API_BASE_URL:", API_BASE_URL);
  console.log("USERNAME TO OPEN CHAT:", username);

  const res = await fetch(`${API_BASE_URL}/room/create-direct`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ username }),
  });

  const text = await res.text();
  console.log("CREATE DIRECT ROOM STATUS:", res.status);
  console.log("CREATE DIRECT ROOM RAW RESPONSE:", text);

  let data;
  try {
    data = JSON.parse(text);
    console.log("CREATE DIRECT ROOM PARSED JSON:", data);
    console.log("CREATE DIRECT ROOM PARSED JSON PRETTY:", JSON.stringify(data, null, 2));
  } catch {
    throw new Error(`Server returned non-JSON: ${text}`);
  }

  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }

  if (!data?.success) {
    throw new Error(data?.message || "Failed to create direct room");
  }

  return data.data;
}

function FakeBottomNav() {
  return (
    <View style={styles.bottomNav}>
      <View style={styles.navItem} />
      <View style={styles.navItem} />
      <View style={styles.navItem} />
      <View style={[styles.navItem, styles.navItemActive]} />
      <View style={styles.navItem} />
    </View>
  );
}

export default function FriendsScreen() {
  const { friends, removeFriend, refreshAll, adminMode } = useAppState();
  const [loadingUsername, setLoadingUsername] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshAll().catch((e) => console.log("AUTO REFRESH ERROR", e));
    }, [refreshAll])
  );

const openDirectChat = async (username: string) => {
  try {
    console.log("OPEN CHAT CLICKED:", username);
    setLoadingUsername(username);

    const room = await createDirectRoom(username);
    console.log("ROOM CREATED/FOUND:", room);

    router.push({
      pathname: "/screens/friends/chats/chat",
      params: {
        roomId: String(room.id),
        username,
      },
    });
  } catch (e: any) {
    console.log("CREATE ROOM ERROR FULL:", e);
    Alert.alert("Error", e?.message ?? "Cannot create direct room");
  } finally {
    setLoadingUsername(null);
  }
};

  console.log("FRIENDS IN UI:", friends);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Friends</ThemedText>

      <Pressable style={styles.sectionBtn} onPress={() => router.push("/screens/friends/chats/friendRequests")}>
        <ThemedText style={{ fontWeight: "600" }}>
          Friend requests {adminMode ? "(mock)" : "(backend)"}
        </ThemedText>
      </Pressable>

      <Pressable style={styles.sectionBtn} onPress={() => router.push("/screens/friends/chats/addFriend")}>
        <ThemedText style={{ fontWeight: "600" }}>Add friend</ThemedText>
      </Pressable>

      {friends.length === 0 ? (
        <ThemedText style={{ opacity: 0.7 }}>
          No friends yet. Accept a request first.
        </ThemedText>
      ) : null}

      <Pressable
        style={styles.sectionBtn}
        onPress={async () => {
          try {
            console.log("REFRESH CLICK");
            await refreshAll();
            Alert.alert("OK", "Refreshed");
          } catch (e: any) {
            console.log("REFRESH ERROR", e);
            Alert.alert("Refresh error", e?.message ?? JSON.stringify(e));
          }
        }}
      >
        <ThemedText style={{ fontWeight: "600" }}>Refresh</ThemedText>
      </Pressable>

      <ThemedText style={{ opacity: 0.7 }}>friends count: {friends.length}</ThemedText>

      {friends.map((f) => (
        <Pressable
          key={f.username}
          style={styles.card}
          onPress={() => openDirectChat(f.username)}
        >
          <ThemedView style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <Avatar letter={(f.displayName?.[0] ?? f.username[0] ?? "?").toUpperCase()} />
            <ThemedView style={{ flex: 1 }}>
              <ThemedText style={{ fontWeight: "700" }}>{f.displayName}</ThemedText>
              <ThemedText style={{ opacity: 0.8 }}>@{f.username}</ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.rowBtns}>
            <Pressable
              style={styles.lightBtn}
              onPress={() => openDirectChat(f.username)}
            >
              <ThemedText>
                {loadingUsername === f.username ? "opening..." : "message"}
              </ThemedText>
            </Pressable>

            <Pressable
              style={styles.lightBtn}
              onPress={() =>
                Alert.alert("Remove friend", `Remove @${f.username}?`, [
                  { text: "Cancel" },
                  {
                    text: "Remove",
                    style: "destructive",
                    onPress: () =>
                      removeFriend(f.username).catch((e) =>
                        Alert.alert("Error", e.message)
                      ),
                  },
                ])
              }
            >
              <ThemedText>remove</ThemedText>
            </Pressable>
          </ThemedView>
        </Pressable>
      ))}

      <BottomNav />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingBottom: 90, gap: 12 },

  sectionBtn: {
    height: 44,
    borderRadius: 10,
    backgroundColor: "#e6e6e6",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  addBtn: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },

  rowBtns: { flexDirection: "row", gap: 10 },

  lightBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#e6e6e6",
    alignItems: "center",
    justifyContent: "center",
  },

  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
  },

  navItem: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },

  navItemActive: {
    borderWidth: 2,
    borderColor: "#111",
    backgroundColor: "#e6e6e6",
  },
});