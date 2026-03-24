import BottomNav from "@/components/BottomNav";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";
import { InviteDTO, roomsApi } from "@/services/roomApi";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

type RoomDTO = {
  id: number;
  roomType?: "DIRECT" | "GROUP";
  directKey?: string | null;
  message?: string | null;
  unread?: number;
};

function getRoomTitle(room: RoomDTO) {
  if (room.message && room.message.trim() !== "") return room.message;
  return `Room #${room.id}`;
}

function getRoomSubtitle(room: RoomDTO) {
  if (room.roomType === "DIRECT") return "Direct chat";
  if (room.roomType === "GROUP") return "Group chat";
  return "Chat";
}

function getInitials(title: string) {
  const words = title.trim().split(" ").filter(Boolean);

  if (words.length === 0) return "C";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export default function ChatsTab() {
  const [rooms, setRooms] = useState<RoomDTO[]>([]);
  const [invites, setInvites] = useState<InviteDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRooms = useCallback(async () => {
    try {
      setLoading(true);

      const token = await getToken();

      if (!token) {
        Alert.alert("Помилка", "Токен не знайдено");
        setRooms([]);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/room/all-rooms`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.log("rooms load error", result?.message);
        setRooms([]);
        return;
      }

      setRooms(result.data ?? []);
    } catch (error) {
      console.log("Failed to load rooms", error);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInvites = useCallback(async () => {
    try {
      const data = await roomsApi.getMyInvites();
      setInvites(data ?? []);
    } catch (error) {
      console.log("Failed to load invites", error);
      setInvites([]);
    }
  }, []);

  useEffect(() => {
    loadRooms();
    loadInvites();
  }, [loadRooms, loadInvites]);

  useFocusEffect(
    useCallback(() => {
      loadRooms();
      loadInvites();
    }, [loadRooms, loadInvites])
  );

  const renderItem = ({ item }: { item: RoomDTO }) => {
    const title = getRoomTitle(item);
    const unreadCount = item.unread ?? 0;

    return (
      <Pressable
        style={styles.roomCard}
        onPress={() =>
          router.push({
            pathname: "/screens/friends/chats/chat",
            params: { roomId: String(item.id) },
          })
        }
      >
        <View style={styles.avatar}>
          {item.roomType === "GROUP" ? (
            <Ionicons name="people-outline" size={22} color="#222" />
          ) : (
            <ThemedText style={styles.avatarText}>{getInitials(title)}</ThemedText>
          )}
        </View>

        <View style={styles.roomInfo}>
          <ThemedText style={styles.roomTitle}>{title}</ThemedText>
          <ThemedText style={styles.roomSubtitle}>{getRoomSubtitle(item)}</ThemedText>
        </View>

        {unreadCount > 0 && (
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </ThemedText>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Chats</ThemedText>

        <Pressable
          style={styles.plusBtn}
          onPress={() => router.push("/screens/friends/chats/CreateRoom")}
        >
          <Ionicons name="add" size={28} color="#111" />
        </Pressable>
      </View>

      {loading && rooms.length === 0 ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" />
          <ThemedText style={styles.loadingText}>Loading chats...</ThemedText>
        </View>
      ) : (
        <>
          <Pressable
            style={styles.invitesCard}
            onPress={() => router.push("/screens/friends/chats/groupInvites")}
          >
            <View style={styles.invitesIconWrap}>
              <Ionicons name="people-outline" size={28} color="#222" />
            </View>

            <View style={styles.invitesInfo}>
              <ThemedText style={styles.invitesTitle}>Group invitations</ThemedText>
              <ThemedText style={styles.invitesSubtitle}>
                {invites.length} pending invite{invites.length === 1 ? "" : "s"}
              </ThemedText>
            </View>

            <View style={styles.invitesBadge}>
              <ThemedText style={styles.invitesBadgeText}>{invites.length}</ThemedText>
            </View>
          </Pressable>

          {rooms.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="chatbubble-ellipses-outline" size={44} color="#999" />
              <ThemedText style={styles.emptyTitle}>No chats yet</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                Create a group or direct room to start chatting
              </ThemedText>
            </View>
          ) : (
            <FlatList
              data={rooms}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshing={loading}
              onRefresh={async () => {
                await loadRooms();
                await loadInvites();
              }}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            />
          )}
        </>
      )}

      <BottomNav />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 56,
    paddingHorizontal: 16,
    backgroundColor: "#f7f7f7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: "700",
    color: "#111",
  },
  plusBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#e9e9e9",
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: 110,
  },
  invitesCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  invitesIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#e4e4e4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  invitesInfo: {
    flex: 1,
  },
  invitesTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    marginBottom: 2,
  },
  invitesSubtitle: {
    fontSize: 13,
    color: "#777",
  },
  invitesBadge: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#5b5757",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    marginLeft: 10,
  },
  invitesBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  roomCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#e4e4e4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
  },
  roomInfo: {
    flex: 1,
  },
  roomTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    marginBottom: 2,
  },
  roomSubtitle: {
    fontSize: 13,
    color: "#777",
  },
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2b6ef2",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    marginLeft: 10,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    color: "#666",
    fontSize: 14,
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#777",
    textAlign: "center",
  },
});