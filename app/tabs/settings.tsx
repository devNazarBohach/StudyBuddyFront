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
import {
  FONT_SCALE_LABELS,
  FONT_SCALE_STEPS,
  useTheme,
} from "@/context/ThemeContext";
import { useScreenTracking } from "@/hooks/useScreenTracking";
import {
  logAvatarUploaded,
  logFontScaleChanged,
  logLocationSharedToggle,
  logLogout,
  logProfileUpdated,
  logThemeChanged,
} from "@/services/firebase";
import { saveSettings } from "@/services/settingsService";

type UserDTO = {
  username: string;
  email: string;
  role: "STUDENT" | "TEACHER" | string;
};

type SettingsDTO = {
  darkMode?: boolean;
  highContrast?: boolean;
  shareLocation?: boolean;
  studyReminderEnabled?: boolean;
  studyReminderHour?: number | null;
  studyReminderMinute?: number | null;
  pushNotifications?: boolean;
};

export default function SettingsScreen() {
  const {
    theme,
    isDarkMode,
    isHighContrast,
    setDarkMode,
    setHighContrast,
    fontScale,
    setFontScale,
    fs,
  } = useTheme();

  const [shareLocation, setShareLocation] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  const [studyReminderEnabled, setStudyReminderEnabled] = useState(false);
  const [studyHour, setStudyHour] = useState("");
  const [studyMinute, setStudyMinute] = useState("");
  const [savingStudyReminder, setSavingStudyReminder] = useState(false);

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

  useScreenTracking("SettingsScreen");

  useEffect(() => {
    loadMe();
    loadAvatar();
    loadSettings();
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

  async function loadSettings() {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/user/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();

      if (json.success && json.data) {
        const data: SettingsDTO = json.data;

        if (typeof data.shareLocation === "boolean") {
          setShareLocation(data.shareLocation);
        }

        if (typeof data.pushNotifications === "boolean") {
          setPushNotifications(data.pushNotifications);
        }

        if (typeof data.studyReminderEnabled === "boolean") {
          setStudyReminderEnabled(data.studyReminderEnabled);
        }

        if (
          data.studyReminderHour !== null &&
          data.studyReminderHour !== undefined
        ) {
          setStudyHour(String(data.studyReminderHour));
        }

        if (
          data.studyReminderMinute !== null &&
          data.studyReminderMinute !== undefined
        ) {
          setStudyMinute(String(data.studyReminderMinute));
        }
      }
    } catch (e) {
      console.log("LOAD SETTINGS ERROR", e);
    }
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
        logAvatarUploaded();
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
        setSubjects(
          Array.isArray(json.data.subjects)
            ? json.data.subjects.join(", ")
            : ""
        );
      } else {
        setSchool("");
        setFaculty("");
        setSubjects("");
      }
    } catch {
      setSchool("");
      setFaculty("");
      setSubjects("");
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });

      const roleJson = await roleRes.json();

      if (!roleJson.success) {
        Alert.alert("Error", roleJson.message ?? "Failed to update role");
        return;
      }

      if (role === "STUDENT") {
        if (!school.trim() || !faculty.trim() || !subjects.trim()) {
          Alert.alert(
            "Validation",
            "Please fill in university, faculty and at least one subject"
          );
          return;
        }

        const subjectList = subjects
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        const cardRes = await fetch(`${API_BASE_URL}/user/update-card`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            school: school.trim(),
            faculty: faculty.trim(),
            subjects: subjectList,
          }),
        });

        const cardJson = await cardRes.json();

        if (!cardJson.success) {
          Alert.alert("Error", cardJson.message ?? "Failed to update profile");
          return;
        }
      }

      setUser((prev) => (prev ? { ...prev, role } : prev));
      setEditMode(false);
      logProfileUpdated(role);
      Alert.alert("Saved", "Profile updated successfully");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDarkMode(value: boolean) {
    try {
      await setDarkMode(value);
      logThemeChanged(value, isHighContrast);
    } catch {
      Alert.alert("Error", "Failed to update Dark Mode");
    }
  }

  async function handleHighContrast(value: boolean) {
    try {
      await setHighContrast(value);
      logThemeChanged(isDarkMode, value);
    } catch {
      Alert.alert("Error", "Failed to update High Contrast");
    }
  }

  async function handleShareLocation(value: boolean) {
    const old = shareLocation;
    setShareLocation(value);

    try {
      await saveSettings({ shareLocation: value });
      logLocationSharedToggle(value);
    } catch {
      setShareLocation(old);
      Alert.alert("Error", "Failed to update Share Location");
    }
  }

  async function handlePushNotifications(value: boolean) {
    const old = pushNotifications;
    setPushNotifications(value);

    try {
      await saveSettings({ pushNotifications: value });
    } catch {
      setPushNotifications(old);
      Alert.alert("Error", "Failed to update push notifications");
    }
  }

  function handleStudyReminderToggle(value: boolean) {
    setStudyReminderEnabled(value);
  }

  async function handleSaveStudyReminder() {
    const hour = Number(studyHour);
    const minute = Number(studyMinute);

    if (studyReminderEnabled) {
      if (studyHour.trim() === "" || studyMinute.trim() === "") {
        Alert.alert("Validation", "Please enter study hour and minute");
        return;
      }

      if (Number.isNaN(hour) || hour < 0 || hour > 23) {
        Alert.alert("Validation", "Hour must be between 0 and 23");
        return;
      }

      if (Number.isNaN(minute) || minute < 0 || minute > 59) {
        Alert.alert("Validation", "Minute must be between 0 and 59");
        return;
      }
    }

    setSavingStudyReminder(true);

    try {
      const token = await getToken();
      if (!token) return;

      const body = studyReminderEnabled
        ? {
            studyReminderEnabled: true,
            studyReminderHour: hour,
            studyReminderMinute: minute,
          }
        : {
            studyReminderEnabled: false,
          };

      const res = await fetch(`${API_BASE_URL}/user/settings`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!json.success) {
        Alert.alert("Error", json.message ?? "Failed to save study reminder");
        return;
      }

      Alert.alert("Saved", "Study reminder updated");
      await loadSettings();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save study reminder");
    } finally {
      setSavingStudyReminder(false);
    }
  }

  const s = makeStyles(theme, fs);

  const roleLine = user?.role
    ? `Role: ${user.role.charAt(0) + user.role.slice(1).toLowerCase()}`
    : "Role: student / teacher";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="title" style={s.title}>
            Settings
          </ThemedText>

          <View
            style={[
              s.profileCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <TouchableOpacity onPress={pickAndUploadAvatar} style={s.avatarWrap}>
              <UserAvatar
                username={user?.username ?? ""}
                size={68}
                avatarUrl={avatarUrl}
                isCurrentUser
              />

              <View style={[s.cameraBadge, { backgroundColor: theme.primary }]}>
                {uploadingAvatar ? (
                  <ActivityIndicator size={10} color={theme.onPrimary} />
                ) : (
                  <Ionicons
                    name="camera-outline"
                    size={11}
                    color={theme.onPrimary}
                  />
                )}
              </View>
            </TouchableOpacity>

            <View style={s.profileInfo}>
              <ThemedText style={[s.profileName, { color: theme.text }]}>
                {user?.username ?? "Account"}
              </ThemedText>

              <ThemedText
                style={[s.profileRole, { color: theme.secondaryText }]}
              >
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

          <View
            style={[
              s.section,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <SettingRow
              icon="moon-outline"
              title="Dark mode"
              value={isDarkMode}
              onChange={handleDarkMode}
              theme={theme}
              fs={fs}
            />

            <View style={[s.divider, { backgroundColor: theme.border }]} />

            <SettingRow
              icon="contrast-outline"
              title="High contrast"
              value={isHighContrast}
              onChange={handleHighContrast}
              theme={theme}
              fs={fs}
            />

            <View style={[s.divider, { backgroundColor: theme.border }]} />

            <SettingRow
              icon="location-outline"
              title="Share location"
              value={shareLocation}
              onChange={handleShareLocation}
              theme={theme}
              fs={fs}
            />

            <View style={[s.divider, { backgroundColor: theme.border }]} />

            <SettingRow
              icon="notifications-outline"
              title="Push notifications"
              value={pushNotifications}
              onChange={handlePushNotifications}
              theme={theme}
              fs={fs}
            />
          </View>

          <View
            style={[
              s.section,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={s.studyHeader}>
              <View style={[s.fontIconWrap, { backgroundColor: theme.surface }]}>
                <Ionicons name="school-outline" size={20} color={theme.icon} />
              </View>

              <View style={{ flex: 1 }}>
                <ThemedText style={[s.fontSizeTitle, { color: theme.text }]}>
                  Study hours
                </ThemedText>

                <ThemedText
                  style={[s.studySubtitle, { color: theme.secondaryText }]}
                >
                  Get a reminder when it is time to study
                </ThemedText>
              </View>

              <Switch
                value={studyReminderEnabled}
                onValueChange={handleStudyReminderToggle}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={
                  studyReminderEnabled ? theme.onPrimary : theme.secondaryText
                }
              />
            </View>

            <View style={[s.divider, { backgroundColor: theme.border }]} />

            <View style={s.studyTimeRow}>
              <View style={{ flex: 1 }}>
                <ThemedText
                  style={[s.studyInputLabel, { color: theme.secondaryText }]}
                >
                  Hour
                </ThemedText>

                <TextInput
                  value={studyHour}
                  onChangeText={(v) =>
                    setStudyHour(v.replace(/[^0-9]/g, "").slice(0, 2))
                  }
                  editable={studyReminderEnabled}
                  keyboardType="number-pad"
                  placeholder="18"
                  placeholderTextColor={theme.placeholder}
                  style={[
                    s.studyInput,
                    {
                      backgroundColor: studyReminderEnabled
                        ? theme.inputBackground
                        : theme.surface,
                      borderColor: studyReminderEnabled
                        ? theme.primary
                        : theme.border,
                      color: theme.text,
                      opacity: studyReminderEnabled ? 1 : 0.6,
                      fontSize: fs(16),
                    },
                  ]}
                />
              </View>

              <ThemedText
                style={[s.timeSeparator, { color: theme.secondaryText }]}
              >
                :
              </ThemedText>

              <View style={{ flex: 1 }}>
                <ThemedText
                  style={[s.studyInputLabel, { color: theme.secondaryText }]}
                >
                  Minute
                </ThemedText>

                <TextInput
                  value={studyMinute}
                  onChangeText={(v) =>
                    setStudyMinute(v.replace(/[^0-9]/g, "").slice(0, 2))
                  }
                  editable={studyReminderEnabled}
                  keyboardType="number-pad"
                  placeholder="30"
                  placeholderTextColor={theme.placeholder}
                  style={[
                    s.studyInput,
                    {
                      backgroundColor: studyReminderEnabled
                        ? theme.inputBackground
                        : theme.surface,
                      borderColor: studyReminderEnabled
                        ? theme.primary
                        : theme.border,
                      color: theme.text,
                      opacity: studyReminderEnabled ? 1 : 0.6,
                      fontSize: fs(16),
                    },
                  ]}
                />
              </View>
            </View>

            <Pressable
              style={[
                s.studySaveBtn,
                {
                  backgroundColor: theme.primary,
                  opacity: savingStudyReminder ? 0.7 : 1,
                },
              ]}
              onPress={handleSaveStudyReminder}
              disabled={savingStudyReminder}
            >
              {savingStudyReminder ? (
                <ActivityIndicator color={theme.onPrimary} />
              ) : (
                <>
                  <Ionicons
                    name="save-outline"
                    size={18}
                    color={theme.onPrimary}
                  />
                  <ThemedText
                    style={[s.studySaveText, { color: theme.onPrimary }]}
                  >
                    Save study hours
                  </ThemedText>
                </>
              )}
            </Pressable>
          </View>

          <View
            style={[
              s.section,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={s.fontSizeHeader}>
              <View style={[s.fontIconWrap, { backgroundColor: theme.surface }]}>
                <Ionicons name="text-outline" size={20} color={theme.icon} />
              </View>

              <ThemedText style={[s.fontSizeTitle, { color: theme.text }]}>
                Text size
              </ThemedText>
            </View>

            <View style={s.fontStepsRow}>
              {FONT_SCALE_STEPS.map((step) => {
                const active = fontScale === step;

                return (
                  <TouchableOpacity
                    key={step}
                    onPress={() => {
                      setFontScale(step);
                      logFontScaleChanged(step);
                    }}
                    style={[
                      s.fontStep,
                      {
                        backgroundColor: active ? theme.primary : theme.surface,
                        borderColor: active ? theme.primary : theme.border,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Text size ${FONT_SCALE_LABELS[step]}`}
                  >
                    <ThemedText
                      style={{
                        fontSize: fs(
                          12 + FONT_SCALE_STEPS.indexOf(step) * 3
                        ),
                        fontWeight: "700",
                        color: active ? theme.onPrimary : theme.secondaryText,
                      }}
                    >
                      {FONT_SCALE_LABELS[step]}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View
              style={[
                s.fontPreview,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <ThemedText
                style={{
                  color: theme.secondaryText,
                  fontSize: fs(12),
                  marginBottom: 4,
                }}
              >
                Preview
              </ThemedText>

              <ThemedText style={{ color: theme.text, fontSize: fs(16) }}>
                Regular text looks like this
              </ThemedText>

              <ThemedText
                style={{
                  color: theme.text,
                  fontSize: fs(22),
                  fontWeight: "700",
                  marginTop: 4,
                }}
              >
                Heading looks like this
              </ThemedText>
            </View>
          </View>

          <TouchableOpacity
            style={[
              s.actionButton,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            onPress={() => router.push("/tabs/scan-qr")}
          >
            <Ionicons name="qr-code-outline" size={20} color={theme.icon} />
            <ThemedText style={[s.actionText, { color: theme.text }]}>
              Scan QR
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              s.actionButton,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            onPress={openProfileCard}
          >
            <Ionicons
              name="person-circle-outline"
              size={20}
              color={theme.icon}
            />
            <ThemedText style={[s.actionText, { color: theme.text }]}>
              Profile card
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionButton, s.logoutButton, { borderColor: theme.danger }]}
            onPress={async () => {
              await logLogout();
              router.replace("/auth/login");
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.danger} />
            <ThemedText style={[s.logoutText, { color: theme.danger }]}>
              Logout
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>

        <BottomNav />
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setModalVisible(false);
          setEditMode(false);
        }}
      >
        <View style={s.modalOverlay}>
          <View
            style={[
              s.modalSheet,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={s.modalHeader}>
              <ThemedText style={[s.modalTitle, { color: theme.text }]}>
                Profile Card
              </ThemedText>

              <View style={{ flexDirection: "row", gap: 8 }}>
                {!editMode && (
                  <TouchableOpacity
                    style={[s.closeBtn, { backgroundColor: theme.surface }]}
                    onPress={() => setEditMode(true)}
                  >
                    <Ionicons
                      name="pencil-outline"
                      size={18}
                      color={theme.icon}
                    />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[s.closeBtn, { backgroundColor: theme.surface }]}
                  onPress={() => {
                    setModalVisible(false);
                    setEditMode(false);
                  }}
                >
                  <Ionicons name="close" size={20} color={theme.icon} />
                </TouchableOpacity>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator
                size="large"
                color={theme.primary}
                style={{ marginTop: 32 }}
              />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={s.modalAvatarRow}>
                  <TouchableOpacity
                    onPress={pickAndUploadAvatar}
                    style={s.modalAvatarWrap}
                  >
                    <UserAvatar
                      username={user?.username ?? ""}
                      size={72}
                      avatarUrl={avatarUrl}
                      isCurrentUser
                    />

                    <View
                      style={[s.cameraBadge, { backgroundColor: theme.primary }]}
                    >
                      <Ionicons
                        name="camera-outline"
                        size={11}
                        color={theme.onPrimary}
                      />
                    </View>
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <ThemedText style={[s.modalName, { color: theme.text }]}>
                      {user?.username ?? "—"}
                    </ThemedText>

                    <ThemedText
                      style={[s.modalEmail, { color: theme.secondaryText }]}
                    >
                      {user?.email ?? ""}
                    </ThemedText>
                  </View>
                </View>

                <ThemedText
                  style={[s.fieldLabel, { color: theme.secondaryText }]}
                >
                  Role
                </ThemedText>

                <View
                  style={[
                    s.roleRow,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}
                >
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
                      <ThemedText
                        style={{
                          fontWeight: "700",
                          fontSize: fs(13),
                          color:
                            role === r ? theme.onPrimary : theme.secondaryText,
                        }}
                      >
                        {r}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>

                {role === "STUDENT" && (
                  <>
                    <ThemedText
                      style={[s.fieldLabel, { color: theme.secondaryText }]}
                    >
                      University
                    </ThemedText>

                    <TextInput
                      value={school}
                      onChangeText={setSchool}
                      editable={editMode}
                      placeholder="e.g. KPI, Lviv Polytechnic"
                      placeholderTextColor={theme.placeholder}
                      style={[
                        s.input,
                        {
                          backgroundColor: editMode
                            ? theme.inputBackground
                            : theme.surface,
                          borderColor: editMode ? theme.primary : theme.border,
                          color: theme.text,
                          fontSize: fs(15),
                        },
                      ]}
                    />

                    <ThemedText
                      style={[s.fieldLabel, { color: theme.secondaryText }]}
                    >
                      Faculty
                    </ThemedText>

                    <TextInput
                      value={faculty}
                      onChangeText={setFaculty}
                      editable={editMode}
                      placeholder="e.g. Computer Science"
                      placeholderTextColor={theme.placeholder}
                      style={[
                        s.input,
                        {
                          backgroundColor: editMode
                            ? theme.inputBackground
                            : theme.surface,
                          borderColor: editMode ? theme.primary : theme.border,
                          color: theme.text,
                          fontSize: fs(15),
                        },
                      ]}
                    />

                    <ThemedText
                      style={[s.fieldLabel, { color: theme.secondaryText }]}
                    >
                      Subjects{" "}
                      <ThemedText
                        style={{ color: theme.placeholder, fontSize: fs(12) }}
                      >
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
                      style={[
                        s.input,
                        s.inputMulti,
                        {
                          backgroundColor: editMode
                            ? theme.inputBackground
                            : theme.surface,
                          borderColor: editMode ? theme.primary : theme.border,
                          color: theme.text,
                          fontSize: fs(15),
                        },
                      ]}
                    />
                  </>
                )}

                {editMode && (
                  <View style={s.editActions}>
                    <Pressable
                      style={[
                        s.cancelBtn,
                        {
                          backgroundColor: theme.surface,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={() => setEditMode(false)}
                    >
                      <ThemedText
                        style={{
                          color: theme.text,
                          fontWeight: "600",
                          fontSize: fs(15),
                        }}
                      >
                        Cancel
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      style={[s.saveBtn, { backgroundColor: theme.primary }]}
                      onPress={saveProfile}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator color={theme.onPrimary} />
                      ) : (
                        <ThemedText
                          style={{
                            color: theme.onPrimary,
                            fontWeight: "700",
                            fontSize: fs(15),
                          }}
                        >
                          Save
                        </ThemedText>
                      )}
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

function SettingRow({
  icon,
  title,
  value,
  onChange,
  theme,
  fs,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: boolean;
  onChange: (v: boolean) => void;
  theme: AppTheme;
  fs: (n: number) => number;
}) {
  return (
    <View style={sr.row}>
      <View style={sr.left}>
        <View style={[sr.iconWrap, { backgroundColor: theme.surface }]}>
          <Ionicons name={icon} size={20} color={theme.icon} />
        </View>

        <ThemedText style={[sr.title, { color: theme.text, fontSize: fs(17) }]}>
          {title}
        </ThemedText>
      </View>

      <View style={sr.right}>
        <ThemedText
          style={[sr.state, { color: theme.secondaryText, fontSize: fs(14) }]}
        >
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
  row: {
    minHeight: 72,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontWeight: "600",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  state: {
    minWidth: 24,
  },
});

function makeStyles(theme: AppTheme, fs: (n: number) => number) {
  return StyleSheet.create({
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 140,
    },
    title: {
      textAlign: "center",
      marginTop: 8,
      marginBottom: 28,
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
      elevation: 3,
    },
    avatarWrap: {
      marginRight: 14,
      position: "relative",
    },
    cameraBadge: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: fs(22),
      fontWeight: "700",
    },
    profileRole: {
      marginTop: 4,
      fontSize: fs(14),
    },
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
      marginBottom: 20,
      borderWidth: 1,
      elevation: 2,
    },
    divider: {
      height: 1,
      marginHorizontal: 12,
    },

    studyHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    studySubtitle: {
      fontSize: fs(12),
      marginTop: 2,
    },
    studyTimeRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 12,
      paddingHorizontal: 12,
      paddingTop: 14,
      paddingBottom: 12,
    },
    studyInputLabel: {
      fontSize: fs(13),
      fontWeight: "600",
      marginBottom: 6,
    },
    studyInput: {
      height: 48,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      textAlign: "center",
      fontWeight: "700",
    },
    timeSeparator: {
      fontSize: fs(28),
      fontWeight: "700",
      paddingBottom: 8,
    },
    studySaveBtn: {
      height: 50,
      borderRadius: 14,
      marginHorizontal: 12,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    studySaveText: {
      fontSize: fs(15),
      fontWeight: "700",
    },

    fontSizeHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 8,
    },
    fontIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    fontSizeTitle: {
      fontSize: fs(17),
      fontWeight: "600",
    },
    fontStepsRow: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 12,
      paddingBottom: 12,
    },
    fontStep: {
      flex: 1,
      height: 52,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    fontPreview: {
      marginHorizontal: 12,
      marginBottom: 12,
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
    },
    actionButton: {
      height: 58,
      borderRadius: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      marginBottom: 14,
      borderWidth: 1,
      elevation: 2,
    },
    actionText: {
      fontSize: fs(17),
      fontWeight: "600",
    },
    logoutButton: {
      marginTop: 6,
    },
    logoutText: {
      fontSize: fs(17),
      fontWeight: "700",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 24,
      borderWidth: 1,
      paddingBottom: 40,
      maxHeight: "90%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: fs(22),
      fontWeight: "700",
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    modalAvatarRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginBottom: 20,
    },
    modalAvatarWrap: {
      position: "relative",
    },
    modalName: {
      fontSize: fs(20),
      fontWeight: "700",
    },
    modalEmail: {
      fontSize: fs(13),
      marginTop: 2,
    },
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
    fieldLabel: {
      fontSize: fs(13),
      fontWeight: "600",
      marginBottom: 6,
      marginTop: 4,
    },
    input: {
      height: 48,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      marginBottom: 12,
    },
    inputMulti: {
      height: 80,
      paddingTop: 12,
      textAlignVertical: "top",
    },
    editActions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 8,
    },
    cancelBtn: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
    },
    saveBtn: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}