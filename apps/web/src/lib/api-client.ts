/**
 * Browser helpers for calling NEXA APIs with demo-friendly auth headers.
 */

export async function apiFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("x-nexa-demo-user")) {
    headers.set("x-nexa-demo-user", "demo-user");
  }
  return fetch(input, { ...init, headers });
}

export async function apiJson<T>(
  input: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await apiFetch(input, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export function isUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * POST /api/chat and consume Vercel AI data stream (text chunks as `0:"..."` lines).
 * Persists conversationId from `X-Conversation-Id` when present.
 */
export async function streamChat(opts: {
  messages: Array<{ id?: string; role: string; content: string }>;
  conversationId?: string | null;
  onToken: (chunk: string) => void;
  agentRole?: string;
}): Promise<{ conversationId?: string; text: string }> {
  const body: Record<string, unknown> = {
    messages: opts.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
    })),
  };
  if (isUuid(opts.conversationId)) {
    body.conversationId = opts.conversationId;
  }
  if (opts.agentRole) body.agentRole = opts.agentRole;

  const res = await apiFetch("/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Chat failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const conversationId =
    res.headers.get("X-Conversation-Id") ?? opts.conversationId ?? undefined;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("0:")) continue;
      try {
        const chunk = JSON.parse(line.slice(2)) as string;
        text += chunk;
        opts.onToken(chunk);
      } catch {
        // ignore malformed stream lines
      }
    }
  }

  return { conversationId, text };
}
