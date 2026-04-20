import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { locationApi, UserLocationDTO } from "@/services/locationApi";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  View,
} from "react-native";

type PermissionState = "idle" | "checking" | "granted" | "denied" | "blocked";

function formatDistance(km?: number) {
  if (km == null) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function formatUpdated(iso?: string) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs)) return "";
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return `${d} d ago`;
}

export default function NearbyScreen() {
  const [permission, setPermission] = useState<PermissionState>("idle");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<UserLocationDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  const requestAndUpdate = useCallback(async (): Promise<boolean> => {
    setPermission("checking");

    const existing = await Location.getForegroundPermissionsAsync();
    let status = existing.status;
    let canAskAgain = existing.canAskAgain;

    if (status !== "granted") {
      const req = await Location.requestForegroundPermissionsAsync();
      status = req.status;
      canAskAgain = req.canAskAgain;
    }

    if (status !== "granted") {
      setPermission(canAskAgain ? "denied" : "blocked");
      return false;
    }

    setPermission("granted");

    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setError("Location services are disabled on this device.");
        return false;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await locationApi.updateMyLocation(
        pos.coords.latitude,
        pos.coords.longitude
      );
      return true;
    } catch (e: any) {
      const msg = e?.message ?? "Failed to update location";
      if (msg.toLowerCase().includes("share location disabled")) {
        setError(
          "Location sharing is turned off in Settings. Enable it to see nearby students."
        );
      } else {
        setError(msg);
      }
      return false;
    }
  }, []);

  const loadNearby = useCallback(async () => {
    try {
      const list = await locationApi.getNearbyUsers();
      setUsers(list ?? []);
      setError(null);
    } catch (e: any) {
      const msg = e?.message ?? "Failed to load nearby users";
      if (msg.toLowerCase().includes("share location disabled")) {
        setError(
          "Location sharing is turned off in Settings. Enable it to see nearby students."
        );
      } else if (msg.toLowerCase().includes("not set")) {
        setError("Your location is not set yet. Pull to refresh.");
      } else {
        setError(msg);
      }
      setUsers([]);
    }
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    const ok = await requestAndUpdate();
    if (ok) {
      await loadNearby();
    }
    setLoading(false);
  }, [requestAndUpdate, loadNearby]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await requestAndUpdate();
    await loadNearby();
    setRefreshing(false);
  }, [requestAndUpdate, loadNearby]);

  if (permission === "blocked") {
    return (
      <SafeAreaView style={styles.safe}>
        <ThemedView style={styles.center}>
          <Ionicons name="location-outline" size={56} color="#888" />
          <ThemedText type="title" style={styles.heading}>
            Location is blocked
          </ThemedText>
          <ThemedText style={styles.muted}>
            Enable location access in your device Settings to find study
            partners nearby.
          </ThemedText>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => Linking.openSettings()}
          >
            <ThemedText style={styles.primaryBtnText}>Open Settings</ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (permission === "denied") {
    return (
      <SafeAreaView style={styles.safe}>
        <ThemedView style={styles.center}>
          <Ionicons name="location-outline" size={56} color="#888" />
          <ThemedText type="title" style={styles.heading}>
            Allow location access
          </ThemedText>
          <ThemedText style={styles.muted}>
            We need your location to show other students studying near you.
          </ThemedText>
          <Pressable style={styles.primaryBtn} onPress={bootstrap}>
            <ThemedText style={styles.primaryBtnText}>Allow</ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Nearby
          </ThemedText>
          <ThemedText style={styles.muted}>
            Students sharing their location
          </ThemedText>
        </View>

        {loading && users.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
            <ThemedText style={styles.muted}>Finding students…</ThemedText>
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => String(item.userId)}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="people-outline" size={48} color="#aaa" />
                <ThemedText style={styles.muted}>
                  {error ?? "No students around yet. Pull to refresh."}
                </ThemedText>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => {
                  // open direct chat — relies on an existing route that
                  // resolves a direct room by username.
                  Alert.alert(item.username, `Distance: ${formatDistance(item.distanceKm)}`, [
                    { text: "Close", style: "cancel" },
                    {
                      text: "Message",
                      onPress: () =>
                        router.push({
                          pathname: "/screens/friends/chats/CreateRoom" as any,
                          params: { username: item.username },
                        }),
                    },
                  ]);
                }}
              >
                <View style={styles.avatar}>
                  <ThemedText style={styles.avatarText}>
                    {item.username.slice(0, 1).toUpperCase()}
                  </ThemedText>
                </View>
                <View style={styles.rowMain}>
                  <ThemedText style={styles.rowTitle}>
                    @{item.username}
                  </ThemedText>
                  <ThemedText style={styles.rowSub}>
                    {formatUpdated(item.updatedAt)}
                    {item.role ? ` · ${item.role.toLowerCase()}` : ""}
                  </ThemedText>
                </View>
                <View style={styles.distance}>
                  <Ionicons name="location" size={14} color="#4F8EF7" />
                  <ThemedText style={styles.distanceText}>
                    {formatDistance(item.distanceKm)}
                  </ThemedText>
                </View>
              </Pressable>
            )}
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16 },
  header: { paddingVertical: 16 },
  title: { fontSize: 28, fontWeight: "700" },
  muted: { color: "#888", textAlign: "center", marginTop: 8 },
  heading: { marginTop: 12, textAlign: "center" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  primaryBtn: {
    marginTop: 24,
    backgroundColor: "#4F8EF7",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: { color: "white", fontWeight: "600", fontSize: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#2a2a2a",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4F8EF7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { color: "white", fontWeight: "700", fontSize: 18 },
  rowMain: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: "600" },
  rowSub: { fontSize: 12, color: "#888", marginTop: 2 },
  distance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(79, 142, 247, 0.15)",
  },
  distanceText: { fontSize: 13, fontWeight: "600", color: "#4F8EF7" },
});