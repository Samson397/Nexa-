/**
 * Capability permissions for the desktop companion.
 * File-system capabilities require both an explicit grant AND an
 * approved path root. Clipboard/screenshot capabilities are separate.
 */

export type Capability =
  | "listDir"
  | "readFile"
  | "writeFile"
  | "deleteFile"
  | "createFile"
  | "openPath"
  | "getClipboard"
  | "setClipboard"
  | "takeScreenshot"
  | "watchDownloads";

const FS_CAPABILITIES: Capability[] = [
  "listDir",
  "readFile",
  "writeFile",
  "deleteFile",
  "createFile",
  "openPath",
];

export type PermissionStore = {
  getGranted(): Capability[];
  setGranted(caps: Capability[]): void;
};

export function requirePermission(
  store: PermissionStore,
  capability: Capability,
): void {
  const granted = store.getGranted();
  if (!granted.includes(capability)) {
    throw new Error(
      `Permission denied: "${capability}" has not been granted by the user`,
    );
  }
}

export function grantPermissions(
  store: PermissionStore,
  caps: Capability[],
): Capability[] {
  const current = new Set(store.getGranted());
  for (const c of caps) current.add(c);
  const next = [...current];
  store.setGranted(next);
  return next;
}

export function revokePermissions(
  store: PermissionStore,
  caps: Capability[],
): Capability[] {
  const revoke = new Set(caps);
  const next = store.getGranted().filter((c) => !revoke.has(c));
  store.setGranted(next);
  return next;
}

export function isFsCapability(capability: Capability): boolean {
  return FS_CAPABILITIES.includes(capability);
}

export const ALL_CAPABILITIES: Capability[] = [
  ...FS_CAPABILITIES,
  "getClipboard",
  "setClipboard",
  "takeScreenshot",
  "watchDownloads",
];
