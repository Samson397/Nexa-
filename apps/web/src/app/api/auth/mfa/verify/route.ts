import {
  handleRouteError,
  hasSupabaseEnv,
  jsonError,
  jsonOk,
  parseBody,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import { mfaVerifySchema } from "@/lib/validators";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * POST /api/auth/mfa/verify — { factorId, code }
 * Supabase: challengeAndVerify (or verify). Demo: accept "000000".
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "mfa-verify",
      limit: 20,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const parsed = await parseBody(request, mfaVerifySchema);
    if (parsed.error) return parsed.error;

    const { factorId, code } = parsed.data;

    if (hasSupabaseEnv()) {
      const supabase = await createSupabaseServerClient();

      if (typeof supabase.auth.mfa.challengeAndVerify === "function") {
        const { data, error } = await supabase.auth.mfa.challengeAndVerify({
          factorId,
          code,
        });
        if (error) {
          return jsonError("MFA_VERIFY_FAILED", "Invalid MFA code", {
            status: 401,
            cause: error,
          });
        }
        await audit("auth.mfa", {
          actorId: auth.user.id,
          success: true,
          metadata: { factorId, mode: "challengeAndVerify" },
        });
        return jsonOk({
          ok: true,
          configured: true,
          verified: true,
          data,
        });
      }

      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error || !challenge.data?.id) {
        return jsonError("MFA_CHALLENGE_FAILED", "Unable to start MFA challenge", {
          status: 400,
          cause: challenge.error,
        });
      }
      const verified = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
      });
      if (verified.error) {
        return jsonError("MFA_VERIFY_FAILED", "Invalid MFA code", {
          status: 401,
          cause: verified.error,
        });
      }
      await audit("auth.mfa", {
        actorId: auth.user.id,
        success: true,
        metadata: { factorId, mode: "challenge+verify" },
      });
      return jsonOk({
        ok: true,
        configured: true,
        verified: true,
        data: verified.data,
      });
    }

    if (code !== "000000") {
      return jsonError(
        "MFA_VERIFY_FAILED",
        'Invalid demo MFA code. Use "000000".',
        { status: 401 },
      );
    }

    await audit("auth.mfa", {
      actorId: auth.user.id,
      success: true,
      metadata: { factorId, demo: true },
    });

    return jsonOk({
      ok: true,
      configured: false,
      demo: true,
      verified: true,
      factorId,
      message: "Demo MFA verified.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
