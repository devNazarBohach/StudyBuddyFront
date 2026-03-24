import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    View,
} from "react-native";

type MemberDTO = {
  username: string;
  role: string;
};

export default function MembersScreen() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const room = Number(roomId);

  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [myUsername, setMyUsername] = useState("");

  useEffect(() => {
    decodeMe();
    loadMembers();
  }, [roomId]);

  async function decodeMe() {
    try {
      const token = await getToken();
      if (!token) return;

      const payloadPart = token.split(".")[1];
      if (payloadPart) {
        const decoded = JSON.parse(
          atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/"))
        );

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

  async function loadMembers() {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/room/member/${room}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        Alert.alert("Error", result?.message || "Failed to load members");
        return;
      }

      setMembers(result.data ?? []);
    } catch (e) {
      console.log("LOAD MEMBERS ERROR", e);
      Alert.alert("Error", "Failed to load members");
    } finally {
      setLoading(false);
    }
  }

  async function castOutMember(username: string) {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/room/kick-member`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomId: String(room),
          username: username,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        Alert.alert("Error", result?.message || "Failed to remove member");
        return;
      }

      setMembers((prev) => prev.filter((m) => m.username !== username));
      Alert.alert("Success", `${username} was removed`);
    } catch (e) {
      console.log("KICK MEMBER ERROR", e);
      Alert.alert("Error", "Failed to remove member");
    }
  }

  function confirmCastOut(username: string) {
    Alert.alert(
      "Cast out member",
      `Remove ${username} from this room?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Cast out",
          style: "destructive",
          onPress: () => castOutMember(username),
        },
      ]
    );
  }

  const renderItem = ({ item }: { item: MemberDTO }) => {
    const isMe = item.username === myUsername;

    return (
      <View style={styles.card}>
        <View style={styles.avatar}>
          <ThemedText style={styles.avatarText}>
            {item.username?.charAt(0)?.toLowerCase() || "u"}
          </ThemedText>
        </View>

        <View style={styles.info}>
          <ThemedText style={styles.name}>{item.username}</ThemedText>
          <ThemedText style={styles.handle}>@{item.username}</ThemedText>
        </View>

        <View style={styles.rightBlock}>
          <ThemedText style={styles.role}>{item.role?.toLowerCase()}</ThemedText>

          {!isMe && (
            <Pressable
              style={styles.kickBtn}
              onPress={() => confirmCastOut(item.username)}
            >
              <ThemedText style={styles.kickText}>cast out</ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color="#111" />
        </Pressable>

        <ThemedText style={styles.headerTitle}>Members</ThemedText>

        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#111" />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item, index) => `${item.username}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f6f6",
  },

  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "500",
    color: "#111",
  },

  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  list: {
    paddingBottom: 20,
  },

  separator: {
    height: 1,
    backgroundColor: "#222",
  },

  card: {
    minHeight: 118,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 16,
    backgroundColor: "#f6f6f6",
  },

  avatar: {
    width: 86,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 2,
  },
  avatarText: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#d9d9d9",
    textAlign: "center",
    textAlignVertical: "center",
    lineHeight: 52,
    fontSize: 22,
    color: "#111",
    overflow: "hidden",
  },

  info: {
    flex: 1,
    paddingTop: 2,
  },
  name: {
    fontSize: 20,
    color: "#111",
  },
  handle: {
    marginTop: 2,
    fontSize: 18,
    color: "#111",
  },

  rightBlock: {
    width: 140,
    alignItems: "center",
  },
  role: {
    fontSize: 18,
    color: "#111",
    marginTop: 2,
    marginBottom: 36,
  },

  kickBtn: {
    width: 120,
    height: 48,
    backgroundColor: "#d9d9d9",
    alignItems: "center",
    justifyContent: "center",
  },
  kickText: {
    fontSize: 18,
    color: "#111",
  },
});