import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { UserAvatar } from "@/components/UserAvatar";
import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";
import { useTheme } from "@/context/ThemeContext";
import { useScreenTracking } from "@/hooks/useScreenTracking";
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
  useScreenTracking("MembersScreen");
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const room = Number(roomId);

  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [myUsername, setMyUsername] = useState("");
  const [myRole, setMyRole] = useState("");
  const [grantingUsername, setGrantingUsername] = useState<string | null>(null);

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

  // Sync myRole after members load
  useEffect(() => {
    if (myUsername && members.length > 0) {
      const me = members.find((m) => m.username === myUsername);
      if (me) setMyRole(me.role?.toUpperCase() ?? "");
    }
  }, [members, myUsername]);

  async function castOutMember(username: string) {
    try {
      if (!room || Number.isNaN(room)) {
        Alert.alert("Error", "Invalid room");
        return;
      }

      const token = await getToken();
      if (!token) {
        Alert.alert("Error", "You are not authorized");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/room/delete-member`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          room_id: String(room),
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
      console.log("DELETE MEMBER ERROR", e);
      Alert.alert("Error", "Failed to remove member");
    }
  }

  async function grantRole(username: string, newRole: "ADMIN" | "MEMBER") {
    try {
      setGrantingUsername(username);
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/room/grant_role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          room_id: String(room),
          username,
          role: newRole,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        Alert.alert("Error", result?.message || "Failed to change role");
        return;
      }

      setMembers((prev) =>
        prev.map((m) =>
          m.username === username ? { ...m, role: newRole } : m
        )
      );
      Alert.alert(
        "Success",
        newRole === "ADMIN"
          ? `${username} is now an Admin`
          : `${username} is now a Member`
      );
    } catch (e) {
      console.log("GRANT ROLE ERROR", e);
      Alert.alert("Error", "Failed to change role");
    } finally {
      setGrantingUsername(null);
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

  function confirmGrantRole(username: string, currentRole: string) {
    const isAdmin = currentRole?.toUpperCase() === "ADMIN";
    const action = isAdmin ? "Remove admin" : "Make admin";
    const newRole: "ADMIN" | "MEMBER" = isAdmin ? "MEMBER" : "ADMIN";

    Alert.alert(
      action,
      isAdmin
        ? `Remove admin role from ${username}?`
        : `Grant admin role to ${username}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action,
          onPress: () => grantRole(username, newRole),
        },
      ]
    );
  }

  const isOwner = myRole === "OWNER";

  const renderItem = ({ item }: { item: MemberDTO }) => {
    const isMe = item.username === myUsername;
    const memberRole = item.role?.toUpperCase() ?? "";
    const isAdmin = memberRole === "ADMIN";
    const isMemberOwner = memberRole === "OWNER";
    const busy = grantingUsername === item.username;

    return (
      <View style={styles.card}>
        <UserAvatar username={item.username} size={52} />
        <View style={styles.info}>
          <ThemedText style={styles.name}>{item.username}</ThemedText>
          <ThemedText style={styles.handle}>@{item.username}</ThemedText>
        </View>

        <View style={styles.rightBlock}>
          <View style={[styles.roleBadge, isMemberOwner && styles.roleBadgeOwner, isAdmin && styles.roleBadgeAdmin]}>
            <ThemedText style={[styles.roleText, isAdmin && styles.roleTextHighlight, isMemberOwner && styles.roleTextOwner]}>
              {item.role?.toLowerCase()}
            </ThemedText>
          </View>

          {!isMe && !isMemberOwner && (
            <View style={styles.actionBtns}>
              {isOwner && (
                <Pressable
                  style={[styles.roleBtn, isAdmin && styles.roleBtnDemote, busy && styles.disabledBtn]}
                  onPress={() => confirmGrantRole(item.username, item.role)}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color={theme.onPrimary} />
                  ) : (
                    <ThemedText style={styles.roleBtnText}>
                      {isAdmin ? "remove admin" : "make admin"}
                    </ThemedText>
                  )}
                </Pressable>
              )}

              {(isOwner || myRole === "ADMIN") && (
                <Pressable
                  style={[styles.kickBtn]}
                  onPress={() => confirmCastOut(item.username)}
                >
                  <ThemedText style={styles.kickText}>cast out</ThemedText>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color={theme.text} />
        </Pressable>

        <ThemedText style={styles.headerTitle}>Members</ThemedText>

        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={theme.primary} />
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

function makeStyles(theme: import('@/constants/theme').AppTheme) { return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface,
  },

  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 14,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
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
    color: theme.text,
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
    backgroundColor: theme.border,
  },

  card: {
    minHeight: 90,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: theme.surface,
  },

  info: {
    flex: 1,
    paddingLeft: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.text,
  },
  handle: {
    marginTop: 2,
    fontSize: 14,
    color: theme.secondaryText,
  },

  rightBlock: {
    alignItems: "flex-end",
    gap: 8,
  },

  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  roleBadgeOwner: {
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderColor: "rgba(139, 92, 246, 0.5)",
  },
  roleBadgeAdmin: {
    backgroundColor: theme.primary + "22",
    borderColor: theme.primary,
  },
  roleText: {
    fontSize: 13,
    color: theme.secondaryText,
    fontWeight: "500",
  },
  roleTextHighlight: {
    color: theme.text,
    fontWeight: "700",
  },
  roleTextOwner: {
    color: "#8B5CF6",
    fontWeight: "700",
  },

  actionBtns: {
    alignItems: "flex-end",
    gap: 6,
  },

  roleBtn: {
    minWidth: 110,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  roleBtnDemote: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  roleBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.onPrimary,
  },
  disabledBtn: {
    opacity: 0.6,
  },

  kickBtn: {
    minWidth: 80,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  kickText: {
    fontSize: 13,
    color: "#dc2626",
    fontWeight: "600",
  },
}); }
