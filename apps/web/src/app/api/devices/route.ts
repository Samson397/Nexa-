import {
  handleRouteError,
  jsonOk,
  newId,
  parseBody,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import { demoStore, type DemoDevice } from "@/lib/demo-store";
import { createDeviceSchema } from "@/lib/validators";

export const runtime = "nodejs";

/**
 * GET /api/devices — list registered devices for the current user.
 * POST /api/devices — register a device (desktop companions include approvedPaths).
 */
export async function GET(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "devices-get",
      limit: 120,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const items = [...demoStore.devices()];
    return jsonOk({ items, total: items.length, demo: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "devices-post",
      limit: 40,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const parsed = await parseBody(request, createDeviceSchema);
    if (parsed.error) return parsed.error;

    const now = new Date().toISOString();
    const device: DemoDevice = {
      id: newId(),
      name: parsed.data.name,
      type: parsed.data.type,
      platform: parsed.data.platform,
      approvedPaths: parsed.data.approvedPaths ?? [],
      permissions: parsed.data.permissions ?? [],
      pushToken: parsed.data.pushToken,
      metadata: parsed.data.metadata,
      isOnline: true,
      createdAt: now,
      updatedAt: now,
    };

    demoStore.devices().unshift(device);

    return jsonOk(
      {
        ok: true,
        demo: true,
        device,
        message:
          device.type === "desktop"
            ? "Desktop device registered. File access stays within approvedPaths only."
            : "Device registered.",
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
