# NEXA Desktop Companion

Electron companion for [NEXA AI OS](../../). Loads the web app and exposes
opt-in local capabilities to the renderer via a secure preload bridge.

## Quick start

```bash
# from monorepo root
pnpm install
pnpm --filter @nexa/web dev          # terminal 1 — web at :3000
pnpm --filter @nexa/desktop build    # compile main + preload
pnpm --filter @nexa/desktop start    # terminal 2 — Electron shell

# or run main via tsx (dev)
pnpm --filter @nexa/desktop dev
```

`NEXT_PUBLIC_APP_URL` (default `http://localhost:3000`) controls which URL the
BrowserWindow loads.

## Security model

1. **No Node in the renderer** — `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
2. **Single bridge** — only `window.nexaDesktop` is exposed from `preload.ts`.
3. **Explicit grants** — every capability (`listDir`, `readFile`, …) must be granted by the user before IPC handlers execute (`permissions.ts`).
4. **Path sandbox** — filesystem calls resolve with `path.resolve` and must stay under one of the user-approved roots (`path-guard.ts`). `..` escapes and paths outside `approvedPaths` are rejected.
5. **Persisted trust** — `approvedPaths` and granted capabilities live in a JSON file under Electron `userData` (`store.ts`). Never assumed system-wide.
6. **Stubs** — `takeScreenshot` and `watchDownloads` require permission but return stub responses until implemented.

**NEVER** access files outside `approvedPaths`. Adding a folder requires a native folder picker (`nexa:add-approved-path`).

## Scripts

| Script       | Description                          |
|--------------|--------------------------------------|
| `dev`        | Run main process with `tsx`          |
| `build`      | Compile TypeScript to `dist/`        |
| `start`      | Launch Electron against compiled app |
| `typecheck`  | `tsc --noEmit`                       |

## API surface (`window.nexaDesktop`)

Permissions & paths: `getStatus`, `grantPermissions`, `addApprovedPath`, …

Filesystem (sandboxed): `listDir`, `readFile`, `writeFile`, `deleteFile`, `createFile`, `openPath`

Other: `getClipboard`, `setClipboard`, `takeScreenshot` (stub), `watchDownloads` (stub)
