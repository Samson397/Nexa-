import { eq } from "drizzle-orm";
import {
  profiles,
  workspaces,
  workspaceMembers,
} from "@nexa/db";
import { slugify } from "@nexa/shared";
import { tryGetDb } from "@/lib/db";
import { deterministicId } from "@/lib/services/ids";

export type EnsureUserWorkspaceResult = {
  profileId: string;
  workspaceId: string;
};

/**
 * Ensure a profile + default personal workspace exist for a Supabase auth user.
 * When DATABASE_URL is set, upserts into profiles / workspaces / workspace_members.
 * Otherwise returns deterministic demo ids derived from the supabase user id.
 */
export async function ensureUserWorkspace(
  supabaseUserId: string,
  email: string,
  displayName?: string,
): Promise<EnsureUserWorkspaceResult> {
  const db = tryGetDb();

  if (!db) {
    const profileId = deterministicId("profile", supabaseUserId);
    const workspaceId = deterministicId("workspace", supabaseUserId);
    return { profileId, workspaceId };
  }

  const existing = await db
    .select()
    .from(profiles)
    .where(eq(profiles.supabaseUserId, supabaseUserId))
    .limit(1);

  let profileId: string;

  if (existing[0]) {
    profileId = existing[0].id;
    if (displayName && existing[0].displayName !== displayName) {
      await db
        .update(profiles)
        .set({
          displayName,
          email,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, profileId));
    }
  } else {
    const inserted = await db
      .insert(profiles)
      .values({
        supabaseUserId,
        email,
        displayName: displayName ?? email.split("@")[0] ?? "User",
      })
      .returning({ id: profiles.id });
    profileId = inserted[0]!.id;
  }

  const owned = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.ownerId, profileId))
    .limit(1);

  let workspaceId: string;

  if (owned[0]) {
    workspaceId = owned[0].id;
  } else {
    const baseSlug =
      slugify(displayName ?? email.split("@")[0] ?? "workspace") || "workspace";
    const slug = `${baseSlug}-${supabaseUserId.replace(/-/g, "").slice(0, 8)}`;
    const name =
      displayName && displayName.length > 0
        ? `${displayName}'s Workspace`
        : "Personal Workspace";

    const created = await db
      .insert(workspaces)
      .values({
        name,
        slug,
        ownerId: profileId,
      })
      .returning({ id: workspaces.id });
    workspaceId = created[0]!.id;

    await db.insert(workspaceMembers).values({
      workspaceId,
      userId: profileId,
      role: "owner",
    });
  }

  return { profileId, workspaceId };
}
