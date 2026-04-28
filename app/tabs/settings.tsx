import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import BottomNav from "@/components/BottomNav";
import { ThemedText } from "@/components/themed-text";
import { UserAvatar, invalidateAvatarCache } from "@/components/UserAvatar";
import { API_BASE_URL } from "@/constants/api";
import { AppTheme } from "@/constants/theme";
import { getToken } from "@/constants/tokens";
import { useTheme } from "@/context/ThemeContext";
import { logEvent } from "@/services/firebase";
import { saveSettings } from "@/services/settingsService";

type UserDTO = {
  username: string;
  email: string;
  role: "STUDENT" | "TEACHER" | string;
};

export default function SettingsScreen() {
  const { theme, isDarkMode, isHighContrast, setDarkMode, setHighContrast } = useTheme();

  const [shareLocation, setShareLocation] = useState(true);
  const [user, setUser] = useState<UserDTO | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [school, setSchool] = useState("");
  const [faculty, setFaculty] = useState("");
  const [subjects, setSubjects] = useState("");
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");

  useEffect(() => {
    loadMe();
    loadAvatar();
  }, []);

  async function loadMe() {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setUser(json.data);
        setRole(json.data.role === "TEACHER" ? "TEACHER" : "STUDENT");
      }
    } catch {}
  }

  async function loadAvatar() {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/user/avatar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        const url = json.data.startsWith("http")
          ? json.data
          : `${API_BASE_URL}${json.data}`;
        setAvatarUrl(url);
      }
    } catch {}
  }

  async function pickAndUploadAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Allow access to photo library");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.uri) return;

    setUploadingAvatar(true);
    try {
      const token = await getToken();
      if (!token) return;

      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        name: asset.fileName || "avatar.jpg",
        type: asset.mimeType || "image/jpeg",
      } as any);

      const res = await fetch(`${API_BASE_URL}/user/upload-avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        invalidateAvatarCache(user?.username ?? "");
        await loadAvatar();
        logEvent("avatar_uploaded"); 
        Alert.alert("Success", "Avatar uploaded");
      } else {
        Alert.alert("Error", json.message ?? "Upload failed");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function openProfileCard() {
    setModalVisible(true);
    setEditMode(false);
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/user/card`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSchool(json.data.school ?? "");
        setFaculty(json.data.faculty ?? "");
        setSubjects(Array.isArray(json.data.subjects) ? json.data.subjects.join(", ") : "");
      } else {
        setSchool(""); setFaculty(""); setSubjects("");
      }
    } catch {
      setSchool(""); setFaculty(""); setSubjects("");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) return;

      const roleRes = await fetch(`${API_BASE_URL}/user/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role }),
      });
      const roleJson = await roleRes.json();
      if (!roleJson.success) {
        Alert.alert("Error", roleJson.message ?? "Failed to update role");
        return;
      }

      if (role === "STUDENT") {
        if (!school.trim() || !faculty.trim() || !subjects.trim()) {
          Alert.alert("Validation", "Please fill in university, faculty and at least one subject");
          return;
        }
        const subjectList = subjects.split(",").map((s) => s.trim()).filter(Boolean);
        const cardRes = await fetch(`${API_BASE_URL}/user/update-card`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ school: school.trim(), faculty: faculty.trim(), subjects: subjectList }),
        });
        const cardJson = await cardRes.json();
        if (!cardJson.success) {
          Alert.alert("Error", cardJson.message ?? "Failed to update profile");
          return;
        }
      }

      setUser((prev) => prev ? { ...prev, role } : prev);
      setEditMode(false);
      logEvent("profile_updated", { role });
      Alert.alert("Saved", "Profile updated successfully");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDarkMode(value: boolean) {
    try { await setDarkMode(value); logEvent("theme_changed", { darkMode: value });}
    catch { Alert.alert("Error", "Failed to update Dark Mode"); }
  }

  async function handleHighContrast(value: boolean) {
    try { await setHighContrast(value); logEvent("high_contrast_changed", { enabled: value });}
    catch { Alert.alert("Error", "Failed to update High Contrast"); }
  }

  async function handleShareLocation(value: boolean) {
    const old = shareLocation;
    setShareLocation(value);
    try { await saveSettings({ shareLocation: value }); }
    catch { setShareLocation(old); Alert.alert("Error", "Failed to update Share Location"); }
  }

  const s = makeStyles(theme);
  const roleLine = user?.role
    ? `Role: ${user.role.charAt(0) + user.role.slice(1).toLowerCase()}`
    : "Role: student / teacher";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          <ThemedText type="title" style={s.title}>Settings</ThemedText>

          {/* Profile card */}
          <View style={[s.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity onPress={pickAndUploadAvatar} style={s.avatarWrap}>
              <UserAvatar
                username={user?.username ?? ""}
                size={68}
                avatarUrl={avatarUrl}
                isCurrentUser
              />
              <View style={[s.cameraBadge, { backgroundColor: theme.primary }]}>
                {uploadingAvatar
                  ? <ActivityIndicator size={10} color={theme.onPrimary} />
                  : <Ionicons name="camera-outline" size={11} color={theme.onPrimary} />
                }
              </View>
            </TouchableOpacity>

            <View style={s.profileInfo}>
              <ThemedText style={[s.profileName, { color: theme.text }]}>
                {user?.username ?? "Account"}
              </ThemedText>
              <ThemedText style={[s.profileRole, { color: theme.secondaryText }]}>
                {roleLine}
              </ThemedText>
            </View>

            <TouchableOpacity
              style={[s.editBtn, { backgroundColor: theme.surface }]}
              onPress={openProfileCard}
            >
              <Ionicons name="pencil-outline" size={18} color={theme.icon} />
            </TouchableOpacity>
          </View>

          {/* ── Toggles ──────────────────────────────────────── */}
          <View style={[s.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <SettingRow icon="moon-outline" title="Dark mode" value={isDarkMode} onChange={handleDarkMode} theme={theme} />
            <View style={[s.divider, { backgroundColor: theme.border }]} />
            <SettingRow icon="contrast-outline" title="High contrast" value={isHighContrast} onChange={handleHighContrast} theme={theme} />
            <View style={[s.divider, { backgroundColor: theme.border }]} />
            <SettingRow icon="location-outline" title="Share location" value={shareLocation} onChange={handleShareLocation} theme={theme} />
          </View>

          {/* ── Actions ──────────────────────────────────────── */}
          <TouchableOpacity
            style={[s.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => router.push("/tabs/scan-qr")}
          >
            <Ionicons name="qr-code-outline" size={20} color={theme.icon} />
            <ThemedText style={[s.actionText, { color: theme.text }]}>Scan QR</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={openProfileCard}
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

      {/* ── Profile Card Modal ────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => { setModalVisible(false); setEditMode(false); }}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: theme.card, borderColor: theme.border }]}>

            {/* Modal header */}
            <View style={s.modalHeader}>
              <ThemedText style={[s.modalTitle, { color: theme.text }]}>Profile Card</ThemedText>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {!editMode && (
                  <TouchableOpacity
                    style={[s.closeBtn, { backgroundColor: theme.surface }]}
                    onPress={() => setEditMode(true)}
                  >
                    <Ionicons name="pencil-outline" size={18} color={theme.icon} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[s.closeBtn, { backgroundColor: theme.surface }]}
                  onPress={() => { setModalVisible(false); setEditMode(false); }}
                >
                  <Ionicons name="close" size={20} color={theme.icon} />
                </TouchableOpacity>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 32 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>

                {/* Avatar + name row */}
                <View style={s.modalAvatarRow}>
                  <TouchableOpacity onPress={pickAndUploadAvatar} style={s.modalAvatarWrap}>
                    <UserAvatar
                      username={user?.username ?? ""}
                      size={72}
                      avatarUrl={avatarUrl}
                      isCurrentUser
                    />
                    <View style={[s.cameraBadge, { backgroundColor: theme.primary }]}>
                      <Ionicons name="camera-outline" size={11} color={theme.onPrimary} />
                    </View>
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <ThemedText style={[s.modalName, { color: theme.text }]}>
                      {user?.username ?? "—"}
                    </ThemedText>
                    <ThemedText style={[s.modalEmail, { color: theme.secondaryText }]}>
                      {user?.email ?? ""}
                    </ThemedText>
                  </View>
                </View>

                {/* Role selector */}
                <ThemedText style={[s.fieldLabel, { color: theme.secondaryText }]}>Role</ThemedText>
                <View style={[s.roleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  {(["STUDENT", "TEACHER"] as const).map((r) => (
                    <Pressable
                      key={r}
                      style={[
                        s.roleBtn,
                        role === r && { backgroundColor: theme.primary },
                        !editMode && { opacity: 0.6 },
                      ]}
                      onPress={() => editMode && setRole(r)}
                      disabled={!editMode}
                    >
                      <ThemedText style={{
                        fontWeight: "700",
                        fontSize: 13,
                        color: role === r ? theme.onPrimary : theme.secondaryText,
                      }}>
                        {r}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>

                {/* Student fields */}
                {role === "STUDENT" && (
                  <>
                    <ThemedText style={[s.fieldLabel, { color: theme.secondaryText }]}>University</ThemedText>
                    <TextInput
                      value={school}
                      onChangeText={setSchool}
                      editable={editMode}
                      placeholder="e.g. KPI, Lviv Polytechnic"
                      placeholderTextColor={theme.placeholder}
                      style={[s.input, {
                        backgroundColor: editMode ? theme.inputBackground : theme.surface,
                        borderColor: editMode ? theme.primary : theme.border,
                        color: theme.text,
                      }]}
                    />

                    <ThemedText style={[s.fieldLabel, { color: theme.secondaryText }]}>Faculty</ThemedText>
                    <TextInput
                      value={faculty}
                      onChangeText={setFaculty}
                      editable={editMode}
                      placeholder="e.g. Computer Science"
                      placeholderTextColor={theme.placeholder}
                      style={[s.input, {
                        backgroundColor: editMode ? theme.inputBackground : theme.surface,
                        borderColor: editMode ? theme.primary : theme.border,
                        color: theme.text,
                      }]}
                    />

                    <ThemedText style={[s.fieldLabel, { color: theme.secondaryText }]}>
                      Subjects{" "}
                      <ThemedText style={{ color: theme.placeholder, fontSize: 12 }}>
                        (comma-separated)
                      </ThemedText>
                    </ThemedText>
                    <TextInput
                      value={subjects}
                      onChangeText={setSubjects}
                      editable={editMode}
                      placeholder="e.g. Math, OOP, Databases"
                      placeholderTextColor={theme.placeholder}
                      multiline
                      style={[s.input, s.inputMulti, {
                        backgroundColor: editMode ? theme.inputBackground : theme.surface,
                        borderColor: editMode ? theme.primary : theme.border,
                        color: theme.text,
                      }]}
                    />
                  </>
                )}

                {/* Save / Cancel */}
                {editMode && (
                  <View style={s.editActions}>
                    <Pressable
                      style={[s.cancelBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                      onPress={() => setEditMode(false)}
                    >
                      <ThemedText style={{ color: theme.text, fontWeight: "600" }}>Cancel</ThemedText>
                    </Pressable>
                    <Pressable
                      style={[s.saveBtn, { backgroundColor: theme.primary }]}
                      onPress={saveProfile}
                      disabled={saving}
                    >
                      {saving
                        ? <ActivityIndicator color={theme.onPrimary} />
                        : <ThemedText style={{ color: theme.onPrimary, fontWeight: "700" }}>Save</ThemedText>
                      }
                    </Pressable>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── SettingRow ────────────────────────────────────────────────────────────────
function SettingRow({
  icon, title, value, onChange, theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: boolean;
  onChange: (v: boolean) => void;
  theme: AppTheme;
}) {
  return (
    <View style={sr.row}>
      <View style={sr.left}>
        <View style={[sr.iconWrap, { backgroundColor: theme.surface }]}>
          <Ionicons name={icon} size={20} color={theme.icon} />
        </View>
        <ThemedText style={[sr.title, { color: theme.text }]}>{title}</ThemedText>
      </View>
      <View style={sr.right}>
        <ThemedText style={[sr.state, { color: theme.secondaryText }]}>
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

const sr = StyleSheet.create({
  row: { minHeight: 72, borderRadius: 16, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  left: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "600" },
  right: { flexDirection: "row", alignItems: "center", gap: 10 },
  state: { fontSize: 14, minWidth: 24 },
});

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 140 },
    title: { textAlign: "center", marginTop: 8, marginBottom: 28, fontSize: 28, fontWeight: "700", color: theme.text },
    profileCard: { borderRadius: 22, padding: 18, flexDirection: "row", alignItems: "center", marginBottom: 24, borderWidth: 1, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    avatarWrap: { marginRight: 14, position: "relative" },
    cameraBadge: { position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 22, fontWeight: "700" },
    profileRole: { marginTop: 4, fontSize: 14 },
    editBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
    section: { borderRadius: 22, padding: 8, marginBottom: 28, borderWidth: 1, elevation: 2 },
    divider: { height: 1, marginHorizontal: 12 },
    actionButton: { height: 58, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 14, borderWidth: 1, elevation: 2 },
    actionText: { fontSize: 17, fontWeight: "600" },
    logoutButton: { marginTop: 6 },
    logoutText: { fontSize: 17, fontWeight: "700" },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderWidth: 1, paddingBottom: 40, maxHeight: "90%" },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: "700" },
    closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    modalAvatarRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 },
    modalAvatarWrap: { position: "relative" },
    modalName: { fontSize: 20, fontWeight: "700" },
    modalEmail: { fontSize: 13, marginTop: 2 },
    roleRow: { flexDirection: "row", borderRadius: 12, borderWidth: 1, padding: 4, marginBottom: 16 },
    roleBtn: { flex: 1, height: 40, borderRadius: 9, alignItems: "center", justifyContent: "center" },
    fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 4 },
    input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, marginBottom: 12 },
    inputMulti: { height: 80, paddingTop: 12, textAlignVertical: "top" },
    editActions: { flexDirection: "row", gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
    saveBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  });
}