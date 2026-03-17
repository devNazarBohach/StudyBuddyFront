import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";

import BottomNav from "@/components/BottomNav";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { updateUserSetting } from "@/services/settingsService";
import { Alert } from "react-native";



export default function SettingsScreen() {
  const [darkMode, setDarkMode] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [shareLocation, setShareLocation] = useState(true);

  const handleSettingChange = async (
    key: string,
    value: boolean,
    setter: (value: boolean) => void,
    oldValue: boolean
  ) => {
    setter(value);

    try {
      await updateUserSetting(key, value);
    } catch (e) {
      setter(oldValue);
      Alert.alert("Error", `Failed to update ${key}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Settings
        </ThemedText>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarText}>A</ThemedText>
          </View>

          <View style={styles.profileInfo}>
            <ThemedText style={styles.profileName}>Account</ThemedText>
            <ThemedText style={styles.profileRole}>
              Role: student / teacher
            </ThemedText>
          </View>

          <TouchableOpacity style={styles.editBtn}>
            <Ionicons name="pencil-outline" size={18} color="#222" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <SettingRow
            icon="moon-outline"
            title="Dark mode"
            value={darkMode}
            onChange={(value) =>
              handleSettingChange("darkMode", value, setDarkMode, darkMode)
            }
          />

          <SettingRow
            icon="contrast-outline"
            title="High contrast"
            value={highContrast}
            onChange={(value) =>
              handleSettingChange(
                "highContrast",
                value,
                setHighContrast,
                highContrast
              )
            }
          />

          <SettingRow
            icon="location-outline"
            title="Share location"
            value={shareLocation}
            onChange={(value) =>
              handleSettingChange(
                "shareLocation",
                value,
                setShareLocation,
                shareLocation
              )
            }
          />
        </View>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="person-circle-outline" size={20} color="#222" />
          <ThemedText style={styles.actionText}>Profile card</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.logoutButton]}
          onPress={() => router.replace("/auth/login")}
        >
          <Ionicons name="log-out-outline" size={20} color="#b42318" />
          <ThemedText style={styles.logoutText}>Logout</ThemedText>
        </TouchableOpacity>

        <BottomNav />
      </ThemedView>
    </SafeAreaView>
  );
}

function SettingRow({
  icon,
  title,
  value,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={20} color="#222" />
        </View>
        <ThemedText style={styles.settingTitle}>{title}</ThemedText>
      </View>

      <View style={styles.settingRight}>
        <ThemedText style={styles.stateText}>{value ? "On" : "Off"}</ThemedText>
        <Switch value={value} onValueChange={onChange} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6f7fb",
  },
  container: {
    flex: 1,
    backgroundColor: "#f6f7fb",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 90,
  },
  title: {
    textAlign: "center",
    marginTop: 8,
    marginBottom: 28,
    fontSize: 28,
    fontWeight: "700",
  },

  profileCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
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
    backgroundColor: "#e9ecf5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "700",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
  },
  profileRole: {
    marginTop: 4,
    fontSize: 15,
    opacity: 0.7,
  },
  editBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f2f4f8",
    alignItems: "center",
    justifyContent: "center",
  },

  section: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 8,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  settingRow: {
    minHeight: 72,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f2f4f8",
    alignItems: "center",
    justifyContent: "center",
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stateText: {
    fontSize: 14,
    opacity: 0.65,
    minWidth: 24,
  },

  actionButton: {
    height: 58,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  actionText: {
    fontSize: 17,
    fontWeight: "600",
  },

  logoutButton: {
    backgroundColor: "#fff1f1",
    marginTop: "auto",
  },
  logoutText: {
    color: "#b42318",
    fontSize: 17,
    fontWeight: "700",
  },
});