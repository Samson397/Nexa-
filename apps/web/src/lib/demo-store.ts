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
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type DemoAutomation = {
  id: string;
  name: string;
  description?: string;
  workspaceId?: string;
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
    createdAt: string;
    approvedAt?: string;
    approvedBy?: string;
  }>;
};

export type DemoDevice = {
  id: string;
  name: string;
  type: string;
  platform?: string;
  approvedPaths: string[];
  permissions: string[];
  pushToken?: string;
  metadata?: Record<string, unknown>;
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DemoMemory = {
  id: string;
  content: string;
  workspaceId?: string;
  agentId?: string;
  importance: number;
  source?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

const g = globalThis as typeof globalThis & {
  __nexaDemoStore?: {
    tasks: DemoTask[];
    automations: DemoAutomation[];
    devices: DemoDevice[];
    memories: DemoMemory[];
  };
};

function store() {
  if (!g.__nexaDemoStore) {
    g.__nexaDemoStore = {
      tasks: [],
      automations: [],
      devices: [],
      memories: [],
    };
  }
  return g.__nexaDemoStore;
}

export const demoStore = {
  tasks: () => store().tasks,
  automations: () => store().automations,
  devices: () => store().devices,
  memories: () => store().memories,
};
