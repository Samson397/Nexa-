import {
  handleRouteError,
  hasSupabaseEnv,
  jsonError,
  jsonOk,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/auth/mfa/enroll — start TOTP enrollment.
 * Supabase: auth.mfa.enroll({ factorType: 'totp' }).
 * Demo: fake otpauth URI + secret.
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "mfa-enroll",
      limit: 10,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    if (hasSupabaseEnv()) {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "NEXA Authenticator",
      });

      if (error) {
        return jsonError("MFA_ENROLL_FAILED", "Unable to enroll MFA factor", {
          status: 400,
          cause: error,
        });
      }

      const totp = data.totp;
      return jsonOk({
        ok: true,
        configured: true,
        factorId: data.id,
        type: data.type,
        qrCode: totp?.qr_code ?? null,
        secret: totp?.secret ?? null,
        uri: totp?.uri ?? null,
      });
    }

    const secret = "NEXADEMO" + auth.user.id.replace(/[^A-Z0-9]/gi, "").slice(0, 16).toUpperCase().padEnd(16, "0").slice(0, 16);
    const email = encodeURIComponent(auth.user.email ?? "demo@nexa.local");
    const uri = `otpauth://totp/NEXA:${email}?secret=${secret}&issuer=NEXA&algorithm=SHA1&digits=6&period=30`;

    return jsonOk({
      ok: true,
      configured: false,
      demo: true,
      factorId: `demo-factor-${auth.user.id}`,
      type: "totp",
      qrCode: null,
      secret,
      uri,
      message: 'Demo MFA enroll. Use verify code "000000" to complete.',
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
