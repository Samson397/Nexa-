import {
  getClientIp,
  handleRouteError,
  jsonOk,
  parseBody,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import {
  ensureUserWorkspace,
  listDevices,
  registerDevice,
  writeAudit,
} from "@/lib/services";
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

    const { profileId } = await ensureUserWorkspace(
      auth.user.id,
      auth.user.email ?? `${auth.user.id}@nexa.local`,
    );

    const { items, demo } = await listDevices({ userId: profileId });

    return jsonOk({ items, total: items.length, demo });
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

    const { profileId, workspaceId } = await ensureUserWorkspace(
      auth.user.id,
      auth.user.email ?? `${auth.user.id}@nexa.local`,
    );

    const { device, demo } = await registerDevice({
      userId: profileId,
      name: parsed.data.name,
      type: parsed.data.type,
      platform: parsed.data.platform,
      approvedPaths: parsed.data.approvedPaths,
      permissions: parsed.data.permissions,
      pushToken: parsed.data.pushToken,
      metadata: parsed.data.metadata,
    });

    await writeAudit({
      workspaceId,
      userId: profileId,
      action: "desktop.action",
      resourceType: "device",
      resourceId: device.id,
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") ?? undefined,
      metadata: {
        type: device.type,
        approvedPaths: device.approvedPaths,
      },
    });

    return jsonOk(
      {
        ok: true,
        demo,
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
