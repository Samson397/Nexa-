/**
 * Thin fetch helpers against the NEXA web API.
 * Base URL from EXPO_PUBLIC_API_URL / EXPO_PUBLIC_APP_URL.
 */

const DEFAULT_BASE = "http://localhost:3000";

function readEnv(name: string): string | undefined {
  try {
    // Expo inlines EXPO_PUBLIC_* at bundle time
    const env = (globalThis as { process?: { env?: Record<string, string> } })
      .process?.env;
    return env?.[name]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function getApiBaseUrl(): string {
  return (
    readEnv("EXPO_PUBLIC_API_URL") ||
    readEnv("EXPO_PUBLIC_APP_URL") ||
    DEFAULT_BASE
  ).replace(/\/$/, "");
}


export type ApiError = {
  error: string;
  status: number;
};

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw { error: message, status: res.status } satisfies ApiError;
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  health: () => request<{ ok: boolean; service?: string }>("/api/health"),
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
};
