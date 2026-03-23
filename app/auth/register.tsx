import { saveToken } from "@/constants/tokens";
import { authApi } from "@/services";
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
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

    const token = res.data?.token;
    if (!token) {
      Alert.alert("Register failed", res.data?.message ?? "No token returned");
      return;
    }

    await saveToken(token);

    Alert.alert("Success", "Registered successfully");
    router.replace("/tabs/friends"); 
  } catch (e: any) {
    Alert.alert("Network error", e?.message ?? "Unknown error");
  } finally {
    setLoading(false);
  }
}

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="Username"
        autoCapitalize="none"
        style={styles.input}
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password (min 8)"
        secureTextEntry
        style={styles.input}
      />

      <Pressable style={styles.button} onPress={onRegister} disabled={loading}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.buttonText}>Create account</Text>
        )}
      </Pressable>

      <Pressable onPress={() => router.back()} style={styles.link}>
        <Text style={styles.linkText}>Back</Text>
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
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  button: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    marginTop: 8,
  },
  buttonText: { color: "white", fontWeight: "600" },
  link: { marginTop: 10, alignItems: "center" },
  linkText: { color: "#333" },
});