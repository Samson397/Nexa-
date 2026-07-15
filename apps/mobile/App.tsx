import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "./src/screens/HomeScreen";
import { QuickActionsScreen } from "./src/screens/QuickActionsScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";

export type RootStackParamList = {
  Home: undefined;
  QuickActions: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: "#0B1220" },
          headerTintColor: "#E8EEF8",
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: "#0B1220" },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "NEXA" }}
        />
        <Stack.Screen
          name="QuickActions"
          component={QuickActionsScreen}
          options={{ title: "Quick actions" }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: "Settings" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
