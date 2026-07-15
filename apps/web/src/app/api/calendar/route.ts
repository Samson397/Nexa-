import {
  handleRouteError,
  jsonOk,
  newId,
  parseBody,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import { createCalendarEventSchema } from "@/lib/validators";
import { demoStore, type DemoCalendarEvent } from "@/lib/demo-store";
import {
  decryptTokens,
  getConnectedIntegration,
} from "@/lib/integrations/oauth";
import { tryGetDb } from "@/lib/db";
import { calendarEvents } from "@nexa/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const MOCK_EVENTS: Omit<
  DemoCalendarEvent,
  "userId" | "createdAt" | "updatedAt"
>[] = [
  {
    id: "evt-mock-1",
    title: "Morning briefing",
    description: "NEXA daily standup with CEO agent",
    startAt: new Date(Date.now() + 3600_000).toISOString(),
    endAt: new Date(Date.now() + 5400_000).toISOString(),
    allDay: false,
    location: "NEXA HQ",
  },
  {
    id: "evt-mock-2",
    title: "Integrations review",
    description: "OAuth provider status check",
    startAt: new Date(Date.now() + 86_400_000).toISOString(),
    endAt: new Date(Date.now() + 90_000_000).toISOString(),
    allDay: false,
  },
];

/**
 * GET /api/calendar — list events from DB / external / mock.
 */
export async function GET(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "calendar-list",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const db = tryGetDb();
    if (db) {
      try {
        const rows = await db
          .select()
          .from(calendarEvents)
          .where(eq(calendarEvents.userId, auth.user.id))
          .limit(100);
        if (rows.length > 0) {
          return jsonOk({
            ok: true,
            items: rows.map((r) => ({
              id: r.id,
              title: r.title,
              description: r.description,
              location: r.location,
              startAt: r.startAt.toISOString(),
              endAt: r.endAt.toISOString(),
              allDay: r.allDay,
              externalProvider: r.externalProvider,
            })),
            total: rows.length,
            source: "database",
          });
        }
      } catch {
        // fall through
      }
    }

    const googleCal = getConnectedIntegration(
      auth.user.id,
      "google_calendar",
    );
    if (googleCal?.encryptedCredentials && !googleCal.metadata?.demo) {
      try {
        const tokens = decryptTokens(googleCal.encryptedCredentials);
        const res = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=25&singleEvents=true&orderBy=startTime&timeMin=" +
            encodeURIComponent(new Date().toISOString()),
          { headers: { Authorization: `Bearer ${tokens.access_token}` } },
        );
        if (res.ok) {
          const data = (await res.json()) as {
            items?: Array<{
              id: string;
              summary?: string;
              description?: string;
              location?: string;
              start?: { dateTime?: string; date?: string };
              end?: { dateTime?: string; date?: string };
            }>;
          };
          const items = (data.items ?? []).map((e) => ({
            id: e.id,
            title: e.summary ?? "(no title)",
            description: e.description,
            location: e.location,
            startAt: e.start?.dateTime ?? e.start?.date ?? "",
            endAt: e.end?.dateTime ?? e.end?.date ?? "",
            allDay: Boolean(e.start?.date && !e.start?.dateTime),
            externalProvider: "google_calendar",
          }));
          return jsonOk({
            ok: true,
            items,
            total: items.length,
            source: "google_calendar",
          });
        }
      } catch {
        // fall through
      }
    }

    const local = demoStore
      .calendarEvents()
      .filter((e) => e.userId === auth.user.id);
    const now = new Date().toISOString();
    const items =
      local.length > 0
        ? local
        : MOCK_EVENTS.map((e) => ({
            ...e,
            userId: auth.user.id,
            createdAt: now,
            updatedAt: now,
          }));

    return jsonOk({
      ok: true,
      items,
      total: items.length,
      source: local.length > 0 ? "demo-store" : "mock",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * POST /api/calendar — create an event.
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "calendar-create",
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const parsed = await parseBody(request, createCalendarEventSchema);
    if (parsed.error) return parsed.error;

    const data = parsed.data;
    const now = new Date().toISOString();
    const event: DemoCalendarEvent = {
      id: newId(),
      userId: auth.user.id,
      workspaceId: data.workspaceId,
      title: data.title,
      description: data.description,
      location: data.location,
      startAt: data.startAt,
      endAt: data.endAt,
      allDay: data.allDay ?? false,
      createdAt: now,
      updatedAt: now,
    };

    demoStore.calendarEvents().unshift(event);

    const db = tryGetDb();
    if (db && data.workspaceId) {
      try {
        await db.insert(calendarEvents).values({
          workspaceId: data.workspaceId,
          userId: auth.user.id,
          title: event.title,
          description: event.description,
          location: event.location,
          startAt: new Date(event.startAt),
          endAt: new Date(event.endAt),
          allDay: event.allDay,
        });
      } catch {
        // keep demo-store
      }
    }

    return jsonOk({ ok: true, event }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
