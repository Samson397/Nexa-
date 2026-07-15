/**
 * Ephemeral in-memory store for API stubs when no database is configured.
 * Data is process-local and resets on restart — never use for production.
 */

export type DemoTask = {
  id: string;
  title: string;
  description?: string;
  workspaceId?: string;
  projectId?: string;
  status: string;
  priority: string;
  assigneeId?: string;
  createdById?: string;
  dueDate?: string;
  completedAt?: string;
  aiSummary?: string;
  checklist?: Array<{ id: string; text: string; done: boolean }>;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
};

export type DemoAutomation = {
  id: string;
  name: string;
  description?: string;
  workspaceId?: string;
  createdById?: string;
  isEnabled: boolean;
  approvalMode: string;
  trigger: { type: string; config: Record<string, unknown> };
  steps: Array<{
    id: string;
    type: string;
    config: Record<string, unknown>;
    requiresApproval?: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
  pendingRuns: Array<{
    id: string;
    status: string;
    triggerPayload?: Record<string, unknown>;
    result?: Record<string, unknown>;
    errorMessage?: string;
    createdAt: string;
    approvedAt?: string;
    approvedBy?: string;
    startedAt?: string;
    finishedAt?: string;
  }>;
};

export type DemoDevice = {
  id: string;
  userId?: string;
  name: string;
  type: string;
  platform?: string;
  approvedPaths: string[];
  permissions: string[];
  pushToken?: string;
  metadata?: Record<string, unknown>;
  isOnline: boolean;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type DemoMemory = {
  id: string;
  content: string;
  workspaceId?: string;
  userId?: string;
  agentId?: string;
  importance: number;
  source?: string;
  metadata?: Record<string, unknown>;
  /** 1536-d unit vector used for in-memory cosine search */
  embedding?: number[];
  createdAt: string;
};

export type DemoPasskey = {
  id: string;
  userId: string;
  credentialId: string;
  /** base64url-encoded public key bytes */
  publicKey: string;
  counter: number;
  transports?: string[];
  deviceType?: string;
  backedUp?: boolean;
  name?: string;
  createdAt: string;
};

export type DemoWebAuthnChallenge = {
  challenge: string;
  userId?: string;
  type: "registration" | "authentication";
  expiresAt: number;
};

export type DemoIntegration = {
  id: string;
  userId: string;
  workspaceId?: string;
  provider: string;
  status: "connected" | "disconnected" | "error" | "pending";
  /** Encrypted (or demo-prefixed) OAuth credential payload */
  encryptedCredentials?: string;
  scopes: string[];
  accountLabel?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type DemoOAuthState = {
  state: string;
  provider: string;
  userId: string;
  workspaceId?: string;
  redirectUri: string;
  codeVerifier?: string;
  expiresAt: number;
};

export type DemoNote = {
  id: string;
  userId: string;
  workspaceId?: string;
  folderId?: string;
  title: string;
  content: Record<string, unknown>;
  plainText: string;
  tags: string[];
  aiSummary?: string;
  createdAt: string;
  updatedAt: string;
};

export type DemoCalendarEvent = {
  id: string;
  userId: string;
  workspaceId?: string;
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  externalId?: string;
  externalProvider?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type DemoEmailMessage = {
  id: string;
  userId: string;
  provider?: string;
  from: string;
  to: string[];
  subject: string;
  snippet: string;
  body?: string;
  isDraft: boolean;
  sent: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DemoConversation = {
  id: string;
  workspaceId: string;
  userId: string;
  agentId?: string;
  title: string;
  provider: string;
  model: string;
  metadata?: Record<string, unknown>;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type DemoMessage = {
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
  tokenCount?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type DemoKnowledgeDocument = {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  sizeBytes: number;
  status: "pending" | "processing" | "indexed" | "failed";
  chunkCount: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type DemoKnowledgeChunk = {
  id: string;
  documentId: string;
  workspaceId: string;
  content: string;
  embedding?: number[];
  chunkIndex: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type DemoAuditEntry = {
  id: string;
  workspaceId?: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

type DemoStoreState = {
  tasks: DemoTask[];
  automations: DemoAutomation[];
  devices: DemoDevice[];
  memories: DemoMemory[];
  passkeys: DemoPasskey[];
  webauthnChallenges: DemoWebAuthnChallenge[];
  integrations: DemoIntegration[];
  oauthStates: DemoOAuthState[];
  notes: DemoNote[];
  calendarEvents: DemoCalendarEvent[];
  emails: DemoEmailMessage[];
  conversations: DemoConversation[];
  messages: DemoMessage[];
  knowledgeDocuments: DemoKnowledgeDocument[];
  knowledgeChunks: DemoKnowledgeChunk[];
  auditEntries: DemoAuditEntry[];
};

const g = globalThis as typeof globalThis & {
  __nexaDemoStore?: DemoStoreState;
};

function store(): DemoStoreState {
  if (!g.__nexaDemoStore) {
    g.__nexaDemoStore = {
      tasks: [],
      automations: [],
      devices: [],
      memories: [],
      passkeys: [],
      webauthnChallenges: [],
      integrations: [],
      oauthStates: [],
      notes: [],
      calendarEvents: [],
      emails: [],
      conversations: [],
      messages: [],
      knowledgeDocuments: [],
      knowledgeChunks: [],
      auditEntries: [],
    };
  }
  // Backfill keys for hot-reload / older in-memory shapes
  const s = g.__nexaDemoStore;
  s.passkeys ??= [];
  s.webauthnChallenges ??= [];
  s.integrations ??= [];
  s.oauthStates ??= [];
  s.notes ??= [];
  s.calendarEvents ??= [];
  s.emails ??= [];
  s.conversations ??= [];
  s.messages ??= [];
  s.knowledgeDocuments ??= [];
  s.knowledgeChunks ??= [];
  s.auditEntries ??= [];
  return s;
}

export const demoStore = {
  tasks: () => store().tasks,
  automations: () => store().automations,
  devices: () => store().devices,
  memories: () => store().memories,
  passkeys: () => store().passkeys,
  webauthnChallenges: () => store().webauthnChallenges,
  integrations: () => store().integrations,
  oauthStates: () => store().oauthStates,
  notes: () => store().notes,
  calendarEvents: () => store().calendarEvents,
  emails: () => store().emails,
  conversations: () => store().conversations,
  messages: () => store().messages,
  knowledgeDocuments: () => store().knowledgeDocuments,
  knowledgeChunks: () => store().knowledgeChunks,
  auditEntries: () => store().auditEntries,
};
