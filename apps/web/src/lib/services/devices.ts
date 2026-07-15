import { desc, eq } from "drizzle-orm";
import { devices } from "@nexa/db";
import { NexaError } from "@nexa/shared";
import { tryGetDb } from "@/lib/db";
import { demoStore, type DemoDevice } from "@/lib/demo-store";
import { newId } from "@/lib/services/ids";

export type DeviceRecord = {
  id: string;
  userId: string;
  name: string;
  type: string;
  platform?: string | null;
  approvedPaths: string[];
  permissions: string[];
  pushToken?: string | null;
  isOnline: boolean;
  lastSeenAt?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type RegisterDeviceInput = {
  userId: string;
  name: string;
  type: "web" | "desktop" | "ios" | "android" | string;
  platform?: string;
  approvedPaths?: string[];
  permissions?: string[];
  pushToken?: string;
  metadata?: Record<string, unknown>;
};

export async function listDevices(input: {
  userId: string;
}): Promise<{ items: DeviceRecord[]; demo: boolean }> {
  const db = tryGetDb();

  if (!db) {
    const items = demoStore
      .devices()
      .filter((d) => !d.userId || d.userId === input.userId)
      .map(fromDemo);
    return { items, demo: true };
  }

  const rows = await db
    .select()
    .from(devices)
    .where(eq(devices.userId, input.userId))
    .orderBy(desc(devices.updatedAt));

  return { items: rows.map(fromDb), demo: false };
}

export async function registerDevice(
  input: RegisterDeviceInput,
): Promise<{ device: DeviceRecord; demo: boolean }> {
  const name = input.name.trim();
  if (!name) {
    throw new NexaError("VALIDATION_ERROR", "Device name is required", {
      status: 400,
    });
  }

  const type = input.type as "web" | "desktop" | "ios" | "android";
  const allowed = ["web", "desktop", "ios", "android"];
  if (!allowed.includes(type)) {
    throw new NexaError("VALIDATION_ERROR", `Unsupported device type: ${type}`, {
      status: 400,
    });
  }

  const db = tryGetDb();

  if (!db) {
    const now = new Date().toISOString();
    const device: DemoDevice = {
      id: newId(),
      userId: input.userId,
      name,
      type,
      platform: input.platform,
      approvedPaths: input.approvedPaths ?? [],
      permissions: input.permissions ?? [],
      pushToken: input.pushToken,
      metadata: input.metadata ?? {},
      isOnline: true,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    };
    demoStore.devices().unshift(device);
    return { device: fromDemo(device), demo: true };
  }

  const inserted = await db
    .insert(devices)
    .values({
      userId: input.userId,
      name,
      type,
      platform: input.platform,
      approvedPaths: input.approvedPaths ?? [],
      permissions: input.permissions ?? [],
      pushToken: input.pushToken,
      metadata: input.metadata ?? {},
      isOnline: true,
      lastSeenAt: new Date(),
    })
    .returning();

  return { device: fromDb(inserted[0]!), demo: false };
}

function fromDemo(d: DemoDevice): DeviceRecord {
  return {
    id: d.id,
    userId: d.userId ?? "",
    name: d.name,
    type: d.type,
    platform: d.platform,
    approvedPaths: d.approvedPaths,
    permissions: d.permissions,
    pushToken: d.pushToken,
    isOnline: d.isOnline,
    lastSeenAt: d.lastSeenAt,
    metadata: d.metadata,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

function fromDb(row: typeof devices.$inferSelect): DeviceRecord {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    type: row.type,
    platform: row.platform,
    approvedPaths: row.approvedPaths ?? [],
    permissions: row.permissions ?? [],
    pushToken: row.pushToken,
    isOnline: row.isOnline,
    lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
