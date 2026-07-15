import {
  handleRouteError,
  jsonOk,
  newId,
  parseBody,
  rateLimitByIp,
  requireAuth,
} from "@/lib/api";
import { emailDraftSchema } from "@/lib/validators";
import { demoStore, type DemoEmailMessage } from "@/lib/demo-store";
import {
  decryptTokens,
  getConnectedIntegration,
} from "@/lib/integrations/oauth";

export const runtime = "nodejs";

/**
 * POST /api/email/draft — create a draft (never send without approvedToSend).
 */
export async function POST(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "email-draft",
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const parsed = await parseBody(request, emailDraftSchema);
    if (parsed.error) return parsed.error;

    const { to, subject, body = "", approvedToSend, provider } = parsed.data;

    // This endpoint only creates drafts. Sending requires approvedToSend AND a
    // dedicated send path — we never send from draft creation alone.
    void approvedToSend;

    const now = new Date().toISOString();
    const draft: DemoEmailMessage = {
      id: newId(),
      userId: auth.user.id,
      provider,
      from: auth.user.email ?? "you@nexa.local",
      to,
      subject,
      snippet: body.slice(0, 160),
      body,
      isDraft: true,
      sent: false,
      createdAt: now,
      updatedAt: now,
    };

    // Attempt remote draft create when real tokens exist
    const chosen =
      (provider &&
        getConnectedIntegration(auth.user.id, provider)) ||
      getConnectedIntegration(auth.user.id, "gmail") ||
      getConnectedIntegration(auth.user.id, "outlook");

    let remoteId: string | undefined;
    if (
      chosen?.encryptedCredentials &&
      !chosen.metadata?.demo &&
      chosen.provider === "gmail"
    ) {
      try {
        const tokens = decryptTokens(chosen.encryptedCredentials);
        const raw = [
          `To: ${to.join(", ")}`,
          `Subject: ${subject}`,
          "MIME-Version: 1.0",
          'Content-Type: text/plain; charset="UTF-8"',
          "",
          body,
        ].join("\r\n");
        const encoded = Buffer.from(raw)
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");
        const res = await fetch(
          "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: { raw: encoded } }),
          },
        );
        if (res.ok) {
          const json = (await res.json()) as { id?: string };
          remoteId = json.id;
        }
      } catch {
        // keep local draft
      }
    }

    demoStore.emails().unshift(draft);

    return jsonOk(
      {
        ok: true,
        draft: {
          id: draft.id,
          remoteId,
          to: draft.to,
          subject: draft.subject,
          isDraft: true,
          sent: false,
          createdAt: draft.createdAt,
        },
        message: "Draft saved. Explicit approval required before any send.",
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
