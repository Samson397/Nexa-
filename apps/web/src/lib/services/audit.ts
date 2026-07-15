import type { AuditAction } from "@nexa/shared";
import { auditLogs } from "@nexa/db";
import { writeAuditLog } from "@/lib/audit";
import { tryGetDb } from "@/lib/db";
import { demoStore, type DemoAuditEntry } from "@/lib/demo-store";
import { newId } from "@/lib/services/ids";

export type WriteAuditInput = {
  workspaceId?: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Persist an audit event to `audit_logs` when DB is available.
 * Falls back to `@/lib/audit` structured logger (+ demo store) otherwise.
 */
export async function writeAudit(input: WriteAuditInput): Promise<void> {
  const db = tryGetDb();

  if (!db) {
    const entry: DemoAuditEntry = {
      id: newId(),
      workspaceId: input.workspaceId,
      userId: input.userId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      ipAddress: input.ip,
      userAgent: input.userAgent,
      metadata: input.metadata ?? {},
      createdAt: new Date().toISOString(),
    };
    demoStore.auditEntries().unshift(entry);

    await writeAuditLog({
      action: input.action as AuditAction,
      actorId: input.userId,
      workspaceId: input.workspaceId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: input.metadata,
      ip: input.ip,
      userAgent: input.userAgent,
    });
    return;
  }

  await db.insert(auditLogs).values({
    workspaceId: input.workspaceId,
    userId: input.userId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    ipAddress: input.ip,
    userAgent: input.userAgent,
    metadata: input.metadata ?? {},
  });
}
