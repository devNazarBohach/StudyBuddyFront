import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

type UserDTO = {
  username: string;
};

export default function GroupManagementScreen() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const room = Number(roomId);

  const [qrValue, setQrValue] = useState("");
  const [friends, setFriends] = useState<UserDTO[]>([]);
  const [loadingQr, setLoadingQr] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [invitingUsername, setInvitingUsername] = useState<string | null>(null);

  const loadInviteToken = useCallback(async () => {
    try {
      setLoadingQr(true);
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/room/invite-token/${room}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        Alert.alert("Error", result?.message || "Failed to generate QR token");
        return;
      }

      setQrValue(result.data);
    } catch (e) {
      console.log("LOAD QR ERROR", e);
      Alert.alert("Error", "Failed to load QR");
    } finally {
      setLoadingQr(false);
    }
  }, [room]);

  const loadFriendsNotInGroup = useCallback(async () => {
    try {
      setLoadingFriends(true);
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/room/friends/not-in/${room}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        Alert.alert("Error", result?.message || "Failed to load friends");
        return;
      }

      setFriends(result.data ?? []);
    } catch (e) {
      console.log("LOAD FRIENDS NOT IN GROUP ERROR", e);
      Alert.alert("Error", "Failed to load friends");
    } finally {
      setLoadingFriends(false);
    }
  }, [room]);

  const inviteFriend = useCallback(
    async (username: string) => {
      try {
        setInvitingUsername(username);

        const token = await getToken();
        if (!token) return;

        const res = await fetch(`${API_BASE_URL}/room/create-invite`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            username,
            id: String(room),
          }),
        });

        const result = await res.json();

        if (!res.ok || !result.success) {
          Alert.alert("Error", result?.message || "Failed to create invite");
          return;
        }

        setFriends((prev) => prev.filter((f) => f.username !== username));
        Alert.alert("Success", `Invite sent to ${username}`);
      } catch (e) {
        console.log("INVITE ERROR", e);
        Alert.alert("Error", "Failed to send invite");
      } finally {
        setInvitingUsername(null);
      }
    },
    [room]
  );

  useEffect(() => {
    if (!room) return;
    loadInviteToken();
    loadFriendsNotInGroup();
  }, [room, loadInviteToken, loadFriendsNotInGroup]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </Pressable>

        <ThemedText style={styles.headerTitle}>Group management</ThemedText>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText style={styles.sectionTitle}>Qr code</ThemedText>

        <View style={styles.qrCard}>
          {loadingQr ? (
            <ActivityIndicator size="large" />
          ) : qrValue ? (
            <QRCode value={qrValue} size={220} />
          ) : (
            <ThemedText>No QR available</ThemedText>
          )}
        </View>

        <ThemedText style={styles.sectionTitle}>Invite friends</ThemedText>

        {loadingFriends ? (
          <ActivityIndicator size="large" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.username}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <ThemedText style={styles.emptyText}>
                All your friends are already in this group
              </ThemedText>
            }
            renderItem={({ item }) => (
              <View style={styles.friendCard}>
                <View style={styles.avatar}>
                  <ThemedText style={styles.avatarText}>
                    {item.username?.[0]?.toUpperCase() || "U"}
                  </ThemedText>
                </View>

                <View style={styles.friendInfo}>
                  <ThemedText style={styles.friendName}>{item.username}</ThemedText>
                  <ThemedText style={styles.friendUsername}>
                    @{item.username}
                  </ThemedText>

                  <Pressable
                    onPress={() => inviteFriend(item.username)}
                    style={styles.addBtn}
                    disabled={invitingUsername === item.username}
                  >
                    <ThemedText style={styles.addBtnText}>
                      {invitingUsername === item.username ? "adding..." : "add"}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}
      </ScrollView>
    </ThemedView>
  );
}

function makeStyles(theme: import('@/constants/theme').AppTheme) { return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.text,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: theme.text,
  },
  qrCard: {
    minHeight: 260,
    backgroundColor: theme.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    padding: 20,
  },
  friendCard: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: "row",
    marginBottom: 12,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "700",
    color: theme.text,
  },
  friendInfo: {
    flex: 1,
    justifyContent: "center",
  },
  friendName: {
    fontSize: 22,
    fontWeight: "600",
    color: theme.text,
  },
  friendUsername: {
    fontSize: 16,
    color: theme.secondaryText,
    marginTop: 2,
    marginBottom: 14,
  },
  addBtn: {
    width: 140,
    height: 46,
    borderRadius: 12,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.onPrimary,
  },
  emptyText: {
    marginTop: 16,
    textAlign: "center",
    color: theme.secondaryText,
  },
}); }