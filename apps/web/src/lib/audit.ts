import type { AuditAction } from "@nexa/shared";
import { logger } from "@/lib/logger";

export interface AuditEvent {
  action: AuditAction;
  actorId?: string | null;
  workspaceId?: string | null;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  success?: boolean;
  timestamp?: string;
}

/**
 * Write a structured audit event.
 * Persists via console/structured logger when no DB sink is configured.
 * Swap the body for a DB insert once the audit table client is wired.
 */
export async function writeAuditLog(event: AuditEvent): Promise<void> {
  const record = {
    type: "audit" as const,
    action: event.action,
    actorId: event.actorId ?? null,
    workspaceId: event.workspaceId ?? null,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    metadata: event.metadata ?? {},
    ip: event.ip,
    userAgent: event.userAgent,
    success: event.success ?? true,
    timestamp: event.timestamp ?? new Date().toISOString(),
  };

  // TODO: insert into audit_logs via @nexa/db when available
  logger.info("audit.event", record);
}

export function audit(
  action: AuditAction,
  partial: Omit<AuditEvent, "action"> = {},
): Promise<void> {
  return writeAuditLog({ action, ...partial });
}
