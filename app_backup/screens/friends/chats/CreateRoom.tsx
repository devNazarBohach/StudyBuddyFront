import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";
import { useTheme } from "@/context/ThemeContext";
import { logEvent } from "@/services/firebase";
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
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  const handleCreateGroup = async () => {
    const name = groupName.trim();
    if (!name) { Alert.alert("Error", "Please enter a group name"); return; }

    try {
      setLoading(true);
      const token = await getToken();
      if (!token) { Alert.alert("Error", "Token not found"); return; }

      const response = await fetch(`${API_BASE_URL}/room/group-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      const result: ApiResponseWrapper<RoomDTO> = await response.json();
      if (!response.ok || !result.success || !result.data) {
        Alert.alert("Error", result.message || "Failed to create group");
        return;
      }
      logEvent("group_created");
      router.replace({ pathname: "/screens/friends/chats/chat", params: { roomId: String(result.data.id) } });
    } catch (error) {
      Alert.alert("Error", "An error occurred while creating the group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText style={[styles.title, { color: theme.text }]}>Create group</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.secondaryText }]}>Enter group name</ThemedText>

        <TextInput
          value={groupName}
          onChangeText={setGroupName}
          placeholder="Group name"
          style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
          placeholderTextColor={theme.placeholder}
          editable={!loading}
          maxLength={50}
          autoCapitalize="none"
        />

        <Pressable
          style={[styles.button, { backgroundColor: theme.primary }, loading && styles.buttonDisabled]}
          onPress={handleCreateGroup}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={theme.onPrimary} />
            : <ThemedText style={[styles.buttonText, { color: theme.onPrimary }]}>Create group</ThemedText>}
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  card: { borderRadius: 18, padding: 20, borderWidth: 1 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 16 },
  input: { height: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, marginBottom: 16, fontSize: 16 },
  button: { height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontSize: 16, fontWeight: "700" },
});
