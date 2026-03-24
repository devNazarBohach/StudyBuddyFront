import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { friendsApi, FriendshipDTO, toUserMessage as toFriendsError } from "@/services/friendsApi";
import { roomsApi, toUserMessage as toRoomsError } from "@/services/roomApi";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

export default function CreateRoom() {
  const [groupName, setGroupName] = useState("");
  const [friends, setFriends] = useState<FriendshipDTO[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadFriends();
  }, []);

  async function loadFriends() {
    try {
      setLoadingFriends(true);
      const data = await friendsApi.getFriends();
      setFriends(data ?? []);
    } catch (e) {
      Alert.alert("Error", toFriendsError(e));
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  }

  function toggleFriend(username: string) {
    setSelected((prev) => ({
      ...prev,
      [username]: !prev[username],
    }));
  }

  const selectedFriends = useMemo(() => {
    return friends.filter((f) => selected[f.username]);
  }, [friends, selected]);

  function getInitial(username: string) {
    if (!username?.trim()) return "U";
    return username.trim().charAt(0).toUpperCase();
  }

  async function handleCreateGroup() {
    const trimmedName = groupName.trim();

    if (!trimmedName) {
      Alert.alert("Error", "Enter group name");
      return;
    }

    if (selectedFriends.length === 0) {
      Alert.alert("Errror", "Choose at least one friend");
      return;
    }

    try {
      setCreating(true);

      const createdRoom = await roomsApi.createGroupRoom(trimmedName);

      if (!createdRoom?.id) {
        throw new Error("Cannot receive id");
      }

      for (const friend of selectedFriends) {
        await roomsApi.createInvite(createdRoom.id, friend.username);
      }

      Alert.alert("Success", "Group created", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (e) {
      Alert.alert("Error", toRoomsError(e));
    } finally {
      setCreating(false);
    }
  }

  const renderFriend = ({ item }: { item: FriendshipDTO }) => {
    const isChecked = !!selected[item.username];

    return (
      <Pressable style={styles.friendRow} onPress={() => toggleFriend(item.username)}>
        <View style={styles.avatar}>
          <ThemedText style={styles.avatarText}>{getInitial(item.username)}</ThemedText>
        </View>

        <ThemedText style={styles.friendName}>{item.username}</ThemedText>

        <View style={[styles.checkOuter, isChecked && styles.checkOuterActive]}>
          {isChecked && <View style={styles.checkInner} />}
        </View>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#111" />
        </Pressable>

        <ThemedText style={styles.title}>Create group</ThemedText>

        <View style={styles.rightPlaceholder} />
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.label}>Group name</ThemedText>
        <TextInput
          value={groupName}
          onChangeText={setGroupName}
          placeholder="Enter group name"
          placeholderTextColor="#999"
          style={styles.input}
          editable={!creating}
        />
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.label}>Select friends</ThemedText>
      </View>

      {loadingFriends ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" />
          <ThemedText style={styles.loadingText}>Loading friends...</ThemedText>
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item, index) => `${item.username}-${index}`}
          renderItem={renderFriend}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <ThemedText style={styles.emptyText}>You have no friends yet</ThemedText>
            </View>
          }
        />
      )}

      <View style={styles.bottomArea}>
        <Pressable
          style={[styles.createBtn, creating && styles.createBtnDisabled]}
          onPress={handleCreateGroup}
          disabled={creating}
        >
          <ThemedText style={styles.createBtnText}>
            {creating ? "Creating..." : "Create group"}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f6f6",
    paddingTop: 64,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    marginBottom: 28,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  rightPlaceholder: {
    width: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "500",
    color: "#111",
  },
  section: {
    paddingHorizontal: 22,
    marginBottom: 14,
  },
  label: {
    fontSize: 16,
    color: "#111",
    marginBottom: 10,
  },
  input: {
    height: 56,
    backgroundColor: "#d9d9d9",
    borderRadius: 0,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#111",
  },
  listContent: {
    paddingBottom: 140,
  },
  friendRow: {
    height: 84,
    backgroundColor: "#d9d9d9",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#3b3939",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 18,
    color: "#000",
    fontWeight: "500",
  },
  friendName: {
    flex: 1,
    fontSize: 16,
    color: "#111",
  },
  checkOuter: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: "#111",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  checkOuterActive: {
    backgroundColor: "#fff",
  },
  checkInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#111",
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
  },
  emptyBox: {
    paddingTop: 30,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    color: "#666",
  },
  bottomArea: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 36,
    paddingHorizontal: 20,
  },
  createBtn: {
    height: 82,
    backgroundColor: "#d9d9d9",
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnDisabled: {
    opacity: 0.7,
  },
  createBtnText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#111",
  },
});