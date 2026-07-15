import type { UserRole } from "@nexa/shared";

/**
 * Role hierarchy (highest → lowest): owner > admin > member > viewer
 */
const ROLE_RANK: Record<UserRole, number> = {
  owner: 40,
  admin: 30,
  member: 20,
  viewer: 10,
};

export type Permission =
  | "workspace.read"
  | "workspace.update"
  | "workspace.delete"
  | "members.read"
  | "members.invite"
  | "members.update_role"
  | "members.remove"
  | "chat.read"
  | "chat.write"
  | "agents.run"
  | "integrations.read"
  | "integrations.manage"
  | "automations.read"
  | "automations.manage"
  | "automations.approve"
  | "files.read"
  | "files.write"
  | "files.delete"
  | "settings.read"
  | "settings.update"
  | "billing.manage"
  | "audit.read";

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  viewer: [
    "workspace.read",
    "members.read",
    "chat.read",
    "integrations.read",
    "automations.read",
    "files.read",
    "settings.read",
  ],
  member: [
    "workspace.read",
    "members.read",
    "chat.read",
    "chat.write",
    "agents.run",
    "integrations.read",
    "automations.read",
    "files.read",
    "files.write",
    "settings.read",
  ],
  admin: [
    "workspace.read",
    "workspace.update",
    "members.read",
    "members.invite",
    "members.update_role",
    "members.remove",
    "chat.read",
    "chat.write",
    "agents.run",
    "integrations.read",
    "integrations.manage",
    "automations.read",
    "automations.manage",
    "automations.approve",
    "files.read",
    "files.write",
    "files.delete",
    "settings.read",
    "settings.update",
    "audit.read",
  ],
  owner: [
    "workspace.read",
    "workspace.update",
    "workspace.delete",
    "members.read",
    "members.invite",
    "members.update_role",
    "members.remove",
    "chat.read",
    "chat.write",
    "agents.run",
    "integrations.read",
    "integrations.manage",
    "automations.read",
    "automations.manage",
    "automations.approve",
    "files.read",
    "files.write",
    "files.delete",
    "settings.read",
    "settings.update",
    "billing.manage",
    "audit.read",
  ],
};

export function roleRank(role: UserRole): number {
  return ROLE_RANK[role];
}

/** True if `role` is at least as privileged as `minimum`. */
export function hasMinimumRole(role: UserRole, minimum: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function getPermissions(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasAllPermissions(
  role: UserRole,
  permissions: readonly Permission[],
): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function hasAnyPermission(
  role: UserRole,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function assertPermission(
  role: UserRole,
  permission: Permission,
): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Forbidden: role "${role}" lacks "${permission}"`);
  }
}

export function isOwner(role: UserRole): boolean {
  return role === "owner";
}

export function isAdmin(role: UserRole): boolean {
  return hasMinimumRole(role, "admin");
}

export function isMember(role: UserRole): boolean {
  return hasMinimumRole(role, "member");
}

export function isViewer(role: UserRole): boolean {
  return hasMinimumRole(role, "viewer");
}

/** Whether `actor` may assign `targetRole` (cannot elevate above self). */
export function canAssignRole(actor: UserRole, targetRole: UserRole): boolean {
  if (!hasPermission(actor, "members.update_role")) return false;
  if (targetRole === "owner") return actor === "owner";
  return ROLE_RANK[actor] >= ROLE_RANK[targetRole];
}
