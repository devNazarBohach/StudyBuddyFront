// import { router } from "expo-router";
// import { useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   Pressable,
//   StyleSheet,
//   TextInput,
// } from "react-native";

// import { ThemedText } from "@/components/themed-text";
// import { ThemedView } from "@/components/themed-view";
// import { getToken, saveToken } from "@/constants/tokens";
// import { authApi } from "@/services";
// import { useAppState } from "@/state/AppState";

// type LoginPayload = {
//   username: string;
//   password: string;
// };


// export default function LoginScreen() {
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);
//   const { setMyUsername, setAdminMode } = useAppState();

//   function validate(p: LoginPayload) {
//     if (!p.username.trim() || !p.password.trim()) return "Username and password are required";
//     if (p.password.length < 8) return "Password must be at least 8 characters";
//     return null;
//   }

//   async function onLogin() {
//   const payload: LoginPayload = { username: username.trim(), password };

//   if (!payload.username || !payload.password) {
//     Alert.alert("Validation error", "Username and password are required");
//     return;
//   }

//   try {
//     setLoading(true);

//     const res = await authApi.login(payload);

// const token = res.data?.token;
// if (!token) {
//   Alert.alert("Login failed", res.data?.message ?? "Invalid credentials");
//   return;
// }

// await saveToken(token);
// console.log("SAVED TOKEN?", await getToken()); 
// setMyUsername(username.trim());
// setAdminMode(false);      

// router.replace("/tabs/friends");

// Alert.alert("Success", "Logged in");
// router.replace("/tabs/friends");
//   } catch (e: any) {
//     Alert.alert("Network error", e?.message ?? "Unknown error");
//   } finally {
//     setLoading(false);
//   }
// }

//   return (
//     <ThemedView style={styles.container}>
//       <ThemedText type="title">Login</ThemedText>

//       <TextInput
//         value={username}
//         onChangeText={setUsername}
//         placeholder="Username"
//         autoCapitalize="none"
//         keyboardType="default"
//         style={styles.input}
//         placeholderTextColor="#888"
//       />

//       <TextInput
//         value={password}
//         onChangeText={setPassword}
//         placeholder="Password"
//         secureTextEntry
//         style={styles.input}
//         placeholderTextColor="#888"
//       />

//       <Pressable style={styles.primaryBtn} onPress={onLogin} disabled={loading}>
//         {loading ? <ActivityIndicator /> : <ThemedText style={styles.primaryBtnText}>Login</ThemedText>}
//       </Pressable>

//       <Pressable onPress={() => router.back()} style={styles.linkBtn}>
//         <ThemedText type="link">Back</ThemedText>
//       </Pressable>
//     </ThemedView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: 20, justifyContent: "center", gap: 12 },
//   input: {
//     height: 48,
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 10,
//     paddingHorizontal: 12,
//     backgroundColor: "white",
//     color: "black",
//   },
//   primaryBtn: {
//     height: 48,
//     borderRadius: 10,
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: "#111",
//     marginTop: 8,
//   },
//   primaryBtnText: { color: "white", fontWeight: "600" },
//   linkBtn: { marginTop: 8, alignItems: "center" },
// });


import { statusCodes } from "@react-native-google-signin/google-signin";
import { router } from "expo-router";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  async function onLogin() {
    const payload: LoginPayload = { username: username.trim(), password };

    if (!payload.username || !payload.password) {
      Alert.alert("Validation error", "Username and password are required");
      return;
    }

    try {
      setLoading(true);

      const res = await authApi.login(payload);

      if (!res.token) {
        Alert.alert("Login failed", res.message ?? "Invalid credentials");
        return;
      }

      await saveToken(res.token);
      console.log("SAVED TOKEN?", await getToken());

      setMyUsername(username.trim());
      setAdminMode(false);

      Alert.alert("Success", "Logged in");
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

      await signOutFromGoogleSilently();
      const idToken = await signInWithGoogleAndGetIdToken();

      const res = await authApi.googleLogin({ idToken });

      if (!res.token || !res.user) {
        Alert.alert("Google login failed", res.message ?? "No token returned");
        return;
      }

      await saveToken(res.token);
      console.log("SAVED GOOGLE JWT?", await getToken());

      setMyUsername(res.user.username);
      setAdminMode(false);

      Alert.alert("Success", "Logged in with Google");
      router.replace("/tabs/friends");
    } catch (e: any) {
      if (e?.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }

      if (e?.code === statusCodes.IN_PROGRESS) {
        Alert.alert("Please wait", "Google sign-in is already in progress");
        return;
      }

      if (e?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(
          "Google Play Services",
          "Google Play Services are missing or need update"
        );
        return;
      }

      Alert.alert("Google sign-in failed", e?.message ?? "Unknown error");
    } finally {
      setGoogleLoading(false);
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

      <Pressable
        style={styles.primaryBtn}
        onPress={onLogin}
        disabled={loading || googleLoading}
      >
        {loading ? (
          <ActivityIndicator />
        ) : (
          <ThemedText style={styles.primaryBtnText}>Login</ThemedText>
        )}
      </Pressable>

      <View style={styles.dividerWrap}>
        <View style={styles.divider} />
        <ThemedText style={styles.dividerText}>or</ThemedText>
        <View style={styles.divider} />
      </View>

      <Pressable
        style={styles.googleBtn}
        onPress={onGoogleLogin}
        disabled={loading || googleLoading}
      >
        {googleLoading ? (
          <ActivityIndicator />
        ) : (
          <ThemedText style={styles.googleBtnText}>Continue with Google</ThemedText>
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
  dividerWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 4,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    opacity: 0.7,
  },
  googleBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  googleBtnText: {
    color: "#111",
    fontWeight: "600",
  },
  linkBtn: { marginTop: 8, alignItems: "center" },
});