import { friendsApi } from "@/services/api";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type FriendshipDTO = {
  id?: number;
  username: string;
  status?: string;
  createdAt?: string;
};

export default function FriendRequestsScreen() {
  const [incoming, setIncoming] = useState<FriendshipDTO[]>([]);
  const [outgoing, setOutgoing] = useState<FriendshipDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [incRes, outRes] = await Promise.all([
        friendsApi.incoming(),
        friendsApi.outgoing(),
      ]);

      if (!incRes.ok) throw new Error(incRes.data?.message ?? `Incoming HTTP ${incRes.status}`);
      if (!outRes.ok) throw new Error(outRes.data?.message ?? `Outgoing HTTP ${outRes.status}`);

      const inc = Array.isArray(incRes.data) ? incRes.data : (incRes.data?.data ?? incRes.data?.friendships ?? []);
      const out = Array.isArray(outRes.data) ? outRes.data : (outRes.data?.data ?? outRes.data?.friendships ?? []);

      setIncoming(inc);
      setOutgoing(out);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function accept(requesterUsername: string) {
    try {
      const res = await friendsApi.accept(requesterUsername);
      if (!res.ok) throw new Error(res.data?.message ?? `HTTP ${res.status}`);

      Alert.alert("Accepted", res.data?.message ?? "Friend request accepted");
      await load();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to accept");
    }
  }

  async function reject(requesterUsername: string) {
    try {
      const res = await friendsApi.reject(requesterUsername);
      if (!res.ok) throw new Error(res.data?.message ?? `HTTP ${res.status}`);

      Alert.alert("Rejected", res.data?.message ?? "Friend request rejected");
      await load();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to reject");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Friend requests</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Incoming {loading ? "(loading...)" : `(${incoming.length})`}
        </Text>

        {incoming.length === 0 ? (
          <Text style={styles.muted}>No incoming requests</Text>
        ) : (
          incoming.map((r) => (
            <View key={`${r.username}-${r.id ?? ""}`} style={styles.row}>
              <Text style={styles.username}>{r.username}</Text>

              <View style={styles.actions}>
                <TouchableOpacity style={[styles.btn, styles.btnOk]} onPress={() => accept(r.username)}>
                  <Text style={styles.btnText}>Accept</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.btn, styles.btnBad]} onPress={() => reject(r.username)}>
                  <Text style={styles.btnText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Outgoing {loading ? "(loading...)" : `(${outgoing.length})`}
        </Text>

        {outgoing.length === 0 ? (
          <Text style={styles.muted}>No outgoing requests</Text>
        ) : (
          outgoing.map((r) => (
            <View key={`${r.username}-${r.id ?? ""}`} style={styles.row}>
              <Text style={styles.username}>{r.username}</Text>
              <Text style={styles.badge}>PENDING</Text>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity style={[styles.btn, styles.btnReload]} onPress={load}>
        <Text style={styles.btnText}>Reload</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  title: { fontSize: 28, fontWeight: "800" },
  section: { backgroundColor: "#f2f2f2", borderRadius: 12, padding: 12, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  muted: { color: "#666" },

  row: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  username: { fontSize: 16, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 8 },

  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  btnOk: { backgroundColor: "#111" },
  btnBad: { backgroundColor: "#555" },
  btnReload: { backgroundColor: "#111", alignSelf: "flex-start" },
  btnText: { color: "white", fontWeight: "700" },

  badge: {
    backgroundColor: "#eee",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: "700",
    color: "#333",
  },
});