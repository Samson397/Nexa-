/**
 * Shared types for the renderer `window.nexaDesktop` bridge.
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

export type DirEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
};

export type DesktopStatus = {
  approvedPaths: string[];
  grantedCapabilities: Capability[];
  appUrl: string;
};

export type StubResult = {
  ok: boolean;
  stub?: boolean;
  message?: string;
};

export type NexaDesktopApi = {
  getStatus: () => Promise<DesktopStatus>;
  listCapabilities: () => Promise<Capability[]>;
  grantPermissions: (caps: Capability[]) => Promise<Capability[]>;
  revokePermissions: (caps: Capability[]) => Promise<Capability[]>;
  getApprovedPaths: () => Promise<string[]>;
  addApprovedPath: () => Promise<string[]>;
  removeApprovedPath: (p: string) => Promise<string[]>;

  listDir: (dirPath: string) => Promise<DirEntry[]>;
  readFile: (filePath: string, encoding?: BufferEncoding) => Promise<string>;
  writeFile: (
    filePath: string,
    content: string,
  ) => Promise<{ ok: true }>;
  deleteFile: (filePath: string) => Promise<{ ok: true }>;
  createFile: (
    filePath: string,
    content?: string,
  ) => Promise<{ ok: true }>;
  openPath: (targetPath: string) => Promise<{ ok: true }>;

  getClipboard: () => Promise<string>;
  setClipboard: (text: string) => Promise<{ ok: true }>;
  takeScreenshot: () => Promise<StubResult>;
  watchDownloads: () => Promise<StubResult>;
};

declare global {
  interface Window {
    nexaDesktop: NexaDesktopApi;
  }
}

export {};
