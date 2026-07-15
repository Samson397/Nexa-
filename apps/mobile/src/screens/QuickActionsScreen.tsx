import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { requestPermission } from "../permissions";

type Props = NativeStackScreenProps<RootStackParamList, "QuickActions">;

const ACTIONS = [
  {
    id: "camera" as const,
    title: "Capture for knowledge",
    description: "Requests camera only when you tap.",
  },
  {
    id: "microphone" as const,
    title: "Voice note",
    description: "Requests microphone only when you tap.",
  },
  {
    id: "calendar" as const,
    title: "Schedule with NEXA",
    description: "Requests calendar access only when you tap.",
  },
  {
    id: "notifications" as const,
    title: "Enable alerts",
    description: "Requests notifications only when you tap.",
  },
];

export function QuickActionsScreen(_props: Props) {
  async function run(id: (typeof ACTIONS)[number]["id"], title: string) {
    const status = await requestPermission(id);
    Alert.alert(title, `Permission status: ${status}`);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headline}>Do one thing</Text>
      <Text style={styles.sub}>
        Permissions are requested only for the action you choose.
      </Text>
      {ACTIONS.map((action) => (
        <Pressable
          key={action.id}
          style={styles.row}
          onPress={() => void run(action.id, action.title)}
        >
          <Text style={styles.title}>{action.title}</Text>
          <Text style={styles.desc}>{action.description}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  headline: {
    fontSize: 22,
    fontWeight: "600",
    color: "#E8EEF8",
  },
  sub: {
    fontSize: 14,
    color: "#9AA8C0",
    marginBottom: 8,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1A2436",
  },
  title: {
    color: "#E8EEF8",
    fontSize: 16,
    fontWeight: "600",
  },
  desc: {
    color: "#6B7A94",
    fontSize: 13,
    marginTop: 4,
  },
});
