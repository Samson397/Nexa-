/**
 * Permission wrappers — request ONLY when the user taps an action.
 * Native modules are stubbed so install stays light; wire expo-* packages later.
 */

export type MobilePermission =
  | "camera"
  | "microphone"
  | "calendar"
  | "contacts"
  | "notifications";

export type PermissionStatus = "undetermined" | "granted" | "denied" | "stub";

const statusMap: Record<MobilePermission, PermissionStatus> = {
  camera: "undetermined",
  microphone: "undetermined",
  calendar: "undetermined",
  contacts: "undetermined",
  notifications: "undetermined",
};

/**
 * TODO: replace stubs with:
 * - expo-camera / expo-av for camera & microphone
 * - expo-calendar for calendar
 * - expo-contacts for contacts
 * - expo-notifications for push permissions
 */
export async function getPermissionStatus(
  permission: MobilePermission,
): Promise<PermissionStatus> {
  return statusMap[permission] ?? "undetermined";
}

export async function requestPermission(
  permission: MobilePermission,
): Promise<PermissionStatus> {
  // Stub: simulate a user grant for UI flow without native binaries.
  // When wiring real modules, call the corresponding request*Async here
  // and ONLY from a user gesture (button press).
  statusMap[permission] = "granted";
  return "granted";
}

export async function getAllPermissionStatuses(): Promise<
  Record<MobilePermission, PermissionStatus>
> {
  const keys: MobilePermission[] = [
    "camera",
    "microphone",
    "calendar",
    "contacts",
    "notifications",
  ];
  const out = {} as Record<MobilePermission, PermissionStatus>;
  for (const k of keys) {
    out[k] = await getPermissionStatus(k);
  }
  return out;
}
