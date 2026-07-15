import { jsonOk } from "@/lib/api";

export const runtime = "nodejs";

/** GET /api/health — liveness check for load balancers and demos. */
export async function GET() {
  return jsonOk({
    ok: true,
    service: "nexa-web",
    timestamp: new Date().toISOString(),
  });
}
