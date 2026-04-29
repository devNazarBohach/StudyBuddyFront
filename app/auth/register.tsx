import { saveToken } from "@/constants/tokens";
import { useTheme } from "@/context/ThemeContext";
import { useScreenTracking } from "@/hooks/useScreenTracking";
import { authApi } from "@/services";
import { logRegister } from "@/services/firebase";
import { useAppState } from "@/state/AppState";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type RegisterPayload = {
  email: string;
  username: string;
  password: string;
};

export default function RegisterScreen() {
  useScreenTracking("RegisterScreen");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { setMyUsername, setAdminMode } = useAppState();
  const { theme } = useTheme();

  function validate(p: RegisterPayload) {
    if (!p.email.trim() || !p.username.trim() || !p.password.trim()) {
      return "Email, username, password are required";
    }
    if (!p.email.includes("@")) return "Email looks invalid";
    if (p.password.length < 8) return "Password must be at least 8 characters";
    if (p.username.length < 3) return "Username must be at least 3 characters";
    return null;
  }

  async function onRegister() {
    const payload: RegisterPayload = {
      email: email.trim(),
      username: username.trim(),
      password,
    };

    const err = validate(payload);
    if (err) {
      Alert.alert("Validation error", err);
      return;
    }

    try {
      setLoading(true);

      const res = await authApi.register(payload);

      if (!res.token) {
        Alert.alert("Register failed", res.message ?? "No token returned");
        return;
      }

      await saveToken(res.token);
      setMyUsername(payload.username);
      setAdminMode(false);
      await logRegister("manual");

      Alert.alert("Success", "Registered successfully");
      router.replace("/tabs/friends");
    } catch (e: any) {
      Alert.alert("Network error", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Register</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
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
        value={username}
        onChangeText={setUsername}
        placeholder="Username"
        autoCapitalize="none"
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
        placeholder="Password (min 8)"
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
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={onRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.onPrimary} />
        ) : (
          <Text style={[styles.buttonText, { color: theme.onPrimary }]}>
            Create account
          </Text>
        )}
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.link}>
        <Text style={[styles.linkText, { color: theme.primary }]}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center", gap: 12 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 12 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  button: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonText: { fontWeight: "600" },
  link: { marginTop: 10, alignItems: "center" },
  linkText: {},
});
