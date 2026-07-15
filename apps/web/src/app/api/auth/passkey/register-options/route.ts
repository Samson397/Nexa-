import { cookies } from "next/headers";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import {
  handleRouteError,
  jsonOk,
  newId,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import {
  getWebAuthnConfig,
  listPasskeysForUser,
  storeChallenge,
  WEBAUTHN_CHALLENGE_COOKIE,
} from "@/lib/webauthn";

export const runtime = "nodejs";

/**
 * POST /api/auth/passkey/register-options
 * Generate WebAuthn registration options; store challenge in demo-store + cookie.
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "passkey-register-options",
      limit: 20,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const { rpID, rpName } = getWebAuthnConfig();
    const existing = listPasskeysForUser(auth.user.id);

    const userID = new TextEncoder().encode(auth.user.id.slice(0, 64));

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: auth.user.email ?? auth.user.id,
      userID,
      userDisplayName: auth.user.email ?? "NEXA User",
      attestationType: "none",
      excludeCredentials: existing.map((p) => ({
        id: p.credentialId,
        transports: p.transports as
          | ("usb" | "ble" | "nfc" | "internal" | "hybrid")[]
          | undefined,
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform",
      },
    });

    storeChallenge({
      challenge: options.challenge,
      userId: auth.user.id,
      type: "registration",
    });

    const cookieStore = await cookies();
    cookieStore.set(WEBAUTHN_CHALLENGE_COOKIE, options.challenge, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 300,
    });

    return jsonOk({
      ok: true,
      options,
      requestId: newId(),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
