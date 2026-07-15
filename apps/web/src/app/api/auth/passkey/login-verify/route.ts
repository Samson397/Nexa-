import { cookies } from "next/headers";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { z } from "zod";
import {
  handleRouteError,
  hasSupabaseEnv,
  jsonError,
  jsonOk,
  parseBody,
  rateLimitByIp,
} from "@/lib/api";
import {
  base64UrlToBytes,
  consumeChallenge,
  findPasskeyByCredentialId,
  getWebAuthnConfig,
  updatePasskeyCounter,
  WEBAUTHN_CHALLENGE_COOKIE,
} from "@/lib/webauthn";
import { audit } from "@/lib/audit";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  response: z.record(z.unknown()),
});

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

/**
 * POST /api/auth/passkey/login-verify
 * Verify authentication; set session (demo token or supabase when available).
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "passkey-login-verify",
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const parsed = await parseBody(request, bodySchema);
    if (parsed.error) return parsed.error;

    const response = parsed.data
      .response as unknown as AuthenticationResponseJSON;
    const cookieStore = await cookies();
    const cookieChallenge = cookieStore.get(WEBAUTHN_CHALLENGE_COOKIE)?.value;

    if (!cookieChallenge) {
      return jsonError(
        "WEBAUTHN_CHALLENGE_MISSING",
        "No authentication challenge found. Request new options.",
        { status: 400 },
      );
    }

    const challengeRecord = consumeChallenge(
      cookieChallenge,
      "authentication",
    );
    if (!challengeRecord) {
      return jsonError(
        "WEBAUTHN_CHALLENGE_EXPIRED",
        "Authentication challenge expired or already used.",
        { status: 400 },
      );
    }

    const passkey = findPasskeyByCredentialId(response.id);
    if (!passkey) {
      return jsonError(
        "WEBAUTHN_UNKNOWN_CREDENTIAL",
        "Unknown passkey credential",
        { status: 401 },
      );
    }

    const { rpID, origin } = getWebAuthnConfig();

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(base64UrlToBytes(passkey.publicKey)),
        counter: passkey.counter,
        transports: passkey.transports as
          | ("usb" | "ble" | "nfc" | "internal" | "hybrid")[]
          | undefined,
      },
    });

    if (!verification.verified) {
      return jsonError(
        "WEBAUTHN_VERIFY_FAILED",
        "Passkey authentication could not be verified",
        { status: 401 },
      );
    }

    updatePasskeyCounter(
      passkey.credentialId,
      verification.authenticationInfo.newCounter,
    );
    cookieStore.delete(WEBAUTHN_CHALLENGE_COOKIE);

    const user = {
      id: passkey.userId,
      email: `${passkey.userId}@passkey.nexa.local`,
    };

    const supabaseSession: {
      access_token: string;
      refresh_token: string;
      expires_at?: number;
    } | null = null;

    if (hasSupabaseEnv()) {
      try {
        // Supabase does not natively bridge WebAuthn; leave session null
        // unless a custom flow is configured. Still honor cookie session.
        await createSupabaseServerClient();
      } catch {
        // ignore
      }
    }

    const demoToken = `demo.${Buffer.from(
      JSON.stringify({ id: user.id, email: user.email, via: "passkey" }),
      "utf8",
    ).toString("base64url")}`;

    await audit("auth.login", {
      actorId: user.id,
      success: true,
      metadata: { method: "passkey" },
    });

    const body = {
      ok: true,
      verified: true,
      user,
      session: {
        access_token: demoToken,
        refresh_token: null as string | null,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
        token_type: "bearer" as const,
        supabase: supabaseSession,
      },
      demo: !hasSupabaseEnv(),
    };

    const res = jsonOk(body);
    res.cookies.set("nexa-session", demoToken, sessionCookieOptions());
    return res;
  } catch (error) {
    return handleRouteError(error);
  }
}
