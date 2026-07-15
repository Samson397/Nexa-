import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { api, getApiBaseUrl } from "../api";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const base = getApiBaseUrl();

  async function ping() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await api.health();
      setStatus(res.ok ? "Connected to NEXA" : "Unexpected response");
    } catch (e) {
      const msg =
        typeof e === "object" && e && "error" in e
          ? String((e as { error: string }).error)
          : "Unable to reach NEXA";
      setStatus(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>NEXA</Text>
      <Text style={styles.sub}>
        Mobile companion for your AI operating system.
      </Text>
      <Text style={styles.meta}>API: {base}</Text>

      <Pressable style={styles.primary} onPress={ping} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#0B1220" />
        ) : (
          <Text style={styles.primaryText}>Connect to NEXA web</Text>
        )}
      </Pressable>

      {status ? <Text style={styles.status}>{status}</Text> : null}

      <Pressable
        style={styles.link}
        onPress={() => void Linking.openURL(base)}
      >
        <Text style={styles.linkText}>Open in browser</Text>
      </Pressable>

      <View style={styles.nav}>
        <Pressable
          style={styles.secondary}
          onPress={() => navigation.navigate("QuickActions")}
        >
          <Text style={styles.secondaryText}>Quick actions</Text>
        </Pressable>
        <Pressable
          style={styles.secondary}
          onPress={() => navigation.navigate("Settings")}
        >
          <Text style={styles.secondaryText}>Settings</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
    justifyContent: "center",
  },
  brand: {
    fontSize: 40,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#E8EEF8",
  },
  sub: {
    fontSize: 16,
    color: "#9AA8C0",
    marginBottom: 8,
  },
  meta: {
    fontSize: 12,
    color: "#6B7A94",
    marginBottom: 8,
  },
  primary: {
    backgroundColor: "#5B8CFF",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryText: {
    color: "#0B1220",
    fontWeight: "700",
    fontSize: 16,
  },
  status: {
    color: "#C5D4EF",
    fontSize: 14,
  },
  link: {
    paddingVertical: 8,
  },
  linkText: {
    color: "#5B8CFF",
    fontSize: 14,
  },
  nav: {
    marginTop: 24,
    gap: 10,
  },
  secondary: {
    borderWidth: 1,
    borderColor: "#243147",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  secondaryText: {
    color: "#E8EEF8",
    fontSize: 15,
  },
});
