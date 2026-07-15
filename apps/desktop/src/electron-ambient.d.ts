/**
 * Minimal Electron typings so `tsc --noEmit` works even when the electron
 * package binary is not installed yet. Prefer the real `electron` types when
 * the dependency is present (`skipLibCheck` + package types take precedence).
 */

declare module "electron" {
  export type BufferEncoding = string;

  export class BrowserWindow {
    constructor(options?: Record<string, unknown>);
    loadURL(url: string): Promise<void>;
    on(event: string, listener: () => void): void;
    static getAllWindows(): BrowserWindow[];
  }

  export const app: {
    whenReady(): Promise<void>;
    on(event: string, listener: () => void): void;
    quit(): void;
    getPath(name: string): string;
  };

  export const ipcMain: {
    handle(
      channel: string,
      listener: (event: unknown, ...args: never[]) => unknown,
    ): void;
  };

  export const ipcRenderer: {
    invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  };

  export const contextBridge: {
    exposeInMainWorld(apiKey: string, api: unknown): void;
  };

  export const clipboard: {
    readText(): string;
    writeText(text: string): void;
  };

  export const shell: {
    openPath(path: string): Promise<string>;
  };

  export const dialog: {
    showOpenDialog(
      window: BrowserWindow,
      options: Record<string, unknown>,
    ): Promise<{ canceled: boolean; filePaths: string[] }>;
  };
}
