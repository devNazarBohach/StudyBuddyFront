import { API_BASE_URL } from "@/constants/api";
import { logEvent, setUser } from "@/services/firebase";
import { statusCodes } from "@react-native-google-signin/google-signin";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getToken, saveToken } from "@/constants/tokens";
import { useTheme } from "@/context/ThemeContext";
import { authApi } from "@/services";
import {
  configureGoogleSignIn,
  signInWithGoogleAndGetIdToken,
  signOutFromGoogleSilently,
} from "@/services/googleSignIn";
import { useAppState } from "@/state/AppState";

type LoginPayload = {
  username: string;
  password: string;
};

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { setMyUsername, setAdminMode } = useAppState();
  const { theme } = useTheme();

  async function onLogin() {
    const payload: LoginPayload = { username: username.trim(), password };

    if (!payload.username || !payload.password) {
      Alert.alert("Validation error", "Username and password are required");
      return;
    }

    try {
      setLoading(true);

      const res = await authApi.login(payload);
      console.log("MANUAL LOGIN RESPONSE:", res);

      if (!res.token) {
        Alert.alert("Login failed", res.message ?? "Invalid credentials");
        return;
      }

      await saveToken(res.token);
      console.log("SAVED TOKEN?", await getToken());

      setMyUsername(username.trim());
      setAdminMode(false);

      Alert.alert("Success", "Logged in");
      await setUser(username);
      await logEvent("login", { method: "manual" });
      router.replace("/tabs/friends");
    } catch (e: any) {
      Alert.alert("Network error", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleLogin() {
  try {
    setGoogleLoading(true);
    configureGoogleSignIn();
    await signOutFromGoogleSilently();

    const { idToken, photoUrl } = await signInWithGoogleAndGetIdToken();
    const res = await authApi.googleLogin({ idToken });

    if (!res.token || !res.user) {
      Alert.alert("Google login failed", res.message ?? "No token returned");
      return;
    }

    await saveToken(res.token);
    setMyUsername(res.user.username);
    setAdminMode(false);

    // Auto-upload Google profile photo if available
    if (photoUrl) {
      try {
        await uploadGooglePhoto(res.token, photoUrl);
      } catch {
        // Not critical — silent fail
      }
    }

    router.replace("/tabs/friends");
  } catch (e: any) {
    if (e?.code === statusCodes.SIGN_IN_CANCELLED) return;
    if (e?.code === statusCodes.IN_PROGRESS) {
      Alert.alert("Please wait", "Google sign-in is already in progress");
      return;
    }
    if (e?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      Alert.alert("Google Play Services", "Google Play Services are missing or need update");
      return;
    }
    Alert.alert("Google sign-in failed", e?.message ?? "Unknown error");
  } finally {
    setGoogleLoading(false);
  }
}

async function uploadGooglePhoto(token: string, photoUrl: string) {
  // Download the photo from Google CDN
  const response = await fetch(photoUrl);
  const blob = await response.blob();

  const formData = new FormData();
  formData.append("file", {
    uri: photoUrl,
    name: "google_avatar.jpg",
    type: "image/jpeg",
  } as any);

  await fetch(`${API_BASE_URL}/user/upload-avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
}

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedText type="title" style={{ color: theme.text }}>Login</ThemedText>

      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="Username"
        autoCapitalize="none"
        keyboardType="default"
        style={[
          styles.input,
          {
            backgroundColor: theme.inputBackground,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
        placeholderTextColor={theme.placeholder}
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={[
          styles.input,
          {
            backgroundColor: theme.inputBackground,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
        placeholderTextColor={theme.placeholder}
      />

      <Pressable
        style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
        onPress={onLogin}
        disabled={loading || googleLoading}
      >
        {loading ? (
          <ActivityIndicator color={theme.onPrimary} />
        ) : (
          <ThemedText style={[styles.primaryBtnText, { color: theme.onPrimary }]}>
            Login
          </ThemedText>
        )}
      </Pressable>

      <View style={styles.dividerWrap}>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <ThemedText style={{ color: theme.secondaryText }}>or</ThemedText>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
      </View>

      <Pressable
        style={[
          styles.googleBtn,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
        onPress={onGoogleLogin}
        disabled={loading || googleLoading}
      >
        {googleLoading ? (
          <ActivityIndicator color={theme.text} />
        ) : (
          <ThemedText style={[styles.googleBtnText, { color: theme.text }]}>
            Continue with Google
          </ThemedText>
        )}
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.linkBtn}>
        <ThemedText type="link">Back</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center", gap: 12 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  primaryBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryBtnText: { fontWeight: "600" },
  dividerWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 4,
  },
  divider: { flex: 1, height: 1 },
  googleBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  googleBtnText: { fontWeight: "600" },
  linkBtn: { marginTop: 8, alignItems: "center" },
});
