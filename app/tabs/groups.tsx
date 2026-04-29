import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";
import { useTheme } from "@/context/ThemeContext";
import { useScreenTracking } from "@/hooks/useScreenTracking";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

type RoomDTO = {
  id: number;
  roomType: "DIRECT" | "GROUP";
  directKey: string | null;
  title: string | null;
  unread: number;
};

type ApiResponseWrapper<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export default function CreateRoomScreen() {
  const { theme, fs } = useTheme();
  useScreenTracking("GroupsScreen");
  const styles = makeStyles(theme, fs);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateGroup = async () => {
    const name = groupName.trim();

    if (!name) {
      Alert.alert("Error", "Please enter a group name");
      return;
    }

    try {
      setLoading(true);

      const token = await getToken();

      if (!token) {
        Alert.alert("Error", "Token not found");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/room/group-room`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      const result: ApiResponseWrapper<RoomDTO> = await response.json();

      if (!response.ok || !result.success || !result.data) {
        Alert.alert("Error", result.message || "Failed to create group");
        return;
      }

      router.replace({
        pathname: "/screens/friends/chats/chat",
        params: { roomId: String(result.data.id) },
      });
    } catch (error) {
      console.log("create group error", error);
      Alert.alert("Error", "An error occurred while creating the group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.card}>
        <ThemedText style={styles.title}>Create group</ThemedText>
        <ThemedText style={styles.subtitle}>Enter group name</ThemedText>

        <TextInput
          value={groupName}
          onChangeText={setGroupName}
          placeholder="Group name"
          style={styles.input}
          editable={!loading}
          maxLength={50}
          autoCapitalize="none"
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreateGroup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.buttonText}>Create group</ThemedText>
          )}
        </Pressable>
      </View>
    </ThemedView>
  );
}

function makeStyles(theme: import('@/constants/theme').AppTheme, fs: (n: number) => number) { return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 18,
    padding: 20,
  },
  title: {
    fontSize: fs(28),
    fontWeight: "700",
    marginBottom: 8,
    color: theme.text,
  },
  subtitle: {
    fontSize: fs(14),
    color: theme.secondaryText,
    marginBottom: 16,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#fafafa",
    marginBottom: 16,
    fontSize: fs(16),
    color: theme.text,
  },
  button: {
    height: 52,
    borderRadius: 12,
    backgroundColor: theme.text,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: theme.card,
    fontSize: fs(16),
    fontWeight: "700",
  },
}); }