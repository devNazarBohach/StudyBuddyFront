import BottomNav from "@/components/BottomNav";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { UserAvatar } from "@/components/UserAvatar";
import { useTheme } from "@/context/ThemeContext";
import { useScreenTracking } from "@/hooks/useScreenTracking";
import { logNearbyOpened, logNearbyUserTapped } from "@/services/firebase";
import { locationApi, UserLocationDTO } from "@/services/locationApi";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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

function ProfileCard({ item, theme, fs }: { item: UserLocationDTO; theme: any; fs: (n: number) => number }) {
  const hasProfile = !!(item.school || item.faculty || (item.subjects && item.subjects.length > 0));
  const roleValue = item.role?.toUpperCase() ?? "";

  return (
    <Pressable
      style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => {
        logNearbyUserTapped(item.username);
        router.push({
          pathname: "/screens/friends/chats/CreateRoom" as any,
          params: { username: item.username },
        });
      }}
    >
      {/* Avatar row — same as modalAvatarRow in settings */}
      <View style={s.avatarRow}>
        <UserAvatar username={item.username} size={72} />
        <View style={{ flex: 1 }}>
          <ThemedText style={[s.name, { color: theme.text, fontSize: fs(20) }]}>
            {item.username}
          </ThemedText>
          <ThemedText style={[s.updatedAt, { color: theme.secondaryText, fontSize: fs(13) }]}>
            {formatUpdated(item.updatedAt)}
          </ThemedText>
        </View>
        {/* Distance badge */}
        <View style={[s.distanceBadge, { backgroundColor: theme.primary + "22" }]}>
          <Ionicons name="location" size={13} color={theme.primary} />
          <ThemedText style={[s.distanceText, { color: theme.primary, fontSize: fs(13) }]}>
            {formatDistance(item.distanceKm)}
          </ThemedText>
        </View>
      </View>

      {/* Role pill — same as roleRow in settings */}
      {roleValue ? (
        <>
          <ThemedText style={[s.fieldLabel, { color: theme.secondaryText, fontSize: fs(13) }]}>
            Role
          </ThemedText>
          <View style={[s.roleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {(["STUDENT", "TEACHER"] as const).map((r) => (
              <View
                key={r}
                style={[
                  s.roleBtn,
                  roleValue === r && { backgroundColor: theme.primary },
                  roleValue !== r && { opacity: 0.4 },
                ]}
              >
                <ThemedText
                  style={{
                    fontWeight: "700",
                    fontSize: fs(13),
                    color: roleValue === r ? theme.onPrimary : theme.secondaryText,
                  }}
                >
                  {r}
                </ThemedText>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {/* Profile fields — same style as non-editable inputs in settings */}
      {hasProfile && (
        <>
          {item.school ? (
            <>
              <ThemedText style={[s.fieldLabel, { color: theme.secondaryText, fontSize: fs(13) }]}>
                University
              </ThemedText>
              <View style={[s.inputBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <ThemedText style={[s.inputText, { color: theme.text, fontSize: fs(15) }]}>
                  {item.school}
                </ThemedText>
              </View>
            </>
          ) : null}

          {item.faculty ? (
            <>
              <ThemedText style={[s.fieldLabel, { color: theme.secondaryText, fontSize: fs(13) }]}>
                Faculty
              </ThemedText>
              <View style={[s.inputBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <ThemedText style={[s.inputText, { color: theme.text, fontSize: fs(15) }]}>
                  {item.faculty}
                </ThemedText>
              </View>
            </>
          ) : null}

          {item.subjects && item.subjects.length > 0 ? (
            <>
              <ThemedText style={[s.fieldLabel, { color: theme.secondaryText, fontSize: fs(13) }]}>
                Subjects
              </ThemedText>
              <View style={[s.inputBox, s.inputMulti, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <ThemedText style={[s.inputText, { color: theme.text, fontSize: fs(15) }]}>
                  {item.subjects.map((sub) => sub.toLowerCase().replace(/_/g, " ")).join(", ")}
                </ThemedText>
              </View>
            </>
          ) : null}
        </>
      )}

      {/* Message button */}
      <View style={[s.messageBtn, { backgroundColor: theme.primary }]}>
        <Ionicons name="chatbubble-outline" size={15} color={theme.onPrimary} />
        <ThemedText style={[s.messageBtnText, { color: theme.onPrimary, fontSize: fs(14) }]}>
          Message
        </ThemedText>
      </View>
    </Pressable>
  );
}

export default function NearbyScreen() {
  const { theme, fs } = useTheme();
  useScreenTracking("NearbyScreen");
  const [permission, setPermission] = useState<PermissionState>("idle");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<UserLocationDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isLocationOff =
    error?.toLowerCase().includes("share location") ||
    error?.toLowerCase().includes("disabled");

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
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await locationApi.updateMyLocation(pos.coords.latitude, pos.coords.longitude);
      return true;
    } catch (e: any) {
      const msg = e?.message ?? "Failed to update location";
      if (msg.toLowerCase().includes("share location disabled")) {
        setError("Location sharing is turned off in Settings. Enable it to see nearby students.");
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
      logNearbyOpened(list?.length ?? 0);
    } catch (e: any) {
      const msg = e?.message ?? "Failed to load nearby users";
      if (msg.toLowerCase().includes("share location disabled")) {
        setError("Location sharing is turned off in Settings. Enable it to see nearby students.");
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
    if (ok) await loadNearby();
    setLoading(false);
  }, [requestAndUpdate, loadNearby]);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await requestAndUpdate();
    await loadNearby();
    setRefreshing(false);
  }, [requestAndUpdate, loadNearby]);

  if (permission === "blocked") {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ThemedView style={s.center}>
          <Ionicons name="location-outline" size={56} color="#888" />
          <ThemedText type="title" style={s.heading}>Location is blocked</ThemedText>
          <ThemedText style={[s.muted, { color: theme.secondaryText }]}>
            Enable location access in your device Settings to find study partners nearby.
          </ThemedText>
          <Pressable style={[s.primaryBtn, { backgroundColor: theme.primary }]} onPress={() => Linking.openSettings()}>
            <ThemedText style={[s.primaryBtnText, { color: theme.onPrimary }]}>Open Settings</ThemedText>
          </Pressable>
        </ThemedView>
        <BottomNav />
      </SafeAreaView>
    );
  }

  if (permission === "denied") {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ThemedView style={s.center}>
          <Ionicons name="location-outline" size={56} color="#888" />
          <ThemedText type="title" style={s.heading}>Allow location access</ThemedText>
          <ThemedText style={[s.muted, { color: theme.secondaryText }]}>
            We need your location to show other students studying near you.
          </ThemedText>
          <Pressable style={[s.primaryBtn, { backgroundColor: theme.primary }]} onPress={bootstrap}>
            <ThemedText style={[s.primaryBtnText, { color: theme.onPrimary }]}>Allow</ThemedText>
          </Pressable>
        </ThemedView>
        <BottomNav />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={s.container}>
        <View style={s.header}>
          <ThemedText type="title" style={[s.title, { fontSize: fs(28) }]}>Nearby</ThemedText>
          <ThemedText style={[s.muted, { color: theme.secondaryText, textAlign: "left" }]}>
            Students sharing their location
          </ThemedText>
        </View>

        {loading && users.length === 0 ? (
          <View style={s.center}>
            <ActivityIndicator size="large" />
            <ThemedText style={[s.muted, { color: theme.secondaryText }]}>Finding students…</ThemedText>
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => String(item.userId)}
            contentContainerStyle={{ paddingBottom: 110, paddingTop: 4 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
            ListEmptyComponent={
              <View style={s.center}>
                {isLocationOff ? (
                  <>
                    <Ionicons name="location-outline" size={48} color={theme.secondaryText} />
                    <ThemedText style={[s.muted, { color: theme.secondaryText, fontWeight: "600", marginTop: 12 }]}>
                      Location sharing is OFF
                    </ThemedText>
                    <ThemedText style={[s.muted, { color: theme.secondaryText, marginTop: 4 }]}>
                      Enable "Share location" in Settings to see nearby students and be visible to them.
                    </ThemedText>
                    <Pressable
                      style={[s.primaryBtn, { backgroundColor: theme.primary, marginTop: 20 }]}
                      onPress={() => router.push("/tabs/settings")}
                    >
                      <ThemedText style={[s.primaryBtnText, { color: theme.onPrimary }]}>Go to Settings</ThemedText>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Ionicons name="people-outline" size={48} color={theme.secondaryText} />
                    <ThemedText style={[s.muted, { color: theme.secondaryText, marginTop: 8 }]}>
                      {error ?? "No students around yet. Pull to refresh."}
                    </ThemedText>
                  </>
                )}
              </View>
            }
            renderItem={({ item }) => <ProfileCard item={item} theme={theme} fs={fs} />}
          />
        )}
      </ThemedView>
      <BottomNav />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { paddingTop: 16, paddingBottom: 8 },
  title: { fontWeight: "700" },
  muted: { textAlign: "center", marginTop: 8 },
  heading: { marginTop: 12, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 48 },
  primaryBtn: { marginTop: 24, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  primaryBtnText: { fontWeight: "600" },

  // Card — same shape as modalSheet in settings
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // Same as modalAvatarRow
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  name: { fontWeight: "700" },
  updatedAt: { marginTop: 2 },

  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  distanceText: { fontWeight: "600" },

  // Same as fieldLabel in settings
  fieldLabel: {
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 4,
  },

  // Same as roleRow / roleBtn in settings
  roleRow: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  roleBtn: {
    flex: 1,
    height: 40,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  // Same visual as non-editable input in settings
  inputBox: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    justifyContent: "center",
  },
  inputMulti: {
    minHeight: 72,
    justifyContent: "flex-start",
  },
  inputText: { lineHeight: 20 },

  // Message button at bottom of card
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    borderRadius: 12,
    marginTop: 8,
  },
  messageBtnText: { fontWeight: "700" },
});