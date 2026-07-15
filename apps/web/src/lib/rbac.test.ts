import { describe, expect, it } from "vitest";
import {
  canAssignRole,
  getPermissions,
  hasMinimumRole,
  hasPermission,
  isAdmin,
  isOwner,
  roleRank,
} from "./rbac";

describe("rbac permission matrix", () => {
  it("orders roles owner > admin > member > viewer", () => {
    expect(roleRank("owner")).toBeGreaterThan(roleRank("admin"));
    expect(roleRank("admin")).toBeGreaterThan(roleRank("member"));
    expect(roleRank("member")).toBeGreaterThan(roleRank("viewer"));
    expect(hasMinimumRole("admin", "member")).toBe(true);
    expect(hasMinimumRole("viewer", "member")).toBe(false);
  });

  it("grants viewer read-only basics", () => {
    expect(hasPermission("viewer", "workspace.read")).toBe(true);
    expect(hasPermission("viewer", "chat.read")).toBe(true);
    expect(hasPermission("viewer", "chat.write")).toBe(false);
    expect(hasPermission("viewer", "automations.approve")).toBe(false);
    expect(hasPermission("viewer", "billing.manage")).toBe(false);
  });

  it("grants member write chat/files but not admin ops", () => {
    expect(hasPermission("member", "chat.write")).toBe(true);
    expect(hasPermission("member", "agents.run")).toBe(true);
    expect(hasPermission("member", "files.write")).toBe(true);
    expect(hasPermission("member", "integrations.manage")).toBe(false);
    expect(hasPermission("member", "automations.approve")).toBe(false);
  });

  it("grants admin approve/manage without owner-only billing", () => {
    expect(isAdmin("admin")).toBe(true);
    expect(hasPermission("admin", "automations.approve")).toBe(true);
    expect(hasPermission("admin", "integrations.manage")).toBe(true);
    expect(hasPermission("admin", "workspace.delete")).toBe(false);
    expect(hasPermission("admin", "billing.manage")).toBe(false);
  });

  it("grants owner full matrix including billing", () => {
    expect(isOwner("owner")).toBe(true);
    expect(hasPermission("owner", "billing.manage")).toBe(true);
    expect(hasPermission("owner", "workspace.delete")).toBe(true);
    expect(getPermissions("owner").length).toBeGreaterThan(
      getPermissions("admin").length,
    );
  });

  it("restricts role assignment elevation", () => {
    expect(canAssignRole("admin", "member")).toBe(true);
    expect(canAssignRole("admin", "owner")).toBe(false);
    expect(canAssignRole("owner", "owner")).toBe(true);
    expect(canAssignRole("member", "viewer")).toBe(false);
  });
});
