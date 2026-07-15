export { hasDatabase, getDb, tryGetDb } from "@/lib/db";

export {
  ensureUserWorkspace,
  type EnsureUserWorkspaceResult,
} from "@/lib/services/workspace";

export {
  embedTexts,
  cosineSimilarity,
  chunkText,
  pseudoEmbedding,
  EMBEDDING_DIMS,
  EMBEDDING_MODEL,
} from "@/lib/services/embeddings";

export {
  storeMemory,
  searchMemories,
  type StoreMemoryInput,
  type StoreMemoryResult,
  type SearchMemoriesInput,
  type MemorySearchHit,
} from "@/lib/services/memory";

export {
  indexDocument,
  searchKnowledge,
  canExtractPlainText,
  type IndexDocumentInput,
  type IndexDocumentResult,
  type SearchKnowledgeInput,
  type KnowledgeSearchHit,
} from "@/lib/services/knowledge";

export {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  type ListTasksInput,
  type CreateTaskInput,
  type UpdateTaskInput,
  type TaskRecord,
} from "@/lib/services/tasks";

export {
  listConversations,
  createConversation,
  getConversation,
  addMessage,
  listMessages,
  type ConversationRecord,
  type MessageRecord,
  type CreateConversationInput,
  type AddMessageInput,
} from "@/lib/services/conversations";

export { writeAudit, type WriteAuditInput } from "@/lib/services/audit";

export {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  type NoteRecord,
  type CreateNoteInput,
  type UpdateNoteInput,
} from "@/lib/services/notes";

export {
  listCalendarEvents,
  getCalendarEvent,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  type CalendarEventRecord,
  type CreateCalendarEventInput,
  type UpdateCalendarEventInput,
} from "@/lib/services/calendar";

export {
  listDevices,
  registerDevice,
  type DeviceRecord,
  type RegisterDeviceInput,
} from "@/lib/services/devices";

export {
  listAutomations,
  getAutomation,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  enqueueRun,
  approveRun,
  executeRun,
  listRuns,
  normalizeSteps,
  isSensitiveStepType,
  type AutomationRecord,
  type CreateAutomationInput,
  type UpdateAutomationInput,
} from "@/lib/services/automations";

export {
  enqueueRun as enqueueAutomationRun,
  approveRun as approveAutomationRun,
  executeRun as executeAutomationRun,
  type AutomationStep,
  type AutomationRunRecord,
} from "@/lib/services/automation-engine";

export { newId, deterministicId } from "@/lib/services/ids";
