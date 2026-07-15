import fs from "node:fs";
import path from "node:path";
import type { Capability } from "./permissions";
import { normalizeApprovedPaths } from "./path-guard";

export type DesktopStoreData = {
  approvedPaths: string[];
  grantedCapabilities: Capability[];
};

const DEFAULT_DATA: DesktopStoreData = {
  approvedPaths: [],
  grantedCapabilities: [],
};

/**
 * Simple JSON persistence in Electron userData.
 * Falls back to a local `.nexa-desktop-store.json` when app is unavailable
 * (e.g. during typecheck/tests without Electron runtime).
 */
export class DesktopStore {
  private filePath: string;
  private data: DesktopStoreData;

  constructor(userDataPath?: string) {
    const dir =
      userDataPath ??
      path.join(process.cwd(), ".nexa-desktop-data");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.filePath = path.join(dir, "store.json");
    this.data = this.load();
  }

  private load(): DesktopStoreData {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = JSON.parse(
          fs.readFileSync(this.filePath, "utf8"),
        ) as Partial<DesktopStoreData>;
        return {
          approvedPaths: normalizeApprovedPaths(raw.approvedPaths ?? []),
          grantedCapabilities: raw.grantedCapabilities ?? [],
        };
      }
    } catch {
      // Corrupt store — reset
    }
    return { ...DEFAULT_DATA, approvedPaths: [], grantedCapabilities: [] };
  }

  private save(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf8");
  }

  getApprovedPaths(): string[] {
    return [...this.data.approvedPaths];
  }

  setApprovedPaths(paths: string[]): string[] {
    this.data.approvedPaths = normalizeApprovedPaths(paths);
    this.save();
    return this.getApprovedPaths();
  }

  addApprovedPath(p: string): string[] {
    return this.setApprovedPaths([...this.data.approvedPaths, p]);
  }

  removeApprovedPath(p: string): string[] {
    const resolved = path.resolve(p);
    return this.setApprovedPaths(
      this.data.approvedPaths.filter((x) => path.resolve(x) !== resolved),
    );
  }

  getGranted(): Capability[] {
    return [...this.data.grantedCapabilities];
  }

  setGranted(caps: Capability[]): void {
    this.data.grantedCapabilities = [...new Set(caps)];
    this.save();
  }
}
