import type { IntegrationProvider } from "@nexa/shared";
import { encrypt, decrypt } from "@/lib/encryption";
import {
  getProviderConfig,
  hasProviderCredentials,
  type ProviderOAuthConfig,
} from "@/lib/integrations/providers";
import { demoStore, type DemoIntegration, type DemoOAuthState } from "@/lib/demo-store";

export type OAuthTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  [key: string]: unknown;
};

export type BuildAuthUrlOptions = {
  state: string;
  redirectUri: string;
  codeChallenge?: string;
  scopes?: string[];
};

/**
 * Build the provider authorization URL for the OAuth2 code flow.
 * Never accepts or transmits passwords.
 */
export function buildAuthorizationUrl(
  provider: IntegrationProvider | string,
  options: BuildAuthUrlOptions,
): string {
  const config = getProviderConfig(provider);
  if (!config) {
    throw new Error(`Unknown integration provider: ${provider}`);
  }

  const clientId = process.env[config.clientIdEnv];
  if (!clientId) {
    throw new Error(`Missing ${config.clientIdEnv} for ${config.displayName}`);
  }

  const scopes = options.scopes?.length ? options.scopes : config.scopes;
  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", options.state);
  if (scopes.length) {
    url.searchParams.set("scope", scopes.join(" "));
  }
  if (options.codeChallenge) {
    url.searchParams.set("code_challenge", options.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
  }
  if (config.extraAuthParams) {
    for (const [k, v] of Object.entries(config.extraAuthParams)) {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

/**
 * Exchange an authorization code for tokens. Tokens are returned plaintext
 * from the IdP — callers must encrypt before storage.
 */
export async function exchangeCodeForTokens(
  provider: IntegrationProvider | string,
  code: string,
  redirectUri: string,
  extras?: { codeVerifier?: string },
): Promise<OAuthTokens> {
  const config = getProviderConfig(provider);
  if (!config) {
    throw new Error(`Unknown integration provider: ${provider}`);
  }

  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];
  if (!clientId || !clientSecret) {
    throw new Error(
      `Missing OAuth credentials for ${config.displayName} (${config.clientIdEnv})`,
    );
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });
  if (extras?.codeVerifier) {
    body.set("code_verifier", extras.codeVerifier);
  }

  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  };

  // Notion uses Basic auth for token exchange
  if (config.provider === "notion") {
    headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  }

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers,
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Token exchange failed for ${config.displayName}: ${res.status} ${text.slice(0, 200)}`,
    );
  }

  const json = (await res.json()) as OAuthTokens;
  if (!json.access_token && (json as { access_token?: string }).access_token !== "") {
    // Slack returns access_token nested in some shapes; normalize
    const slack = json as {
      access_token?: string;
      authed_user?: { access_token?: string };
    };
    if (slack.authed_user?.access_token) {
      return {
        ...json,
        access_token: slack.authed_user.access_token,
      };
    }
  }
  if (!json.access_token) {
    throw new Error(`No access_token returned for ${config.displayName}`);
  }
  return json;
}

/**
 * Encrypt OAuth token payload for at-rest storage.
 * Falls back to a demo-prefixed encoding when ENCRYPTION_KEY is unset.
 */
export function encryptTokens(tokens: OAuthTokens): string {
  const plaintext = JSON.stringify(tokens);
  if (
    process.env.ENCRYPTION_KEY &&
    /^[0-9a-fA-F]{64}$/.test(process.env.ENCRYPTION_KEY)
  ) {
    return encrypt(plaintext);
  }
  return `demo:${Buffer.from(plaintext, "utf8").toString("base64url")}`;
}

export function decryptTokens(payload: string): OAuthTokens {
  if (payload.startsWith("demo:")) {
    const raw = Buffer.from(payload.slice(5), "base64url").toString("utf8");
    return JSON.parse(raw) as OAuthTokens;
  }
  return JSON.parse(decrypt(payload)) as OAuthTokens;
}

export function storeOAuthState(entry: Omit<DemoOAuthState, "expiresAt"> & { expiresAt?: number }) {
  const state: DemoOAuthState = {
    ...entry,
    expiresAt: entry.expiresAt ?? Date.now() + 10 * 60 * 1000,
  };
  demoStore.oauthStates().push(state);
  return state;
}

export function consumeOAuthState(state: string): DemoOAuthState | null {
  const list = demoStore.oauthStates();
  const now = Date.now();
  for (let i = list.length - 1; i >= 0; i -= 1) {
    if (list[i]!.expiresAt <= now) list.splice(i, 1);
  }
  const idx = list.findIndex((s) => s.state === state);
  if (idx < 0) return null;
  const [found] = list.splice(idx, 1);
  return found ?? null;
}

export function upsertDemoIntegration(
  partial: Omit<DemoIntegration, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
  },
): DemoIntegration {
  const list = demoStore.integrations();
  const existing = list.find(
    (i) =>
      i.userId === partial.userId &&
      i.provider === partial.provider &&
      (i.workspaceId ?? "") === (partial.workspaceId ?? ""),
  );
  const now = new Date().toISOString();
  if (existing) {
    Object.assign(existing, partial, { updatedAt: now });
    return existing;
  }
  const item: DemoIntegration = {
    id: partial.id ?? crypto.randomUUID(),
    userId: partial.userId,
    workspaceId: partial.workspaceId,
    provider: partial.provider,
    status: partial.status,
    encryptedCredentials: partial.encryptedCredentials,
    scopes: partial.scopes,
    accountLabel: partial.accountLabel,
    metadata: partial.metadata,
    createdAt: now,
    updatedAt: now,
  };
  list.push(item);
  return item;
}

export function getConnectedIntegration(
  userId: string,
  provider: string,
): DemoIntegration | undefined {
  return demoStore
    .integrations()
    .find(
      (i) =>
        i.userId === userId &&
        i.provider === provider &&
        i.status === "connected",
    );
}

export function providerIsReady(provider: string): {
  config: ProviderOAuthConfig | null;
  ready: boolean;
} {
  const config = getProviderConfig(provider);
  if (!config) return { config: null, ready: false };
  return { config, ready: hasProviderCredentials(config) };
}

/** Reject any password-shaped keys in an arbitrary payload. */
export function rejectPasswordFields(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const keys = Object.keys(raw as object).map((k) => k.toLowerCase());
  if (
    keys.some((k) =>
      ["password", "passwd", "pwd", "secret", "app_password"].includes(k),
    )
  ) {
    return "Third-party passwords are never accepted. Connect via OAuth only.";
  }
  return null;
}
