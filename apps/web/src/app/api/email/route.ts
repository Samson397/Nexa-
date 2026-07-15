import {
  handleRouteError,
  jsonOk,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import { demoStore } from "@/lib/demo-store";
import {
  decryptTokens,
  getConnectedIntegration,
} from "@/lib/integrations/oauth";

export const runtime = "nodejs";

const MOCK_INBOX = [
  {
    id: "mock-1",
    from: "ceo@acme.com",
    to: ["you@nexa.local"],
    subject: "Q3 planning kickoff",
    snippet: "Can we align on priorities before Thursday?",
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: "mock-2",
    from: "alerts@nexa.ai",
    to: ["you@nexa.local"],
    subject: "Automation awaiting approval",
    snippet: "Send weekly summary needs your sign-off.",
    createdAt: new Date(Date.now() - 7200_000).toISOString(),
  },
  {
    id: "mock-3",
    from: "legal@partner.io",
    to: ["you@nexa.local"],
    subject: "Updated MSA draft",
    snippet: "Attached the revised agreement for review.",
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
];

async function fetchGmailInbox(accessToken: string) {
  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Gmail API ${res.status}`);
  const list = (await res.json()) as {
    messages?: Array<{ id: string }>;
  };
  const messages = [];
  for (const m of (list.messages ?? []).slice(0, 10)) {
    const detail = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=To`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!detail.ok) continue;
    const body = (await detail.json()) as {
      id: string;
      snippet?: string;
      payload?: { headers?: Array<{ name: string; value: string }> };
      internalDate?: string;
    };
    const headers = body.payload?.headers ?? [];
    const get = (n: string) =>
      headers.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value ??
      "";
    messages.push({
      id: body.id,
      from: get("From"),
      to: get("To")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      subject: get("Subject"),
      snippet: body.snippet ?? "",
      createdAt: body.internalDate
        ? new Date(Number(body.internalDate)).toISOString()
        : new Date().toISOString(),
      provider: "gmail" as const,
    });
  }
  return messages;
}

async function fetchOutlookInbox(accessToken: string) {
  const res = await fetch(
    "https://graph.microsoft.com/v1.0/me/messages?$top=20&$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Microsoft Graph ${res.status}`);
  const data = (await res.json()) as {
    value?: Array<{
      id: string;
      subject?: string;
      bodyPreview?: string;
      from?: { emailAddress?: { address?: string } };
      toRecipients?: Array<{ emailAddress?: { address?: string } }>;
      receivedDateTime?: string;
    }>;
  };
  return (data.value ?? []).map((m) => ({
    id: m.id,
    from: m.from?.emailAddress?.address ?? "",
    to: (m.toRecipients ?? [])
      .map((t) => t.emailAddress?.address ?? "")
      .filter(Boolean),
    subject: m.subject ?? "",
    snippet: m.bodyPreview ?? "",
    createdAt: m.receivedDateTime ?? new Date().toISOString(),
    provider: "outlook" as const,
  }));
}

/**
 * GET /api/email — inbox from Gmail/Outlook when connected; else mock.
 */
export async function GET(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "email-list",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const gmail = getConnectedIntegration(auth.user.id, "gmail");
    const outlook = getConnectedIntegration(auth.user.id, "outlook");

    if (gmail?.encryptedCredentials && !gmail.metadata?.demo) {
      try {
        const tokens = decryptTokens(gmail.encryptedCredentials);
        const items = await fetchGmailInbox(tokens.access_token);
        return jsonOk({
          ok: true,
          provider: "gmail",
          items,
          total: items.length,
          mock: false,
        });
      } catch {
        // fall through to mock
      }
    }

    if (outlook?.encryptedCredentials && !outlook.metadata?.demo) {
      try {
        const tokens = decryptTokens(outlook.encryptedCredentials);
        const items = await fetchOutlookInbox(tokens.access_token);
        return jsonOk({
          ok: true,
          provider: "outlook",
          items,
          total: items.length,
          mock: false,
        });
      } catch {
        // fall through to mock
      }
    }

    const drafts = demoStore
      .emails()
      .filter((e) => e.userId === auth.user.id)
      .map((e) => ({
        id: e.id,
        from: e.from,
        to: e.to,
        subject: e.subject,
        snippet: e.snippet,
        createdAt: e.createdAt,
        isDraft: e.isDraft,
      }));

    return jsonOk({
      ok: true,
      provider: gmail ? "gmail" : outlook ? "outlook" : null,
      items: [...drafts, ...MOCK_INBOX],
      total: drafts.length + MOCK_INBOX.length,
      mock: true,
      connected: Boolean(gmail || outlook),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
