import {
  handleRouteError,
  jsonOk,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import {
  decryptTokens,
  getConnectedIntegration,
} from "@/lib/integrations/oauth";

export const runtime = "nodejs";

const MOCK_FILES = [
  {
    id: "file-1",
    name: "Q3 Strategy.pdf",
    mimeType: "application/pdf",
    size: 241_000,
    modifiedAt: new Date(Date.now() - 86_400_000).toISOString(),
    provider: "mock",
  },
  {
    id: "file-2",
    name: "Brand guidelines.fig",
    mimeType: "application/octet-stream",
    size: 1_200_000,
    modifiedAt: new Date(Date.now() - 172_800_000).toISOString(),
    provider: "mock",
  },
  {
    id: "file-3",
    name: "Customer interviews.md",
    mimeType: "text/markdown",
    size: 18_400,
    modifiedAt: new Date(Date.now() - 3600_000).toISOString(),
    provider: "mock",
  },
];

/**
 * GET /api/files — list from connected storage (Drive/Dropbox/OneDrive) or mock.
 */
export async function GET(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "files-list",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const drive = getConnectedIntegration(auth.user.id, "google_drive");
    if (drive?.encryptedCredentials && !drive.metadata?.demo) {
      try {
        const tokens = decryptTokens(drive.encryptedCredentials);
        const res = await fetch(
          "https://www.googleapis.com/drive/v3/files?pageSize=25&fields=files(id,name,mimeType,size,modifiedTime)",
          { headers: { Authorization: `Bearer ${tokens.access_token}` } },
        );
        if (res.ok) {
          const data = (await res.json()) as {
            files?: Array<{
              id: string;
              name: string;
              mimeType?: string;
              size?: string;
              modifiedTime?: string;
            }>;
          };
          const items = (data.files ?? []).map((f) => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType ?? "application/octet-stream",
            size: Number(f.size ?? 0),
            modifiedAt: f.modifiedTime ?? new Date().toISOString(),
            provider: "google_drive",
          }));
          return jsonOk({
            ok: true,
            items,
            total: items.length,
            source: "google_drive",
            mock: false,
          });
        }
      } catch {
        // fall through
      }
    }

    const dropbox = getConnectedIntegration(auth.user.id, "dropbox");
    if (dropbox?.encryptedCredentials && !dropbox.metadata?.demo) {
      try {
        const tokens = decryptTokens(dropbox.encryptedCredentials);
        const res = await fetch(
          "https://api.dropboxapi.com/2/files/list_folder",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ path: "" }),
          },
        );
        if (res.ok) {
          const data = (await res.json()) as {
            entries?: Array<{
              id?: string;
              name: string;
              ".tag"?: string;
              size?: number;
              server_modified?: string;
            }>;
          };
          const items = (data.entries ?? [])
            .filter((e) => e[".tag"] === "file")
            .map((e) => ({
              id: e.id ?? e.name,
              name: e.name,
              mimeType: "application/octet-stream",
              size: e.size ?? 0,
              modifiedAt: e.server_modified ?? new Date().toISOString(),
              provider: "dropbox",
            }));
          return jsonOk({
            ok: true,
            items,
            total: items.length,
            source: "dropbox",
            mock: false,
          });
        }
      } catch {
        // fall through
      }
    }

    const onedrive = getConnectedIntegration(auth.user.id, "onedrive");
    if (onedrive?.encryptedCredentials && !onedrive.metadata?.demo) {
      try {
        const tokens = decryptTokens(onedrive.encryptedCredentials);
        const res = await fetch(
          "https://graph.microsoft.com/v1.0/me/drive/root/children?$top=25",
          { headers: { Authorization: `Bearer ${tokens.access_token}` } },
        );
        if (res.ok) {
          const data = (await res.json()) as {
            value?: Array<{
              id: string;
              name: string;
              file?: { mimeType?: string };
              size?: number;
              lastModifiedDateTime?: string;
            }>;
          };
          const items = (data.value ?? [])
            .filter((e) => e.file)
            .map((e) => ({
              id: e.id,
              name: e.name,
              mimeType: e.file?.mimeType ?? "application/octet-stream",
              size: e.size ?? 0,
              modifiedAt: e.lastModifiedDateTime ?? new Date().toISOString(),
              provider: "onedrive",
            }));
          return jsonOk({
            ok: true,
            items,
            total: items.length,
            source: "onedrive",
            mock: false,
          });
        }
      } catch {
        // fall through
      }
    }

    return jsonOk({
      ok: true,
      items: MOCK_FILES,
      total: MOCK_FILES.length,
      source: "mock",
      mock: true,
      connected: Boolean(drive || dropbox || onedrive),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
