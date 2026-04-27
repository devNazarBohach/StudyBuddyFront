import BottomNav from "@/components/BottomNav";
import { ThemedText } from "@/components/themed-text";
import { UserAvatar } from "@/components/UserAvatar";
import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";
import { useTheme } from "@/context/ThemeContext";
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
  const { theme } = useTheme();

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
        setRooms([]);
        return;
      }
      setRooms(result.data ?? []);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInvites = useCallback(async () => {
    try {
      const data = await roomsApi.getMyInvites();
      setInvites(data ?? []);
    } catch {
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
        style={[styles.roomCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() =>
          router.push({
            pathname: "/screens/friends/chats/chat",
            params: { roomId: String(item.id) },
          })
        }
      >
      {item.roomType === "GROUP" ? (
        <View style={[styles.avatar, { backgroundColor: theme.surface }]}>
          <Ionicons name="people-outline" size={22} color={theme.icon} />
        </View>
      ) : (
        <UserAvatar username={title} size={52} />
      )}
        <View style={styles.roomInfo}>
          <ThemedText style={[styles.roomTitle, { color: theme.text }]}>{title}</ThemedText>
          <ThemedText style={[styles.roomSubtitle, { color: theme.secondaryText }]}>
            {getRoomSubtitle(item)}
          </ThemedText>
        </View>
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.primary }]}>
            <ThemedText style={[styles.badgeText, { color: theme.onPrimary }]}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </ThemedText>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <ThemedText style={[styles.headerTitle, { color: theme.text }]}>Chats</ThemedText>
        <Pressable
          style={[styles.plusBtn, { backgroundColor: theme.surface }]}
          onPress={() => router.push("/screens/friends/chats/CreateRoom")}
        >
          <Ionicons name="add" size={28} color={theme.icon} />
        </Pressable>
      </View>

      {loading && rooms.length === 0 ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText style={[styles.loadingText, { color: theme.secondaryText }]}>
            Loading chats...
          </ThemedText>
        </View>
      ) : (
        <>
          <Pressable
            style={[styles.invitesCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => router.push("/screens/friends/chats/groupInvites")}
          >
            <View style={[styles.invitesIconWrap, { backgroundColor: theme.surface }]}>
              <Ionicons name="people-outline" size={28} color={theme.icon} />
            </View>
            <View style={styles.invitesInfo}>
              <ThemedText style={[styles.invitesTitle, { color: theme.text }]}>
                Group invitations
              </ThemedText>
              <ThemedText style={[styles.invitesSubtitle, { color: theme.secondaryText }]}>
                {invites.length} pending invite{invites.length === 1 ? "" : "s"}
              </ThemedText>
            </View>
            <View style={[styles.invitesBadge, { backgroundColor: theme.primary }]}>
              <ThemedText style={[styles.invitesBadgeText, { color: theme.onPrimary }]}>
                {invites.length}
              </ThemedText>
            </View>
          </Pressable>

          {rooms.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="chatbubble-ellipses-outline" size={44} color={theme.secondaryText} />
              <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>No chats yet</ThemedText>
              <ThemedText style={[styles.emptySubtitle, { color: theme.secondaryText }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56, paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTitle: { fontSize: 36, fontWeight: "700" },
  plusBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: { paddingBottom: 110 },
  invitesCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
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
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  invitesInfo: { flex: 1 },
  invitesTitle: { fontSize: 17, fontWeight: "700", marginBottom: 2 },
  invitesSubtitle: { fontSize: 13 },
  invitesBadge: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    marginLeft: 10,
  },
  invitesBadgeText: { fontSize: 13, fontWeight: "700" },
  roomCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
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
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: { fontSize: 17, fontWeight: "700" },
  roomInfo: { flex: 1 },
  roomTitle: { fontSize: 17, fontWeight: "700", marginBottom: 2 },
  roomSubtitle: { fontSize: 13 },
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    marginLeft: 10,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontSize: 14 },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  emptyTitle: { marginTop: 14, fontSize: 20, fontWeight: "700" },
  emptySubtitle: { marginTop: 6, fontSize: 14, textAlign: "center" },
});
