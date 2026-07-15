"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { apiJson } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type EmailItem = {
  id: string;
  from: string;
  subject: string;
  preview: string;
  time: string;
  priority: boolean;
  body: string;
};

const MOCK_INBOX: EmailItem[] = [
  {
    id: "e1",
    from: "Maya Chen · Helix Labs",
    subject: "Re: Helix Labs renewal terms",
    preview: "Can we discuss seat volume at 180?",
    time: "18m",
    priority: true,
    body: "Hi Avery,\n\nWe'd like to move to 180 seats if we can improve the per-seat rate. Also looping legal on the OEM language.\n\nBest,\nMaya",
  },
  {
    id: "e2",
    from: "Stripe Notifications",
    subject: "Invoice discrepancy — export ready",
    preview: "Your June export is available…",
    time: "1h",
    priority: true,
    body: "A payout mismatch was detected on two invoices totaling $4,220. Download the export from Stripe dashboard.",
  },
  {
    id: "e3",
    from: "Jordan Hale",
    subject: "Ops automation checklist",
    preview: "Approval gates look good — one tweak…",
    time: "3h",
    priority: false,
    body: "Please keep send_email on always-approve for the invoice chase flow.",
  },
  {
    id: "e4",
    from: "Notion",
    subject: "Workspace digest",
    preview: "12 updates across Product…",
    time: "Yesterday",
    priority: false,
    body: "Your weekly Notion digest is ready.",
  },
];

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${Math.max(1, m)}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return "Yesterday";
}

export default function EmailPage() {
  const [inbox, setInbox] = useState<EmailItem[]>(MOCK_INBOX);
  const [activeId, setActiveId] = useState(MOCK_INBOX[0]!.id);
  const [reply, setReply] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [providerLabel, setProviderLabel] = useState("Gmail · demo data");
  const active = inbox.find((item) => item.id === activeId) ?? inbox[0]!;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiJson<{
          items: Array<{
            id: string;
            from: string;
            subject: string;
            snippet?: string;
            createdAt?: string;
            body?: string;
            isDraft?: boolean;
          }>;
          provider?: string | null;
          mock?: boolean;
        }>("/api/email");
        if (cancelled || !data.items?.length) return;
        const mapped = data.items.map((m, i) => ({
          id: m.id,
          from: m.from || "Unknown",
          subject: m.subject || "(no subject)",
          preview: m.snippet || "",
          time: relativeTime(m.createdAt) || `${i + 1}h`,
          priority: i < 2,
          body: m.body || m.snippet || "",
        }));
        setInbox(mapped);
        setActiveId(mapped[0]!.id);
        setProviderLabel(
          data.mock
            ? `${data.provider ?? "Inbox"} · demo data`
            : `${data.provider ?? "Inbox"} · live`,
        );
      } catch {
        // keep mocks
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function draftReply() {
    setDrafting(true);
    try {
      const data = await apiJson<{
        draft: { subject: string; to: string[] };
        message?: string;
      }>("/api/email/draft", {
        method: "POST",
        body: JSON.stringify({
          to: ["reply@example.com"],
          subject: `Re: ${active.subject}`,
          body: `Thanks for your note on "${active.subject}". I'll follow up with next steps today.`,
          provider: "gmail",
        }),
      });
      setReply(
        `Thanks for your note on "${active.subject}". I'll follow up with next steps today.\n\n(Draft saved${data.draft ? ` · ${data.draft.subject}` : ""})`,
      );
    } catch {
      setReply(
        "Thanks Maya — happy to explore 180 seats. I'll share a revised quote today and flag OEM language for Legal before our call.",
      );
    } finally {
      setDrafting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
            Email
          </h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            OAuth-only inbox access — NEXA never asks for email passwords.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            Connect Gmail
          </Button>
          <Button variant="outline" size="sm">
            Connect Outlook
          </Button>
          <Button
            size="sm"
            variant="soft"
            onClick={() =>
              setSummary(
                `Inbox summary: ${inbox.length} threads loaded; prioritize replies on flagged items first.`,
              )
            }
          >
            <Sparkles />
            Summarize inbox
          </Button>
        </div>
      </div>

      {summary ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent"
        >
          {summary}
        </motion.div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
            <CardDescription>{providerLabel}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[560px]">
              <div className="space-y-1 px-3 pb-3">
                {inbox.map((message) => (
                  <button
                    key={message.id}
                    type="button"
                    onClick={() => {
                      setActiveId(message.id);
                      setReply("");
                    }}
                    className={cn(
                      "w-full rounded-xl px-3 py-3 text-left transition-colors",
                      activeId === message.id
                        ? "bg-accent-soft"
                        : "hover:bg-muted/70",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {message.from}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {message.time}
                      </span>
                    </div>
                    <p className="truncate text-sm">{message.subject}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {message.preview}
                    </p>
                    {message.priority ? (
                      <Badge className="mt-2" variant="warning">
                        Priority
                      </Badge>
                    ) : null}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="min-h-[560px]">
          <CardHeader>
            <CardTitle>{active.subject}</CardTitle>
            <CardDescription>{active.from}</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-4 pt-4">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
              {active.body}
            </pre>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Draft reply</p>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={drafting}
                  onClick={() => void draftReply()}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {drafting ? "Drafting…" : "AI draft"}
                </Button>
              </div>
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a reply… sending requires your approval."
                className="min-h-[140px]"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => void draftReply()}
                  disabled={drafting}
                >
                  Save draft
                </Button>
                <Button>Send (approval)</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
