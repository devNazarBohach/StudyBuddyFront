import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  friendsApi,
  FriendshipDTO,
  toUserMessage,
} from "@/services/friendsApi";

type TabKey = "incoming" | "outgoing";

function Avatar({ username }: { username: string }) {
  const letter = (username?.[0] ?? "?").toUpperCase();

  return (
    <View style={styles.avatar}>
      <ThemedText style={styles.avatarText}>{letter}</ThemedText>
    </View>
  );
}

function prettyDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
}

export default function FriendRequestsScreen() {
  const [tab, setTab] = useState<TabKey>("incoming");
  const [incoming, setIncoming] = useState<FriendshipDTO[]>([]);
  const [outgoing, setOutgoing] = useState<FriendshipDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyUsername, setBusyUsername] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const [incomingData, outgoingData] = await Promise.all([
      friendsApi.getIncomingRequests(),
      friendsApi.getOutgoingRequests(),
    ]);

    setIncoming(incomingData);
    setOutgoing(outgoingData);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        try {
          setLoading(true);
          await loadAll();
        } catch (e) {
          if (active) {
            Alert.alert("Error", toUserMessage(e));
          }
        } finally {
          if (active) setLoading(false);
        }
      })();

      return () => {
        active = false;
      };
    }, [loadAll])
  );

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadAll();
    } catch (e) {
      Alert.alert("Error", toUserMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, [loadAll]);

  const handleAccept = async (username: string) => {
    try {
      setBusyUsername(username);
      await friendsApi.acceptRequest(username);
      await loadAll();
      Alert.alert("Success", `@${username} added to friends`);
    } catch (e) {
      Alert.alert("Error", toUserMessage(e));
    } finally {
      setBusyUsername(null);
    }
  };

  const handleDecline = async (username: string) => {
    try {
      setBusyUsername(username);
      await friendsApi.rejectRequest(username);
      await loadAll();
      Alert.alert("Done", `Request from @${username} declined`);
    } catch (e) {
      Alert.alert("Error", toUserMessage(e));
    } finally {
      setBusyUsername(null);
    }
  };

  const handleCancel = async (username: string) => {
    try {
      setBusyUsername(username);
      await friendsApi.cancelOutgoingRequest(username);
      await loadAll();
      Alert.alert("Done", `Request to @${username} canceled`);
    } catch (e) {
      Alert.alert("Error", toUserMessage(e));
    } finally {
      setBusyUsername(null);
    }
  };

  const currentData = useMemo(
    () => (tab === "incoming" ? incoming : outgoing),
    [tab, incoming, outgoing]
  );

  return (
    <ThemedView style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </Pressable>

        <ThemedText style={styles.headerTitle}>Friend requests</ThemedText>

        <Pressable
          style={styles.addBtn}
          onPress={() => router.push("/screens/friends/chats/addFriend")}
        >
          <Ionicons name="person-add-outline" size={20} color="#111" />
        </Pressable>
      </View>

      <View style={styles.tabsWrap}>
        <Pressable
          style={[styles.tabBtn, tab === "incoming" && styles.tabBtnActive]}
          onPress={() => setTab("incoming")}
        >
          <ThemedText
            style={[styles.tabText, tab === "incoming" && styles.tabTextActive]}
          >
            Incoming ({incoming.length})
          </ThemedText>
        </Pressable>

        <Pressable
          style={[styles.tabBtn, tab === "outgoing" && styles.tabBtnActive]}
          onPress={() => setTab("outgoing")}
        >
          <ThemedText
            style={[styles.tabText, tab === "outgoing" && styles.tabTextActive]}
          >
            Outgoing ({outgoing.length})
          </ThemedText>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" />
          <ThemedText style={{ opacity: 0.7 }}>Loading requests...</ThemedText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {currentData.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="mail-open-outline" size={30} color="#8a8a8a" />
              <ThemedText style={styles.emptyTitle}>
                {tab === "incoming"
                  ? "No incoming requests"
                  : "No outgoing requests"}
              </ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                {tab === "incoming"
                  ? "When someone sends you a request, it will appear here."
                  : "Requests you send will appear here."}
              </ThemedText>
            </View>
          ) : (
            currentData.map((item) => {
              const isBusy = busyUsername === item.username;

              return (
                <View key={`${tab}-${item.id ?? item.username}`} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Avatar username={item.username} />

                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.nameText}>
                        @{item.username}
                      </ThemedText>

                      {!!item.status && (
                        <ThemedText style={styles.metaText}>
                          Status: {item.status}
                        </ThemedText>
                      )}

                      {!!(item.friendshipSentAt || item.createdAt) && (
                        <ThemedText style={styles.metaText}>
                          Sent: {prettyDate(item.friendshipSentAt || item.createdAt)}
                        </ThemedText>
                      )}
                    </View>
                  </View>

                  {tab === "incoming" ? (
                    <View style={styles.rowBtns}>
                      <Pressable
                        disabled={isBusy}
                        style={[styles.primaryBtn, isBusy && styles.btnDisabled]}
                        onPress={() => handleAccept(item.username)}
                      >
                        <ThemedText style={styles.primaryBtnText}>
                          {isBusy ? "Please wait..." : "Accept"}
                        </ThemedText>
                      </Pressable>

                      <Pressable
                        disabled={isBusy}
                        style={[styles.secondaryBtn, isBusy && styles.btnDisabled]}
                        onPress={() =>
                          Alert.alert(
                            "Decline request",
                            `Decline request from @${item.username}?`,
                            [
                              { text: "No" },
                              {
                                text: "Decline",
                                style: "destructive",
                                onPress: () => handleDecline(item.username),
                              },
                            ]
                          )
                        }
                      >
                        <ThemedText style={styles.secondaryBtnText}>
                          Decline
                        </ThemedText>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.rowBtns}>
                      <Pressable
                        disabled={isBusy}
                        style={[styles.secondaryBtn, isBusy && styles.btnDisabled]}
                        onPress={() =>
                          Alert.alert(
                            "Cancel request",
                            `Cancel request to @${item.username}?`,
                            [
                              { text: "No" },
                              {
                                text: "Cancel request",
                                style: "destructive",
                                onPress: () => handleCancel(item.username),
                              },
                            ]
                          )
                        }
                      >
                        <ThemedText style={styles.secondaryBtnText}>
                          {isBusy ? "Please wait..." : "Cancel request"}
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 58,
    paddingHorizontal: 16,
    backgroundColor: "#f6f7fb",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ececf2",
  },

  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ececf2",
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111",
  },

  tabsWrap: {
    flexDirection: "row",
    backgroundColor: "#eceef5",
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
  },

  tabBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  tabBtnActive: {
    backgroundColor: "#fff",
  },

  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6b7280",
  },

  tabTextActive: {
    color: "#111",
  },

  listContent: {
    paddingBottom: 30,
    gap: 12,
  },

  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  emptyCard: {
    marginTop: 40,
    padding: 24,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#ececf2",
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },

  emptySubtitle: {
    textAlign: "center",
    color: "#7b8090",
    lineHeight: 20,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ececf2",
    gap: 14,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: "#e9ecf5",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
  },

  nameText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },

  metaText: {
    fontSize: 13,
    color: "#7b8090",
  },

  rowBtns: {
    flexDirection: "row",
    gap: 10,
  },

  primaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
  },

  secondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  secondaryBtnText: {
    color: "#111",
    fontWeight: "700",
  },

  btnDisabled: {
    opacity: 0.6,
  },
});