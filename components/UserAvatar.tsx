import { API_BASE_URL } from "@/constants/api";
import { getToken } from "@/constants/tokens";
import { useTheme } from "@/context/ThemeContext";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { ThemedText } from "./themed-text";

// Consistent color per username (cycles through palette)
const AVATAR_COLORS = [
  "#4F8EF7", "#7C3AED", "#059669", "#DC2626",
  "#D97706", "#DB2777", "#0891B2", "#65A30D",
];

function colorForUsername(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

type Props = {
  username: string;
  size?: number;
  avatarUrl?: string | null; // pass if already known
  isCurrentUser?: boolean;   // if true, fetches from backend
};

// Module-level cache so we don't refetch on every render
const cache: Record<string, string | null> = {};

export function UserAvatar({ username, size = 44, avatarUrl, isCurrentUser }: Props) {
  const { theme } = useTheme();
  const [url, setUrl] = useState<string | null>(avatarUrl ?? cache[username] ?? null);

  useEffect(() => {
    if (url) return;
    if (!isCurrentUser) return; // only fetch for current user
    if (cache[username] !== undefined) {
      setUrl(cache[username]);
      return;
    }

    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/user/avatar`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success && json.data) {
          const resolved = json.data.startsWith("http")
            ? json.data
            : `${API_BASE_URL}${json.data}`;
          cache[username] = resolved;
          setUrl(resolved);
        } else {
          cache[username] = null;
        }
      } catch {
        cache[username] = null;
      }
    })();
  }, [username, isCurrentUser]);

  // Sync if avatarUrl prop changes (e.g. after upload in settings)
  useEffect(() => {
    if (avatarUrl !== undefined) {
      setUrl(avatarUrl);
      cache[username] = avatarUrl;
    }
  }, [avatarUrl, username]);

  const initials = (username?.[0] ?? "?").toUpperCase();
  const bgColor = colorForUsername(username);
  const radius = size / 2;

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[styles.img, { width: size, height: size, borderRadius: radius }]}
      />
    );
  }

  return (
    <View style={[
      styles.fallback,
      { width: size, height: size, borderRadius: radius, backgroundColor: bgColor },
    ]}>
      <ThemedText style={[styles.letter, { fontSize: size * 0.38, color: "#fff" }]}>
        {initials}
      </ThemedText>
    </View>
  );
}

// Clear cache for a user (call after avatar upload)
export function invalidateAvatarCache(username: string) {
  delete cache[username];
}

const styles = StyleSheet.create({
  img: { backgroundColor: "#ccc" },
  fallback: { alignItems: "center", justifyContent: "center" },
  letter: { fontWeight: "700" },
});