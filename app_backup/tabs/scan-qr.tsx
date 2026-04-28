import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

export default function ScanQrScreen() {
  const { theme, fs } = useTheme();
  const styles = makeStyles(theme, fs);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [joining, setJoining] = useState(false);

  async function joinByToken(tokenValue: string) {
    try {
      setJoining(true);

      const authToken = await getToken();
      if (!authToken) {
        Alert.alert("Error", "You are not authorized");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/room/join-by-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          token: tokenValue,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        Alert.alert("Error", result?.message || "Failed to join room");
        setScanned(false);
        return;
      }

      Alert.alert("Success", "You joined the room");
      router.back();
    } catch (e) {
      console.log("JOIN BY TOKEN ERROR", e);
      Alert.alert("Error", "Failed to join room");
      setScanned(false);
    } finally {
      setJoining(false);
    }
  }

  function extractToken(raw: string) {
    if (!raw) return null;

    if (raw.startsWith("JOIN_ROOM:")) {
      return raw.replace("JOIN_ROOM:", "").trim();
    }

    if (raw.includes("token=")) {
      const match = raw.match(/[?&]token=([^&]+)/);
      if (match?.[1]) {
        return decodeURIComponent(match[1]);
      }
    }

    return raw.trim();
  }

  async function handleScan({ data }: { data: string }) {
    if (scanned || joining) return;

    setScanned(true);

    const token = extractToken(data);

    if (!token) {
      Alert.alert("Error", "Invalid QR code");
      setScanned(false);
      return;
    }

    await joinByToken(token);
  }

  if (!permission) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>Loading camera...</ThemedText>
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111" />
          </Pressable>

          <ThemedText style={styles.title}>Scan QR</ThemedText>

          <View style={{ width: 40 }} />
        </View>

        <View style={styles.permissionBox}>
          <Ionicons name="camera-outline" size={52} color="#444" />
          <ThemedText style={styles.permissionText}>
            App needs camera access to scan QR codes
          </ThemedText>

          <Pressable style={styles.allowBtn} onPress={requestPermission}>
            <ThemedText style={styles.allowBtnText}>Allow camera</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={handleScan}
      />

      <View style={styles.overlay}>
        <View style={styles.headerOverlay}>
          <Pressable onPress={() => router.back()} style={styles.backBtnDark}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>

          <ThemedText style={styles.overlayTitle}>Scan QR</ThemedText>

          <View style={{ width: 44 }} />
        </View>

        <View style={styles.middleArea}>
          <View style={styles.scanFrame} />
          <ThemedText style={styles.hintText}>
            Point the camera at the group QR code
          </ThemedText>
        </View>

        {scanned && (
          <Pressable style={styles.scanAgainBtn} onPress={() => setScanned(false)}>
            <ThemedText style={styles.scanAgainText}>
              Scan again
            </ThemedText>
          </Pressable>
        )}
      </View>
    </ThemedView>
  );
}

function makeStyles(theme: import('@/constants/theme').AppTheme, fs: (n: number) => number) { return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  camera: {
    flex: 1,
  },

  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: fs(20),
    fontWeight: "700",
    color: "#111",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ededed",
    alignItems: "center",
    justifyContent: "center",
  },

  permissionBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
    backgroundColor: "#f7f7f7",
  },
  permissionText: {
    fontSize: fs(18),
    textAlign: "center",
    color: "#222",
  },
  allowBtn: {
    marginTop: 10,
    minWidth: 180,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  allowBtnText: {
    color: "#fff",
    fontSize: fs(16),
    fontWeight: "700",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingTop: 56,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  headerOverlay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtnDark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayTitle: {
    fontSize: fs(20),
    fontWeight: "700",
    color: "#fff",
  },

  middleArea: {
    alignItems: "center",
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: "#fff",
    borderRadius: 24,
    backgroundColor: "transparent",
  },
  hintText: {
    marginTop: 18,
    color: "#fff",
    fontSize: fs(16),
    textAlign: "center",
  },

  scanAgainBtn: {
    alignSelf: "center",
    minWidth: 160,
    height: 50,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  scanAgainText: {
    color: "#fff",
    fontSize: fs(16),
    fontWeight: "700",
  },
}); }