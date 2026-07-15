import { cookies } from "next/headers";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { z } from "zod";
import {
  handleRouteError,
  jsonError,
  jsonOk,
  rateLimitByIp,
} from "@/lib/api";
import {
  getWebAuthnConfig,
  listPasskeysForUser,
  storeChallenge,
  WEBAUTHN_CHALLENGE_COOKIE,
} from "@/lib/webauthn";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email().optional(),
  userId: z.string().min(1).max(128).optional(),
});

/**
 * POST /api/auth/passkey/login-options
 * Generate WebAuthn authentication options.
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "passkey-login-options",
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) return limited;

    let userId: string | undefined;
    try {
      const raw: unknown = await request.json();
      const result = bodySchema.safeParse(raw ?? {});
      if (!result.success) {
        return jsonError("VALIDATION_ERROR", "Invalid request body", {
          status: 400,
          details: result.error.issues,
        });
      }
      userId = result.data.userId;
    } catch {
      // Empty body → discoverable credentials
    }

    const { rpID } = getWebAuthnConfig();
    const allowCredentials = userId
      ? listPasskeysForUser(userId).map((p) => ({
          id: p.credentialId,
          transports: p.transports as
            | ("usb" | "ble" | "nfc" | "internal" | "hybrid")[]
            | undefined,
        }))
      : undefined;

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
      allowCredentials:
        allowCredentials && allowCredentials.length > 0
          ? allowCredentials
          : undefined,
    });

    storeChallenge({
      challenge: options.challenge,
      userId,
      type: "authentication",
    });

    const cookieStore = await cookies();
    cookieStore.set(WEBAUTHN_CHALLENGE_COOKIE, options.challenge, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 300,
    });

    return jsonOk({ ok: true, options });
  } catch (error) {
    return handleRouteError(error);
  }
}
