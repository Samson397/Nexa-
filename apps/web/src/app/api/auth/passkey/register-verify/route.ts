import { cookies } from "next/headers";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import {
  handleRouteError,
  hasSupabaseEnv,
  jsonError,
  jsonOk,
  newId,
  parseBody,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import { passkeyVerifySchema } from "@/lib/validators";
import {
  bytesToBase64Url,
  consumeChallenge,
  getWebAuthnConfig,
  upsertPasskey,
  WEBAUTHN_CHALLENGE_COOKIE,
} from "@/lib/webauthn";
import { tryGetDb } from "@/lib/db";
import { profiles } from "@nexa/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

/**
 * POST /api/auth/passkey/register-verify
 * Verify registration; store credential in demo-store (and profiles.preferences when DB).
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "passkey-register-verify",
      limit: 20,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const parsed = await parseBody(request, passkeyVerifySchema);
    if (parsed.error) return parsed.error;

    const response = parsed.data
      .response as unknown as RegistrationResponseJSON;
    const cookieStore = await cookies();
    const cookieChallenge = cookieStore.get(WEBAUTHN_CHALLENGE_COOKIE)?.value;

    if (!cookieChallenge) {
      return jsonError(
        "WEBAUTHN_CHALLENGE_MISSING",
        "No registration challenge found. Request new options.",
        { status: 400 },
      );
    }

    const challengeRecord = consumeChallenge(cookieChallenge, "registration");
    if (!challengeRecord) {
      return jsonError(
        "WEBAUTHN_CHALLENGE_EXPIRED",
        "Registration challenge expired or already used.",
        { status: 400 },
      );
    }

    const { rpID, origin } = getWebAuthnConfig();

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return jsonError(
        "WEBAUTHN_VERIFY_FAILED",
        "Passkey registration could not be verified",
        { status: 400 },
      );
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    const passkey = upsertPasskey({
      id: newId(),
      userId: auth.user.id,
      credentialId: credential.id,
      publicKey: bytesToBase64Url(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      name: parsed.data.name ?? "Passkey",
      createdAt: new Date().toISOString(),
    });

    cookieStore.delete(WEBAUTHN_CHALLENGE_COOKIE);

    const db = tryGetDb();
    if (db && hasSupabaseEnv()) {
      try {
        const rows = await db
          .select()
          .from(profiles)
          .where(eq(profiles.supabaseUserId, auth.user.id))
          .limit(1);
        const profile = rows[0];
        if (profile) {
          const prefs = (profile.preferences ?? {}) as Record<string, unknown>;
          const existing = Array.isArray(prefs.passkeys)
            ? (prefs.passkeys as unknown[])
            : [];
          const nextPrefs = {
            ...prefs,
            passkeys: [
              ...existing,
              {
                credentialId: passkey.credentialId,
                publicKey: passkey.publicKey,
                counter: passkey.counter,
                transports: passkey.transports,
                name: passkey.name,
                createdAt: passkey.createdAt,
              },
            ],
          };
          await db
            .update(profiles)
            .set({ preferences: nextPrefs, updatedAt: new Date() })
            .where(eq(profiles.id, profile.id));
        }
      } catch {
        // Demo-store remains source of truth when profile sync fails
      }
    }

    return jsonOk({
      ok: true,
      verified: true,
      passkey: {
        id: passkey.id,
        credentialId: passkey.credentialId,
        name: passkey.name,
        createdAt: passkey.createdAt,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
