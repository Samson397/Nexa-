import { useCallback, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import {
  getAllPermissionStatuses,
  requestPermission,
  type MobilePermission,
  type PermissionStatus,
} from "../permissions";
import { getApiBaseUrl } from "../api";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

const LABELS: Record<MobilePermission, string> = {
  camera: "Camera",
  microphone: "Microphone",
  calendar: "Calendar",
  contacts: "Contacts",
  notifications: "Notifications",
};

export function SettingsScreen(_props: Props) {
  const [statuses, setStatuses] = useState<
    Record<MobilePermission, PermissionStatus> | null
  >(null);

  const refresh = useCallback(() => {
    void getAllPermissionStatuses().then(setStatuses);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  async function ask(permission: MobilePermission) {
    await requestPermission(permission);
    refresh();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headline}>Permissions</Text>
      <Text style={styles.sub}>
        Status only — NEXA never requests access until you allow it here or via
        a quick action.
      </Text>
      <Text style={styles.meta}>API base: {getApiBaseUrl()}</Text>

      {statuses &&
        (Object.keys(LABELS) as MobilePermission[]).map((key) => (
          <View key={key} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.title}>{LABELS[key]}</Text>
              <Text style={styles.status}>{statuses[key]}</Text>
            </View>
            <Pressable style={styles.btn} onPress={() => void ask(key)}>
              <Text style={styles.btnText}>Request</Text>
            </Pressable>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 10,
  },
  headline: {
    fontSize: 22,
    fontWeight: "600",
    color: "#E8EEF8",
  },
  sub: {
    fontSize: 14,
    color: "#9AA8C0",
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: "#6B7A94",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1A2436",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: "#E8EEF8",
    fontSize: 16,
  },
  status: {
    color: "#6B7A94",
    fontSize: 13,
  },
  btn: {
    backgroundColor: "#1A2436",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  btnText: {
    color: "#5B8CFF",
    fontWeight: "600",
    fontSize: 13,
  },
});
