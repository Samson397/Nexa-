import { tool } from "ai";
import { z } from "zod";
import {
  createNote,
  createTask,
  listCalendarEvents,
  listTasks,
  searchKnowledge,
  searchMemories,
} from "@/lib/services";

export type AgentToolContext = {
  userId: string;
  workspaceId: string;
  permissions: string[];
};

/**
 * Map each agent tool to one or more agent-definition permissions.
 * A tool is included when the agent has at least one matching permission.
 */
const TOOL_PERMISSIONS: Record<string, string[]> = {
  search_knowledge: [
    "read:knowledge",
    "read:code",
    "read:marketing",
    "suggest:policy",
    "suggest:code",
    "suggest:design",
  ],
  search_memory: ["read:workspace", "read:tasks", "write:tasks", "read:knowledge"],
  create_task: ["write:tasks"],
  list_tasks: ["read:tasks", "write:tasks", "read:workspace", "read:projects"],
  create_note: ["write:notes", "read:notes"],
  draft_email: ["draft:email"],
  list_calendar: ["read:calendar"],
};

function hasPermission(
  permissions: string[],
  required: string[],
): boolean {
  if (required.length === 0) return true;
  const set = new Set(permissions);
  return required.some((p) => set.has(p));
}

function createAllTools(ctx: AgentToolContext) {
  const search_knowledge = tool({
    description:
      "Search the workspace knowledge base for relevant document chunks.",
    parameters: z.object({
      query: z.string().min(1).max(4_000).describe("Semantic search query"),
      limit: z.number().int().min(1).max(20).optional().default(5),
    }),
    execute: async ({ query, limit }) => {
      const result = await searchKnowledge({
        workspaceId: ctx.workspaceId,
        query,
        limit,
      });
      return {
        items: result.items.map((i) => ({
          id: i.id,
          documentId: i.documentId,
          content: i.content,
          score: i.score,
        })),
        demo: result.demo,
      };
    },
  });

  const search_memory = tool({
    description: "Search the user's long-term memories for relevant facts.",
    parameters: z.object({
      query: z.string().min(1).max(4_000).describe("Semantic memory query"),
      limit: z.number().int().min(1).max(20).optional().default(5),
    }),
    execute: async ({ query, limit }) => {
      const result = await searchMemories({
        userId: ctx.userId,
        workspaceId: ctx.workspaceId,
        query,
        limit,
      });
      return {
        items: result.items.map((i) => ({
          id: i.id,
          content: i.content,
          score: i.score,
          importance: i.importance,
        })),
        demo: result.demo,
      };
    },
  });

  const create_task = tool({
    description: "Create a task in the workspace.",
    parameters: z.object({
      title: z.string().min(1).max(500),
      description: z.string().max(10_000).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      dueDate: z
        .string()
        .datetime()
        .optional()
        .describe("ISO-8601 due date"),
    }),
    execute: async ({ title, description, priority, dueDate }) => {
      const { task, demo } = await createTask({
        workspaceId: ctx.workspaceId,
        createdById: ctx.userId,
        title,
        description,
        priority,
        dueDate,
      });
      return { task, demo };
    },
  });

  const list_tasks = tool({
    description: "List workspace tasks, optionally filtered by status.",
    parameters: z.object({
      status: z
        .enum(["todo", "in_progress", "review", "done", "cancelled"])
        .optional(),
      limit: z.number().int().min(1).max(50).optional().default(20),
    }),
    execute: async ({ status, limit }) => {
      const result = await listTasks({
        workspaceId: ctx.workspaceId,
        status,
        page: 1,
        pageSize: limit,
      });
      return {
        items: result.items,
        total: result.total,
        demo: result.demo,
      };
    },
  });

  const create_note = tool({
    description: "Create a note in the workspace.",
    parameters: z.object({
      title: z.string().min(1).max(500),
      plainText: z.string().max(200_000).optional(),
      tags: z.array(z.string().max(64)).max(20).optional(),
    }),
    execute: async ({ title, plainText, tags }) => {
      const { note, demo } = await createNote({
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        title,
        plainText: plainText ?? "",
        content: plainText ? { type: "doc", text: plainText } : {},
        tags,
      });
      return {
        note: {
          id: note.id,
          title: note.title,
          plainText: note.plainText,
          tags: note.tags,
        },
        demo,
      };
    },
  });

  const draft_email = tool({
    description:
      "Draft an email. Returns draft text only — never sends. Require explicit user approval before any send path.",
    parameters: z.object({
      to: z.array(z.string().email()).min(1).max(20),
      subject: z.string().min(1).max(998),
      body: z.string().max(200_000).describe("Plain-text or markdown body"),
      tone: z.string().max(64).optional(),
    }),
    execute: async ({ to, subject, body, tone }) => {
      const header = [
        `To: ${to.join(", ")}`,
        `Subject: ${subject}`,
        tone ? `Tone: ${tone}` : null,
        "",
      ]
        .filter(Boolean)
        .join("\n");

      return {
        draft: `${header}${body}`,
        to,
        subject,
        body,
        sent: false,
        message:
          "Draft only — email was not sent. Confirm with the user before any send action.",
      };
    },
  });

  const list_calendar = tool({
    description: "List upcoming calendar events for the workspace.",
    parameters: z.object({
      limit: z.number().int().min(1).max(50).optional().default(10),
      daysAhead: z.number().int().min(1).max(90).optional().default(14),
    }),
    execute: async ({ limit, daysAhead }) => {
      const from = new Date();
      const to = new Date(Date.now() + daysAhead * 86_400_000);
      const result = await listCalendarEvents({
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        from,
        to,
        limit,
      });
      return {
        items: result.items.map((e) => ({
          id: e.id,
          title: e.title,
          startAt: e.startAt,
          endAt: e.endAt,
          location: e.location,
          allDay: e.allDay,
        })),
        demo: result.demo,
      };
    },
  });

  return {
    search_knowledge,
    search_memory,
    create_task,
    list_tasks,
    create_note,
    draft_email,
    list_calendar,
  };
}

export type AgentTools = ReturnType<typeof createAllTools>;
export type AgentToolName = keyof AgentTools;

/**
 * Build the subset of agent tools allowed by the agent's permission list.
 * When permissions is empty, no tools are returned (fail closed).
 */
export function buildAgentTools(
  ctx: AgentToolContext,
): Partial<AgentTools> {
  const all = createAllTools(ctx);
  const selected: Partial<AgentTools> = {};

  for (const name of Object.keys(all) as AgentToolName[]) {
    const required = TOOL_PERMISSIONS[name] ?? [];
    if (hasPermission(ctx.permissions, required)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (selected as Record<string, unknown>)[name] = all[name];
    }
  }

  return selected;
}
