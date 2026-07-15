/**
 * NEXA Desktop — Electron main process.
 *
 * Security model:
 * - File I/O is sandboxed to `approvedPaths` only (path-guard).
 * - Each capability requires an explicit user grant (permissions).
 * - Renderer talks only through contextBridge (`window.nexaDesktop`).
 */

import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  shell,
} from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { assertApprovedPath } from "./path-guard";
import {
  ALL_CAPABILITIES,
  type Capability,
  grantPermissions,
  requirePermission,
  revokePermissions,
} from "./permissions";
import { DesktopStore } from "./store";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

let mainWindow: BrowserWindow | null = null;
let store: DesktopStore;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: "NEXA",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  void mainWindow.loadURL(APP_URL);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function registerIpc(): void {
  const permStore = {
    getGranted: () => store.getGranted(),
    setGranted: (caps: Capability[]) => store.setGranted(caps),
  };

  ipcMain.handle("nexa:get-status", () => ({
    approvedPaths: store.getApprovedPaths(),
    grantedCapabilities: store.getGranted(),
    appUrl: APP_URL,
  }));

  ipcMain.handle("nexa:list-capabilities", () => ALL_CAPABILITIES);

  ipcMain.handle(
    "nexa:grant-permissions",
    (_e, caps: Capability[]) => grantPermissions(permStore, caps ?? []),
  );

  ipcMain.handle(
    "nexa:revoke-permissions",
    (_e, caps: Capability[]) => revokePermissions(permStore, caps ?? []),
  );

  ipcMain.handle("nexa:get-approved-paths", () => store.getApprovedPaths());

  ipcMain.handle("nexa:add-approved-path", async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ["openDirectory", "createDirectory"],
      title: "Approve folder for NEXA",
    });
    if (result.canceled || !result.filePaths[0]) {
      return store.getApprovedPaths();
    }
    return store.addApprovedPath(result.filePaths[0]);
  });

  ipcMain.handle(
    "nexa:remove-approved-path",
    (_e, p: string) => store.removeApprovedPath(p),
  );

  // ——— Capabilited FS ops (strict path sandbox) ———

  ipcMain.handle("nexa:list-dir", async (_e, dirPath: string) => {
    requirePermission(permStore, "listDir");
    const safe = assertApprovedPath(dirPath, store.getApprovedPaths());
    const entries = await fs.readdir(safe, { withFileTypes: true });
    return entries.map((d) => ({
      name: d.name,
      path: path.join(safe, d.name),
      isDirectory: d.isDirectory(),
      isFile: d.isFile(),
    }));
  });

  ipcMain.handle(
    "nexa:read-file",
    async (_e, filePath: string, encoding: BufferEncoding = "utf8") => {
      requirePermission(permStore, "readFile");
      const safe = assertApprovedPath(filePath, store.getApprovedPaths());
      return fs.readFile(safe, encoding);
    },
  );

  ipcMain.handle(
    "nexa:write-file",
    async (_e, filePath: string, content: string) => {
      requirePermission(permStore, "writeFile");
      const safe = assertApprovedPath(filePath, store.getApprovedPaths());
      await fs.writeFile(safe, content, "utf8");
      return { ok: true };
    },
  );

  ipcMain.handle("nexa:delete-file", async (_e, filePath: string) => {
    requirePermission(permStore, "deleteFile");
    const safe = assertApprovedPath(filePath, store.getApprovedPaths());
    await fs.unlink(safe);
    return { ok: true };
  });

  ipcMain.handle(
    "nexa:create-file",
    async (_e, filePath: string, content = "") => {
      requirePermission(permStore, "createFile");
      const safe = assertApprovedPath(filePath, store.getApprovedPaths());
      await fs.writeFile(safe, content, { encoding: "utf8", flag: "wx" });
      return { ok: true };
    },
  );

  ipcMain.handle("nexa:open-path", async (_e, targetPath: string) => {
    requirePermission(permStore, "openPath");
    const safe = assertApprovedPath(targetPath, store.getApprovedPaths());
    const err = await shell.openPath(safe);
    if (err) throw new Error(err);
    return { ok: true };
  });

  ipcMain.handle("nexa:get-clipboard", () => {
    requirePermission(permStore, "getClipboard");
    return clipboard.readText();
  });

  ipcMain.handle("nexa:set-clipboard", (_e, text: string) => {
    requirePermission(permStore, "setClipboard");
    clipboard.writeText(String(text ?? ""));
    return { ok: true };
  });

  /** Stub — screenshot capture not wired yet. */
  ipcMain.handle("nexa:take-screenshot", () => {
    requirePermission(permStore, "takeScreenshot");
    // TODO: capture focused display / window via desktopCapturer
    return {
      ok: false,
      stub: true,
      message: "takeScreenshot is not implemented yet",
    };
  });

  /** Stub — downloads folder watcher not wired yet. */
  ipcMain.handle("nexa:watch-downloads", () => {
    requirePermission(permStore, "watchDownloads");
    // TODO: fs.watch Downloads dir (must be in approvedPaths)
    return {
      ok: false,
      stub: true,
      message: "watchDownloads is not implemented yet",
    };
  });
}

app.whenReady().then(() => {
  store = new DesktopStore(app.getPath("userData"));
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
