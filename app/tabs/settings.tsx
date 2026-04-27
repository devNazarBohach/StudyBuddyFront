import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";

import BottomNav from "@/components/BottomNav";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/context/ThemeContext";
import { saveSettings } from "@/services/settingsService";

export default function SettingsScreen() {
  const { theme, isDarkMode, isHighContrast, setDarkMode, setHighContrast } =
    useTheme();

  const [shareLocation, setShareLocation] = useState(true);

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleDarkMode(value: boolean) {
    try {
      await setDarkMode(value);
    } catch {
      Alert.alert("Error", "Failed to update Dark Mode");
    }
  }

  async function handleHighContrast(value: boolean) {
    try {
      await setHighContrast(value);
    } catch {
      Alert.alert("Error", "Failed to update High Contrast");
    }
  }

  async function handleShareLocation(value: boolean) {
    const old = shareLocation;
    setShareLocation(value);
    try {
      await saveSettings({ shareLocation: value });
    } catch {
      setShareLocation(old);
      Alert.alert("Error", "Failed to update Share Location");
    }
  }

  // ── Derived styles (use theme tokens) ─────────────────────────────────────
  const s = makeStyles(theme);

  return (
    <SafeAreaView style={[s.safeArea, { backgroundColor: theme.background }]}>
      <View style={[s.container, { backgroundColor: theme.background }]}>
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="title" style={s.title}>
            Settings
          </ThemedText>

          {/* Profile card */}
          <View style={[s.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[s.avatar, { backgroundColor: theme.surface }]}>
              <ThemedText style={[s.avatarText, { color: theme.text }]}>A</ThemedText>
            </View>
            <View style={s.profileInfo}>
              <ThemedText style={[s.profileName, { color: theme.text }]}>Account</ThemedText>
              <ThemedText style={[s.profileRole, { color: theme.secondaryText }]}>
                Role: student / teacher
              </ThemedText>
            </View>
            <TouchableOpacity style={[s.editBtn, { backgroundColor: theme.surface }]}>
              <Ionicons name="pencil-outline" size={18} color={theme.icon} />
            </TouchableOpacity>
          </View>

          {/* Settings toggles */}
          <View style={[s.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <SettingRow
              icon="moon-outline"
              title="Dark mode"
              value={isDarkMode}
              onChange={handleDarkMode}
              theme={theme}
            />
            <View style={[s.divider, { backgroundColor: theme.border }]} />
            <SettingRow
              icon="contrast-outline"
              title="High contrast"
              value={isHighContrast}
              onChange={handleHighContrast}
              theme={theme}
            />
            <View style={[s.divider, { backgroundColor: theme.border }]} />
            <SettingRow
              icon="location-outline"
              title="Share location"
              value={shareLocation}
              onChange={handleShareLocation}
              theme={theme}
            />
          </View>

          {/* Action buttons */}
          <TouchableOpacity
            style={[s.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => router.push("/tabs/scan-qr")}
          >
            <Ionicons name="qr-code-outline" size={20} color={theme.icon} />
            <ThemedText style={[s.actionText, { color: theme.text }]}>Scan QR</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Ionicons name="person-circle-outline" size={20} color={theme.icon} />
            <ThemedText style={[s.actionText, { color: theme.text }]}>Profile card</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionButton, s.logoutButton, { borderColor: theme.danger }]}
            onPress={() => router.replace("/auth/login")}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.danger} />
            <ThemedText style={[s.logoutText, { color: theme.danger }]}>Logout</ThemedText>
          </TouchableOpacity>
        </ScrollView>

        <BottomNav />
      </View>
    </SafeAreaView>
  );
}

// ─── SettingRow sub-component ─────────────────────────────────────────────────
import { AppTheme } from "@/constants/theme";

function SettingRow({
  icon,
  title,
  value,
  onChange,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: boolean;
  onChange: (v: boolean) => void;
  theme: AppTheme;
}) {
  return (
    <View style={settingRowStyle.row}>
      <View style={settingRowStyle.left}>
        <View style={[settingRowStyle.iconWrap, { backgroundColor: theme.surface }]}>
          <Ionicons name={icon} size={20} color={theme.icon} />
        </View>
        <ThemedText style={[settingRowStyle.title, { color: theme.text }]}>{title}</ThemedText>
      </View>
      <View style={settingRowStyle.right}>
        <ThemedText style={[settingRowStyle.state, { color: theme.secondaryText }]}>
          {value ? "On" : "Off"}
        </ThemedText>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor={value ? theme.onPrimary : theme.secondaryText}
        />
      </View>
    </View>
  );
}

const settingRowStyle = StyleSheet.create({
  row: {
    minHeight: 72,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 17, fontWeight: "600" },
  right: { flexDirection: "row", alignItems: "center", gap: 10 },
  state: { fontSize: 14, minWidth: 24 },
});

// ─── Screen-level styles ──────────────────────────────────────────────────────
function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: { flex: 1 },
    container: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 140,
    },
    title: {
      textAlign: "center",
      marginTop: 8,
      marginBottom: 28,
      fontSize: 28,
      fontWeight: "700",
      color: theme.text,
    },
    profileCard: {
      borderRadius: 22,
      padding: 18,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 24,
      borderWidth: 1,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    avatar: {
      width: 68,
      height: 68,
      borderRadius: 34,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
    },
    avatarText: { fontSize: 28, fontWeight: "700" },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 24, fontWeight: "700" },
    profileRole: { marginTop: 4, fontSize: 15 },
    editBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
    },
    section: {
      borderRadius: 22,
      padding: 8,
      marginBottom: 28,
      borderWidth: 1,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    divider: { height: 1, marginHorizontal: 12 },
    actionButton: {
      height: 58,
      borderRadius: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      marginBottom: 14,
      borderWidth: 1,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    actionText: { fontSize: 17, fontWeight: "600" },
    logoutButton: { marginTop: 6 },
    logoutText: { fontSize: 17, fontWeight: "700" },
  });
}
