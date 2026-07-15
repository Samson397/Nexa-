import {
  demoStore,
  type DemoPasskey,
  type DemoWebAuthnChallenge,
} from "@/lib/demo-store";

/**
 * Shared WebAuthn / passkey RP helpers and challenge store.
 * Uses WEBAUTHN_RP_ID, WEBAUTHN_RP_NAME, WEBAUTHN_ORIGIN (defaults: localhost).
 */

export type WebAuthnRpConfig = {
  rpID: string;
  rpName: string;
  origin: string;
};

export function getWebAuthnConfig(): WebAuthnRpConfig {
  const rpID = process.env.WEBAUTHN_RP_ID || "localhost";
  const rpName = process.env.WEBAUTHN_RP_NAME || "NEXA";
  const origin =
    process.env.WEBAUTHN_ORIGIN ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  return { rpID, rpName, origin };
}

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function pruneChallenges(now = Date.now()) {
  const list = demoStore.webauthnChallenges();
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i]!.expiresAt <= now) list.splice(i, 1);
  }
}

export function storeChallenge(
  entry: Omit<DemoWebAuthnChallenge, "expiresAt"> & { expiresAt?: number },
): DemoWebAuthnChallenge {
  pruneChallenges();
  const challenge: DemoWebAuthnChallenge = {
    ...entry,
    expiresAt: entry.expiresAt ?? Date.now() + CHALLENGE_TTL_MS,
  };
  demoStore.webauthnChallenges().push(challenge);
  return challenge;
}

export function consumeChallenge(
  challenge: string,
  type?: DemoWebAuthnChallenge["type"],
): DemoWebAuthnChallenge | null {
  pruneChallenges();
  const list = demoStore.webauthnChallenges();
  const idx = list.findIndex(
    (c) => c.challenge === challenge && (!type || c.type === type),
  );
  if (idx < 0) return null;
  const [found] = list.splice(idx, 1);
  return found ?? null;
}

export function findChallenge(
  challenge: string,
  type?: DemoWebAuthnChallenge["type"],
): DemoWebAuthnChallenge | null {
  pruneChallenges();
  return (
    demoStore
      .webauthnChallenges()
      .find((c) => c.challenge === challenge && (!type || c.type === type)) ??
    null
  );
}

export function listPasskeysForUser(userId: string): DemoPasskey[] {
  return demoStore.passkeys().filter((p) => p.userId === userId);
}

export function findPasskeyByCredentialId(
  credentialId: string,
): DemoPasskey | undefined {
  return demoStore.passkeys().find((p) => p.credentialId === credentialId);
}

export function upsertPasskey(passkey: DemoPasskey): DemoPasskey {
  const list = demoStore.passkeys();
  const idx = list.findIndex((p) => p.credentialId === passkey.credentialId);
  if (idx >= 0) {
    list[idx] = passkey;
    return passkey;
  }
  list.push(passkey);
  return passkey;
}

export function updatePasskeyCounter(
  credentialId: string,
  counter: number,
): void {
  const passkey = findPasskeyByCredentialId(credentialId);
  if (passkey) passkey.counter = counter;
}

/** Encode Uint8Array → base64url for storage. */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return Buffer.from(binary, "binary")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Decode base64url → Uint8Array. */
export function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = Buffer.from(padded + pad, "base64").toString("binary");
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export const WEBAUTHN_CHALLENGE_COOKIE = "nexa_webauthn_challenge";
