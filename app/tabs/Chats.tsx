import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { RoomDTO, roomsApi } from "@/services/api";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

function getRoomTitle(r: RoomDTO) {
  if (r.title) return r.title;
  if (r.directKey) return `Direct: ${r.directKey}`;
  return `Room #${r.id}`;
}

export default function ChatsTab() {
  const [rooms, setRooms] = useState<RoomDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await roomsApi.listDirectRooms();
      setRooms(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Chats</ThemedText>

        <Pressable
          style={styles.plusBtn}
          onPress={() => router.push("./createRoom")}
        >
          <ThemedText style={styles.plusText}>+</ThemedText>
        </Pressable>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={(r) => String(r.id)}
        refreshing={loading}
        onRefresh={load}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              router.push({ pathname: "/chat", params: { roomId: String(item.id) } })
            }
          >
            <View style={styles.avatar}>
              <ThemedText style={{ fontWeight: "700" }}>
                {getRoomTitle(item)[0]?.toUpperCase() ?? "C"}
              </ThemedText>
            </View>

            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontWeight: "700" }}>{getRoomTitle(item)}</ThemedText>
              <ThemedText style={{ opacity: 0.7 }}>Tap to open</ThemedText>
            </View>

            {!!item.unread && item.unread > 0 ? (
              <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>{item.unread}</ThemedText>
              </View>
            ) : (
              <ThemedText style={{ opacity: 0.5 }}> </ThemedText>
            )}
          </Pressable>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  plusBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e6e6e6",
  },
  plusText: { fontSize: 26, fontWeight: "700" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  sep: { height: 1, backgroundColor: "#eee" },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },

  badge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2b6ef2",
    paddingHorizontal: 8,
  },
  badgeText: { color: "white", fontWeight: "700" },
});