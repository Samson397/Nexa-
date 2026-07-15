import { streamText, type CoreMessage } from "ai";
import {
  getLanguageModel,
  getAgentDefinition,
  DEFAULT_MODELS,
} from "@nexa/ai";
import type { AiProvider, AgentRole } from "@nexa/shared";
import { buildAgentTools } from "@/lib/ai/tools";
import {
  getClientIp,
  hasAnyAiApiKey,
  handleRouteError,
  parseBody,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import {
  addMessage,
  createConversation,
  ensureUserWorkspace,
  getConversation,
  searchMemories,
  storeMemory,
  writeAudit,
} from "@/lib/services";
import { chatRequestSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/chat — streaming chat via Vercel AI SDK `streamText`.
 *
 * - Creates/loads a conversation and persists user + assistant messages
 * - Retrieves relevant memories into the system prompt
 * - Attaches agent tools filtered by agent permissions when agentRole is set
 * - Audits chat.message / agent.run
 * - Streams a demo mock reply when no AI API keys are configured
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "chat",
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const parsed = await parseBody(request, chatRequestSchema);
    if (parsed.error) return parsed.error;

    const { messages, conversationId, provider, model, agentRole } =
      parsed.data;

    const { profileId, workspaceId } = await ensureUserWorkspace(
      auth.user.id,
      auth.user.email ?? `${auth.user.id}@nexa.local`,
    );

    const clientIp = getClientIp(request);
    const userAgent = request.headers.get("user-agent") ?? undefined;

    let systemPrompt: string | undefined;
    let resolvedProvider: AiProvider =
      (provider as AiProvider | undefined) ?? "openai";
    let resolvedModel = model ?? DEFAULT_MODELS[resolvedProvider];
    let agentTools: ReturnType<typeof buildAgentTools> | undefined;
    let agentPermissions: string[] = [];

    if (agentRole) {
      const agent = getAgentDefinition(agentRole as AgentRole);
      systemPrompt = agent.systemPrompt;
      agentPermissions = agent.permissions;
      if (!provider) {
        resolvedProvider = agent.defaultProvider as AiProvider;
      }
      if (!model) {
        resolvedModel = agent.defaultModel;
      }
      agentTools = buildAgentTools({
        userId: profileId,
        workspaceId,
        permissions: agent.permissions,
      });
    }

    // Load or create conversation
    let conversation;
    if (conversationId) {
      const loaded = await getConversation(conversationId, {
        workspaceId,
        userId: profileId,
      });
      conversation = loaded.conversation;
    } else {
      const title = deriveTitle(messages);
      const created = await createConversation({
        workspaceId,
        userId: profileId,
        title,
        provider: resolvedProvider,
        model: resolvedModel,
        metadata: agentRole ? { agentRole } : undefined,
      });
      conversation = created.conversation;
    }

    const lastUser = [...messages].reverse().find((m) => m.role === "user");

    if (lastUser) {
      await addMessage({
        conversationId: conversation.id,
        role: "user",
        content: lastUser.content,
        metadata: { clientMessageId: lastUser.id },
      });
    }

    // Retrieve relevant memories and inject into system prompt
    const memoryQuery = lastUser?.content?.slice(0, 2_000) || "preferences";
    let memoryBlock = "";
    try {
      const memories = await searchMemories({
        userId: profileId,
        workspaceId,
        query: memoryQuery,
        limit: 5,
      });
      if (memories.items.length > 0) {
        memoryBlock = [
          "",
          "## Relevant memories",
          ...memories.items.map(
            (m, i) =>
              `${i + 1}. (score=${m.score.toFixed(2)}) ${m.content}`,
          ),
        ].join("\n");
      }
    } catch {
      // Memory search is best-effort
    }

    const enrichedSystem = [systemPrompt, memoryBlock]
      .filter(Boolean)
      .join("\n\n");

    await writeAudit({
      workspaceId,
      userId: profileId,
      action: agentRole ? "agent.run" : "chat.message",
      resourceType: "conversation",
      resourceId: conversation.id,
      ip: clientIp,
      userAgent,
      metadata: {
        agentRole: agentRole ?? null,
        provider: resolvedProvider,
        model: resolvedModel,
        messageCount: messages.length,
      },
    });

    const persistAssistant = async (text: string) => {
      if (!text.trim()) return;
      try {
        await addMessage({
          conversationId: conversation.id,
          role: "assistant",
          content: text,
          metadata: {
            provider: resolvedProvider,
            model: resolvedModel,
            agentRole: agentRole ?? null,
          },
        });

        await writeAudit({
          workspaceId,
          userId: profileId,
          action: "chat.message",
          resourceType: "message",
          resourceId: conversation.id,
          ip: clientIp,
          userAgent,
          metadata: { role: "assistant", length: text.length },
        });

        if (lastUser && shouldStoreMemory(lastUser.content, text)) {
          await storeMemory({
            userId: profileId,
            workspaceId,
            content: extractMemorableFact(lastUser.content),
            importance: 0.7,
            source: "chat",
            metadata: { conversationId: conversation.id },
          });
        }
      } catch {
        // Persistence errors must not break the stream response
      }
    };

    if (!hasAnyAiApiKey()) {
      return mockChatStreamResponse({
        messages,
        conversationId: conversation.id,
        agentRole,
        systemPrompt: enrichedSystem || undefined,
        onComplete: persistAssistant,
      });
    }

    const languageModel = getLanguageModel(resolvedProvider, resolvedModel);

    const coreMessages: CoreMessage[] = messages.map((m) => ({
      role: m.role === "function" || m.role === "data" ? "assistant" : m.role,
      content: m.content,
    })) as CoreMessage[];

    const tools =
      agentTools && Object.keys(agentTools).length > 0
        ? agentTools
        : undefined;

    const result = streamText({
      model: languageModel,
      system: enrichedSystem || undefined,
      messages: coreMessages,
      tools,
      maxSteps: tools ? 5 : undefined,
      onFinish: async ({ text }) => {
        await persistAssistant(text);
      },
    });

    return result.toDataStreamResponse({
      headers: {
        "X-Conversation-Id": conversation.id,
        ...(agentPermissions.length
          ? { "X-Nexa-Agent-Permissions": agentPermissions.join(",") }
          : {}),
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

function deriveTitle(
  messages: Array<{ role: string; content: string }>,
): string {
  const firstUser = messages.find((m) => m.role === "user")?.content?.trim();
  if (!firstUser) return "New conversation";
  const oneLine = firstUser.replace(/\s+/g, " ");
  return oneLine.length > 72 ? `${oneLine.slice(0, 71)}…` : oneLine;
}

function shouldStoreMemory(userText: string, _assistantText: string): boolean {
  return /remember (that|this|to)|my preference|always remember|don't forget|i (prefer|like|hate|always|never)/i.test(
    userText,
  );
}

function extractMemorableFact(userText: string): string {
  const trimmed = userText.trim();
  return trimmed.length > 2_000 ? `${trimmed.slice(0, 1_999)}…` : trimmed;
}

function mockChatStreamResponse(opts: {
  messages: Array<{ role: string; content: string }>;
  conversationId: string;
  agentRole?: string;
  systemPrompt?: string;
  onComplete?: (text: string) => Promise<void>;
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
        controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`));
        await sleep(18);
      }
      controller.enqueue(
        encoder.encode(`d:${JSON.stringify({ finishReason: "stop" })}\n`),
      );
      controller.close();
      if (opts.onComplete) {
        await opts.onComplete(text);
      }
    },
  });

  const headers = new Headers({
    "Content-Type": "text/plain; charset=utf-8",
    "X-Vercel-AI-Data-Stream": "v1",
    "X-Nexa-Demo-Mode": "1",
    "X-Conversation-Id": opts.conversationId,
  });

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
