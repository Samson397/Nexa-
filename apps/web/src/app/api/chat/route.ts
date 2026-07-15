import { streamText, type CoreMessage } from "ai";
import {
  getLanguageModel,
  getAgentDefinition,
  DEFAULT_MODELS,
} from "@nexa/ai";
import type { AiProvider, AgentRole } from "@nexa/shared";
import {
  hasAnyAiApiKey,
  handleRouteError,
  parseBody,
  rateLimitByIp,
} from "@/lib/api";
import { chatRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/chat — streaming chat via Vercel AI SDK `streamText`.
 *
 * Security: rate-limited by IP; validate body with Zod; never echo secrets.
 * When no AI API keys are configured, returns a streamed mock reply so the
 * UI can run in demo mode.
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "chat",
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const parsed = await parseBody(request, chatRequestSchema);
    if (parsed.error) return parsed.error;

    const { messages, conversationId, provider, model, agentRole } =
      parsed.data;

    let systemPrompt: string | undefined;
    let resolvedProvider: AiProvider =
      (provider as AiProvider | undefined) ?? "openai";
    let resolvedModel = model ?? DEFAULT_MODELS[resolvedProvider];

    if (agentRole) {
      const agent = getAgentDefinition(agentRole as AgentRole);
      systemPrompt = agent.systemPrompt;
      if (!provider) {
        resolvedProvider = agent.defaultProvider as AiProvider;
      }
      if (!model) {
        resolvedModel = agent.defaultModel;
      }
    }

    if (!hasAnyAiApiKey()) {
      return mockChatStreamResponse({
        messages,
        conversationId,
        agentRole,
        systemPrompt,
      });
    }

    const languageModel = getLanguageModel(resolvedProvider, resolvedModel);

    const coreMessages: CoreMessage[] = messages.map((m) => ({
      role: m.role === "function" || m.role === "data" ? "assistant" : m.role,
      content: m.content,
    })) as CoreMessage[];

    const result = streamText({
      model: languageModel,
      system: systemPrompt,
      messages: coreMessages,
    });

    return result.toDataStreamResponse({
      headers: conversationId
        ? { "X-Conversation-Id": conversationId }
        : undefined,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

function mockChatStreamResponse(opts: {
  messages: Array<{ role: string; content: string }>;
  conversationId?: string;
  agentRole?: string;
  systemPrompt?: string;
}): Response {
  const lastUser = [...opts.messages]
    .reverse()
    .find((m) => m.role === "user")?.content;

  const roleLabel = opts.agentRole
    ? opts.agentRole.replaceAll("_", " ")
    : "assistant";

  const text = [
    `You're chatting with NEXA in **demo mode** (${roleLabel}).`,
    ``,
    `No AI provider API keys were found (OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.), so this is a local mock stream — the UI should still update in real time.`,
    ``,
    lastUser
      ? `You said: “${truncate(lastUser, 280)}”`
      : `Send a message to try the streaming UI.`,
    ``,
    `Configure a provider key and restart to talk to a real model.`,
  ].join("\n");

  const encoder = new TextEncoder();
  const chunks = splitForStream(text);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        // AI SDK data stream protocol (text part)
        controller.enqueue(
          encoder.encode(`0:${JSON.stringify(chunk)}\n`),
        );
        await sleep(18);
      }
      controller.enqueue(
        encoder.encode(
          `d:${JSON.stringify({ finishReason: "stop" })}\n`,
        ),
      );
      controller.close();
    },
  });

  const headers = new Headers({
    "Content-Type": "text/plain; charset=utf-8",
    "X-Vercel-AI-Data-Stream": "v1",
    "X-Nexa-Demo-Mode": "1",
  });
  if (opts.conversationId) {
    headers.set("X-Conversation-Id", opts.conversationId);
  }

  return new Response(stream, { status: 200, headers });
}

function splitForStream(text: string): string[] {
  const parts: string[] = [];
  const tokens = text.split(/(\s+)/);
  let buf = "";
  for (const t of tokens) {
    buf += t;
    if (buf.length >= 12) {
      parts.push(buf);
      buf = "";
    }
  }
  if (buf) parts.push(buf);
  return parts.length ? parts : [text];
}

function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, max - 1)}…`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
