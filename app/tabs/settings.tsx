import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAppState } from "@/state/AppState";
import { StyleSheet, Switch, TextInput } from "react-native";

export default function SettingsScreen() {
  const { adminMode, setAdminMode, myUsername, setMyUsername } = useAppState();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Settings</ThemedText>

      <ThemedView style={styles.row}>
        <ThemedText>Admin mode (mock, no backend)</ThemedText>
        <Switch value={adminMode} onValueChange={setAdminMode} />
      </ThemedView>

      <ThemedText style={{ marginTop: 12 }}>My username</ThemedText>
      <TextInput
        value={myUsername}
        onChangeText={(t) => setMyUsername(t.trim().replace(/^@/, ""))}
        placeholder="@my_username"
        autoCapitalize="none"
        style={styles.input}
        placeholderTextColor="#888"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "white",
    color: "black",
  },
});