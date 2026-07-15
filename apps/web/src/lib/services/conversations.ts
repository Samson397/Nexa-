import { and, asc, desc, eq } from "drizzle-orm";
import { conversations, messages } from "@nexa/db";
import { NexaError } from "@nexa/shared";
import { tryGetDb } from "@/lib/db";
import {
  demoStore,
  type DemoConversation,
  type DemoMessage,
} from "@/lib/demo-store";
import { newId } from "@/lib/services/ids";

export type ConversationRecord = {
  id: string;
  workspaceId: string;
  userId: string;
  agentId?: string | null;
  title: string;
  provider: string;
  model: string;
  metadata?: Record<string, unknown>;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MessageRecord = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  attachments?: Array<{
    type: string;
    url: string;
    name: string;
    mimeType?: string;
  }>;
  tokenCount?: number | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type CreateConversationInput = {
  workspaceId: string;
  userId: string;
  title?: string;
  agentId?: string;
  provider?: string;
  model?: string;
  metadata?: Record<string, unknown>;
};

export type AddMessageInput = {
  conversationId: string;
  role: string;
  content: string;
  attachments?: Array<{
    type: string;
    url: string;
    name: string;
    mimeType?: string;
  }>;
  tokenCount?: number;
  metadata?: Record<string, unknown>;
};

export async function listConversations(input: {
  workspaceId: string;
  userId: string;
  limit?: number;
}): Promise<{ items: ConversationRecord[]; demo: boolean }> {
  const limit = Math.min(100, Math.max(1, input.limit ?? 50));
  const db = tryGetDb();

  if (!db) {
    const items = demoStore
      .conversations()
      .filter(
        (c) =>
          c.workspaceId === input.workspaceId && c.userId === input.userId,
      )
      .slice(0, limit)
      .map(fromDemoConversation);
    return { items, demo: true };
  }

  const rows = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.workspaceId, input.workspaceId),
        eq(conversations.userId, input.userId),
      ),
    )
    .orderBy(desc(conversations.updatedAt))
    .limit(limit);

  return { items: rows.map(fromDbConversation), demo: false };
}

export async function createConversation(
  input: CreateConversationInput,
): Promise<{ conversation: ConversationRecord; demo: boolean }> {
  const db = tryGetDb();
  const title = input.title?.trim() || "New conversation";
  const provider = input.provider ?? "openai";
  const model = input.model ?? "gpt-4o";

  if (!db) {
    const now = new Date().toISOString();
    const conversation: DemoConversation = {
      id: newId(),
      workspaceId: input.workspaceId,
      userId: input.userId,
      agentId: input.agentId,
      title,
      provider,
      model,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
    demoStore.conversations().unshift(conversation);
    return { conversation: fromDemoConversation(conversation), demo: true };
  }

  const inserted = await db
    .insert(conversations)
    .values({
      workspaceId: input.workspaceId,
      userId: input.userId,
      agentId: input.agentId,
      title,
      provider,
      model,
      metadata: input.metadata ?? {},
    })
    .returning();

  return { conversation: fromDbConversation(inserted[0]!), demo: false };
}

export async function getConversation(
  conversationId: string,
  opts?: { workspaceId?: string; userId?: string },
): Promise<{ conversation: ConversationRecord; demo: boolean }> {
  const db = tryGetDb();

  if (!db) {
    const found = demoStore
      .conversations()
      .find((c) => {
        if (c.id !== conversationId) return false;
        if (opts?.workspaceId && c.workspaceId !== opts.workspaceId) return false;
        if (opts?.userId && c.userId !== opts.userId) return false;
        return true;
      });
    if (!found) {
      throw new NexaError("NOT_FOUND", "Conversation not found", { status: 404 });
    }
    return { conversation: fromDemoConversation(found), demo: true };
  }

  const conditions = [eq(conversations.id, conversationId)];
  if (opts?.workspaceId) {
    conditions.push(eq(conversations.workspaceId, opts.workspaceId));
  }
  if (opts?.userId) {
    conditions.push(eq(conversations.userId, opts.userId));
  }

  const rows = await db
    .select()
    .from(conversations)
    .where(and(...conditions))
    .limit(1);

  if (!rows[0]) {
    throw new NexaError("NOT_FOUND", "Conversation not found", { status: 404 });
  }
  return { conversation: fromDbConversation(rows[0]), demo: false };
}

export async function addMessage(
  input: AddMessageInput,
): Promise<{ message: MessageRecord; demo: boolean }> {
  const db = tryGetDb();
  const content = input.content;
  if (!content && content !== "") {
    throw new NexaError("VALIDATION_ERROR", "Message content is required", {
      status: 400,
    });
  }

  // Ensure conversation exists
  await getConversation(input.conversationId);

  if (!db) {
    const now = new Date().toISOString();
    const message: DemoMessage = {
      id: newId(),
      conversationId: input.conversationId,
      role: input.role,
      content,
      attachments: input.attachments ?? [],
      tokenCount: input.tokenCount,
      metadata: input.metadata ?? {},
      createdAt: now,
    };
    demoStore.messages().push(message);

    const conv = demoStore
      .conversations()
      .find((c) => c.id === input.conversationId);
    if (conv) conv.updatedAt = now;

    return { message: fromDemoMessage(message), demo: true };
  }

  const inserted = await db
    .insert(messages)
    .values({
      conversationId: input.conversationId,
      role: input.role,
      content,
      attachments: input.attachments ?? [],
      tokenCount: input.tokenCount,
      metadata: input.metadata ?? {},
    })
    .returning();

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, input.conversationId));

  return { message: fromDbMessage(inserted[0]!), demo: false };
}

export async function listMessages(input: {
  conversationId: string;
  limit?: number;
}): Promise<{ items: MessageRecord[]; demo: boolean }> {
  const limit = Math.min(500, Math.max(1, input.limit ?? 200));
  const db = tryGetDb();

  // Confirm conversation exists (throws NOT_FOUND)
  await getConversation(input.conversationId);

  if (!db) {
    const items = demoStore
      .messages()
      .filter((m) => m.conversationId === input.conversationId)
      .slice(-limit)
      .map(fromDemoMessage);
    return { items, demo: true };
  }

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, input.conversationId))
    .orderBy(asc(messages.createdAt))
    .limit(limit);

  return { items: rows.map(fromDbMessage), demo: false };
}

function fromDemoConversation(c: DemoConversation): ConversationRecord {
  return {
    id: c.id,
    workspaceId: c.workspaceId,
    userId: c.userId,
    agentId: c.agentId,
    title: c.title,
    provider: c.provider,
    model: c.model,
    metadata: c.metadata,
    archivedAt: c.archivedAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function fromDbConversation(
  row: typeof conversations.$inferSelect,
): ConversationRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId,
    agentId: row.agentId,
    title: row.title,
    provider: row.provider,
    model: row.model,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function fromDemoMessage(m: DemoMessage): MessageRecord {
  return {
    id: m.id,
    conversationId: m.conversationId,
    role: m.role,
    content: m.content,
    attachments: m.attachments,
    tokenCount: m.tokenCount,
    metadata: m.metadata,
    createdAt: m.createdAt,
  };
}

function fromDbMessage(row: typeof messages.$inferSelect): MessageRecord {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role,
    content: row.content,
    attachments: row.attachments ?? [],
    tokenCount: row.tokenCount,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.createdAt.toISOString(),
  };
}
