import { z } from "zod";
import {
  AGENT_ROLES,
  SENSITIVE_AUTOMATION_ACTIONS,
} from "@nexa/shared";

/**
 * Shared Zod schemas for API route input validation.
 * Always validate untrusted client input before business logic.
 */

export const aiProviderSchema = z.enum([
  "openai",
  "anthropic",
  "gemini",
  "deepseek",
  "openrouter",
]);

export const agentRoleSchema = z.enum(
  AGENT_ROLES as unknown as [string, ...string[]],
);

export const chatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool", "data", "function"]),
  content: z.string().max(100_000),
  id: z.string().optional(),
  name: z.string().optional(),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(200),
  conversationId: z.string().uuid().optional(),
  provider: aiProviderSchema.optional(),
  model: z.string().min(1).max(128).optional(),
  agentRole: agentRoleSchema.optional(),
});

export const emailPasswordSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
});

export const oauthProviderSchema = z.enum(["google", "github", "apple"]);

export const memorySearchSchema = z.object({
  query: z.string().min(1).max(4_000),
  workspaceId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(10),
  agentId: z.string().uuid().optional(),
});

export const memoryStoreSchema = z.object({
  content: z.string().min(1).max(20_000),
  workspaceId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  importance: z.number().min(0).max(1).default(0.5),
  source: z.string().max(256).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const knowledgeSearchSchema = z.object({
  query: z.string().min(1).max(4_000),
  workspaceId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(10),
  documentId: z.string().uuid().optional(),
});

export const taskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export const taskStatusSchema = z.enum([
  "todo",
  "in_progress",
  "review",
  "done",
  "cancelled",
]);

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10_000).optional(),
  workspaceId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  status: taskStatusSchema.default("todo"),
  priority: taskPrioritySchema.default("medium"),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
});

export const listTasksQuerySchema = z.object({
  workspaceId: z.string().uuid().optional(),
  status: taskStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const sensitiveActionSchema = z.enum(SENSITIVE_AUTOMATION_ACTIONS);

export const createAutomationSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2_000).optional(),
  workspaceId: z.string().uuid().optional(),
  isEnabled: z.boolean().default(true),
  /** Sensitive actions (send_message, charge_payment, etc.) require approval before run. */
  approvalMode: z
    .enum(["always", "sensitive_only", "never"])
    .default("sensitive_only"),
  trigger: z.object({
    type: z.string().min(1).max(64),
    config: z.record(z.unknown()).default({}),
  }),
  steps: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        type: z.string().min(1).max(64),
        config: z.record(z.unknown()).default({}),
        requiresApproval: z.boolean().optional(),
      }),
    )
    .max(50)
    .default([]),
});

export const approveAutomationSchema = z.object({
  runId: z.string().uuid().optional(),
  note: z.string().max(1_000).optional(),
});

/**
 * Integration connect — OAuth only.
 * Never accept third-party account passwords in this payload.
 */
export const connectIntegrationSchema = z
  .object({
    provider: z.string().min(1).max(64),
    workspaceId: z.string().uuid().optional(),
    redirectUri: z.string().url().optional(),
    scopes: z.array(z.string().max(128)).max(50).optional(),
  })
  .strict()
  .refine(
    (data) =>
      !("password" in data) &&
      !("passwd" in data) &&
      !("credentials" in data),
    { message: "Third-party passwords are never accepted" },
  );

export const mfaVerifySchema = z.object({
  factorId: z.string().min(1).max(128),
  code: z.string().min(4).max(12),
});

export const passkeyVerifySchema = z.object({
  response: z.record(z.unknown()),
  userId: z.string().min(1).max(128).optional(),
  name: z.string().max(200).optional(),
});

export const createNoteSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.record(z.unknown()).optional(),
  plainText: z.string().max(200_000).optional(),
  tags: z.array(z.string().max(64)).max(50).optional(),
  workspaceId: z.string().uuid().optional(),
  folderId: z.string().uuid().optional(),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.record(z.unknown()).optional(),
  plainText: z.string().max(200_000).optional(),
  tags: z.array(z.string().max(64)).max(50).optional(),
  folderId: z.string().uuid().nullable().optional(),
});

export const createCalendarEventSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10_000).optional(),
  location: z.string().max(500).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  allDay: z.boolean().optional(),
  workspaceId: z.string().uuid().optional(),
});

export const emailDraftSchema = z.object({
  to: z.array(z.string().email()).min(1).max(50),
  subject: z.string().min(1).max(998),
  body: z.string().max(200_000).default(""),
  /** Explicit approval required before any send path executes. */
  approvedToSend: z.boolean().optional().default(false),
  provider: z.enum(["gmail", "outlook"]).optional(),
});

export const deviceTypeSchema = z.enum(["web", "desktop", "ios", "android"]);

export const createDeviceSchema = z.object({
  name: z.string().min(1).max(200),
  type: deviceTypeSchema,
  platform: z.string().max(128).optional(),
  /** Desktop companions must declare approved local paths — never broaden silently. */
  approvedPaths: z.array(z.string().max(1_024)).max(100).default([]),
  permissions: z.array(z.string().max(128)).max(50).default([]),
  pushToken: z.string().max(512).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/** Allowed knowledge upload MIME types / extensions */
export const ALLOWED_UPLOAD_EXTENSIONS = [
  "pdf",
  "docx",
  "xlsx",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "zip",
  "md",
  "txt",
  "ts",
  "tsx",
  "js",
  "jsx",
  "py",
  "go",
  "rs",
  "java",
  "c",
  "cpp",
  "h",
  "json",
  "yaml",
  "yml",
  "toml",
  "css",
  "html",
  "sql",
] as const;

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/zip",
  "application/x-zip-compressed",
  "text/markdown",
  "text/plain",
  "text/javascript",
  "application/javascript",
  "application/typescript",
  "text/typescript",
  "text/x-python",
  "application/json",
  "text/css",
  "text/html",
  "text/x-sql",
  "application/octet-stream",
] as const;

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;
export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
