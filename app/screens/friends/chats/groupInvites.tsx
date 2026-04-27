import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/context/ThemeContext";
import { InviteDTO, roomsApi, toUserMessage } from "@/services/roomApi";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

export default function GroupInvitesScreen() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [invites, setInvites] = useState<InviteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadInvites = useCallback(async () => {
    try {
      setLoading(true);
      const data = await roomsApi.getMyInvites();
      setInvites(data ?? []);
    } catch (e) {
      console.log("LOAD INVITES ERROR", e);
      Alert.alert("Помилка", toUserMessage(e));
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadInvites();
    }, [loadInvites])
  );

  const handleAccept = async (inviteId: number) => {
    try {
      setProcessingId(inviteId);
      await roomsApi.acceptInvite(inviteId);
      await loadInvites();
      Alert.alert("Успіх", "Інвайт прийнято");
    } catch (e) {
      console.log("ACCEPT INVITE ERROR", e);
      Alert.alert("Помилка", toUserMessage(e));
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (inviteId: number) => {
    try {
      setProcessingId(inviteId);
      await roomsApi.declineInvite(inviteId);
      await loadInvites();
      Alert.alert("Success", "Invite declined");
    } catch (e) {
      console.log("DECLINE INVITE ERROR", e);
      Alert.alert("Error", toUserMessage(e));
    } finally {
      setProcessingId(null);
    }
  };

  const renderItem = ({ item }: { item: InviteDTO }) => {
    const busy = processingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Ionicons name="people-outline" size={22} color="#222" />
        </View>

        <View style={styles.info}>
          <ThemedText style={styles.roomName}>
            {item.roomName?.trim() ? item.roomName : `Room #${item.roomId}`}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Invited by {item.inviterUsername ?? "unknown"}
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, styles.acceptBtn, busy && styles.disabledBtn]}
            onPress={() => handleAccept(item.id)}
            disabled={busy}
          >
            <ThemedText style={styles.acceptText}>Accept</ThemedText>
          </Pressable>

          <Pressable
            style={[styles.actionBtn, styles.declineBtn, busy && styles.disabledBtn]}
            onPress={() => handleDecline(item.id)}
            disabled={busy}
          >
            <ThemedText style={styles.declineText}>Decline</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#111" />
        </Pressable>

        <ThemedText style={styles.title}>Group invitations</ThemedText>

        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" />
          <ThemedText style={styles.loadingText}>Loading invites...</ThemedText>
        </View>
      ) : invites.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="mail-open-outline" size={42} color="#999" />
          <ThemedText style={styles.emptyTitle}>No pending invitations</ThemedText>
        </View>
      ) : (
        <FlatList
          data={invites}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ThemedView>
  );
}

function makeStyles(theme: import('@/constants/theme').AppTheme) { return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
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
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  roomName: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: theme.secondaryText,
  },
  actions: {
    marginLeft: 10,
    gap: 8,
  },
  actionBtn: {
    minWidth: 82,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  acceptBtn: {
    backgroundColor: theme.primary,
  },
  declineBtn: {
    backgroundColor: theme.surface,
  },
  acceptText: {
    color: theme.onPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  declineText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "700",
  },
  disabledBtn: {
    opacity: 0.6,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    color: theme.secondaryText,
    fontSize: 14,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
}); }