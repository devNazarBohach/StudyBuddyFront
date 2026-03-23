import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getToken, saveToken } from "@/constants/tokens";
import { authApi } from "@/services";
import { useAppState } from "@/state/AppState";

type LoginPayload = {
  username: string;
  password: string;
};


export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { setMyUsername, setAdminMode } = useAppState();

  function validate(p: LoginPayload) {
    if (!p.username.trim() || !p.password.trim()) return "Username and password are required";
    if (p.password.length < 8) return "Password must be at least 8 characters";
    return null;
  }

  async function onLogin() {
  const payload: LoginPayload = { username: username.trim(), password };

  if (!payload.username || !payload.password) {
    Alert.alert("Validation error", "Username and password are required");
    return;
  }

  try {
    setLoading(true);

    const res = await authApi.login(payload);

const token = res.data?.token;
if (!token) {
  Alert.alert("Login failed", res.data?.message ?? "Invalid credentials");
  return;
}

await saveToken(token);
console.log("SAVED TOKEN?", await getToken()); 
setMyUsername(username.trim());
setAdminMode(false);      

router.replace("/tabs/friends");

Alert.alert("Success", "Logged in");
router.replace("/tabs/friends");
  } catch (e: any) {
    Alert.alert("Network error", e?.message ?? "Unknown error");
  } finally {
    setLoading(false);
  }
}

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Login</ThemedText>

      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="Username"
        autoCapitalize="none"
        keyboardType="default"
        style={styles.input}
        placeholderTextColor="#888"
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        placeholderTextColor="#888"
      />

      <Pressable style={styles.primaryBtn} onPress={onLogin} disabled={loading}>
        {loading ? <ActivityIndicator /> : <ThemedText style={styles.primaryBtnText}>Login</ThemedText>}
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
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "white",
    color: "black",
  },
  primaryBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    marginTop: 8,
  },
  primaryBtnText: { color: "white", fontWeight: "600" },
  linkBtn: { marginTop: 8, alignItems: "center" },
});