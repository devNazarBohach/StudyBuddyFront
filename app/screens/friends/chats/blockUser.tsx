import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";
import { useTheme } from "@/context/ThemeContext";
import { useScreenTracking } from "@/hooks/useScreenTracking";

type BlockedUser = {
  username: string;
};

export default function BlockUserScreen() {
  useScreenTracking("BlockUserScreen");

  const [username, setUsername] = useState("");
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const { theme } = useTheme();

  useFocusEffect(
    useCallback(() => {
      loadBlockedUsers();
    }, [])
  );

  async function loadBlockedUsers() {
    try {
      setLoading(true);

      const token = await getToken();

      if (!token) {
        Alert.alert("Error", "You are not authorized");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/user/block-user`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        Alert.alert("Error", result?.message || "Failed to load blocked users");
        return;
      }

      setBlockedUsers(result.data ?? []);
    } catch (e: any) {
      console.log("LOAD BLOCKED USERS ERROR", e);
      Alert.alert("Error", e?.message ?? "Failed to load blocked users");
    } finally {
      setLoading(false);
    }
  }

  async function blockUser() {
    const cleanUsername = username.trim().replace(/^@/, "");

    if (!cleanUsername) {
      Alert.alert("Error", "Username is required");
      return;
    }

    try {
      setBlocking(true);

      const token = await getToken();

      if (!token) {
        Alert.alert("Error", "You are not authorized");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/user/block-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: cleanUsername,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        Alert.alert("Error", result?.message || "Failed to block user");
        return;
      }

      setUsername("");
      Alert.alert("Success", "User blocked");
      await loadBlockedUsers();
    } catch (e: any) {
      console.log("BLOCK USER ERROR", e);
      Alert.alert("Error", e?.message ?? "Unknown error");
    } finally {
      setBlocking(false);
    }
  }

  async function unblockUser(targetUsername: string) {
    try {
      const token = await getToken();

      if (!token) {
        Alert.alert("Error", "You are not authorized");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/user/block-user`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: targetUsername,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        Alert.alert("Error", result?.message || "Failed to unblock user");
        return;
      }

      setBlockedUsers((prev) =>
        prev.filter((user) => user.username !== targetUsername)
      );

      Alert.alert("Success", "User unblocked");
    } catch (e: any) {
      console.log("UNBLOCK USER ERROR", e);
      Alert.alert("Error", e?.message ?? "Failed to unblock user");
    }
  }

  function confirmUnblock(targetUsername: string) {
    Alert.alert("Unblock user", `Unblock @${targetUsername}?`, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Unblock",
        onPress: () => unblockUser(targetUsername),
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Block user</ThemedText>

      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="@username"
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.input,
          {
            backgroundColor: theme.inputBackground,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
        placeholderTextColor={theme.placeholder}
      />

      <Pressable
        style={[
          styles.btn,
          {
            backgroundColor: theme.danger,
            opacity: blocking ? 0.6 : 1,
          },
        ]}
        onPress={blockUser}
        disabled={blocking}
      >
        <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
          {blocking ? "Blocking..." : "Block user"}
        </ThemedText>
      </Pressable>

      <View style={styles.headerRow}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
          Blocked users
        </ThemedText>

        <Pressable onPress={loadBlockedUsers}>
          <ThemedText type="link">Refresh</ThemedText>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator />
      ) : blockedUsers.length === 0 ? (
        <ThemedText style={{ color: theme.secondaryText, opacity: 0.7 }}>
          No blocked users.
        </ThemedText>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item, index) => `${item.username}-${index}`}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <View
              style={[
                styles.blockedCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <ThemedText style={{ color: theme.text, fontWeight: "700" }}>
                  @{item.username}
                </ThemedText>
              </View>

              <Pressable
                style={[
                  styles.unblockBtn,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => confirmUnblock(item.username)}
              >
                <ThemedText style={{ color: theme.text, fontWeight: "600" }}>
                  unblock
                </ThemedText>
              </Pressable>
            </View>
          )}
        />
      )}

      <Pressable onPress={() => router.back()} style={{ alignItems: "center" }}>
        <ThemedText type="link">Back</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },

  btn: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  headerRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  list: {
    gap: 8,
    paddingBottom: 20,
  },

  separator: {
    height: 8,
  },

  blockedCard: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  unblockBtn: {
    height: 36,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});