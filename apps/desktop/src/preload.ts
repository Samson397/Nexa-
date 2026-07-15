/**
 * Preload — exposes a minimal, typed API to the renderer via contextBridge.
 * Never expose Node / Electron internals directly.
 */

import { contextBridge, ipcRenderer } from "electron";
import type { Capability, NexaDesktopApi } from "./renderer-types";

const api: NexaDesktopApi = {
  getStatus: () => ipcRenderer.invoke("nexa:get-status"),
  listCapabilities: () => ipcRenderer.invoke("nexa:list-capabilities"),
  grantPermissions: (caps: Capability[]) =>
    ipcRenderer.invoke("nexa:grant-permissions", caps),
  revokePermissions: (caps: Capability[]) =>
    ipcRenderer.invoke("nexa:revoke-permissions", caps),
  getApprovedPaths: () => ipcRenderer.invoke("nexa:get-approved-paths"),
  addApprovedPath: () => ipcRenderer.invoke("nexa:add-approved-path"),
  removeApprovedPath: (p: string) =>
    ipcRenderer.invoke("nexa:remove-approved-path", p),

  listDir: (dirPath: string) => ipcRenderer.invoke("nexa:list-dir", dirPath),
  readFile: (filePath: string, encoding?: BufferEncoding) =>
    ipcRenderer.invoke("nexa:read-file", filePath, encoding),
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke("nexa:write-file", filePath, content),
  deleteFile: (filePath: string) =>
    ipcRenderer.invoke("nexa:delete-file", filePath),
  createFile: (filePath: string, content?: string) =>
    ipcRenderer.invoke("nexa:create-file", filePath, content),
  openPath: (targetPath: string) =>
    ipcRenderer.invoke("nexa:open-path", targetPath),

  getClipboard: () => ipcRenderer.invoke("nexa:get-clipboard"),
  setClipboard: (text: string) =>
    ipcRenderer.invoke("nexa:set-clipboard", text),
  takeScreenshot: () => ipcRenderer.invoke("nexa:take-screenshot"),
  watchDownloads: () => ipcRenderer.invoke("nexa:watch-downloads"),
};

contextBridge.exposeInMainWorld("nexaDesktop", api);
