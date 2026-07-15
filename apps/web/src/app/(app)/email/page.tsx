"use client";

import { useState } from "react";
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
import { cn } from "@/lib/utils";

const inbox = [
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

export default function EmailPage() {
  const [activeId, setActiveId] = useState(inbox[0].id);
  const [reply, setReply] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const active = inbox.find((item) => item.id === activeId) ?? inbox[0];

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
                "Inbox summary: 2 renewal threads need replies today; 1 finance export to triage; low-priority digests can wait.",
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
            <CardDescription>Gmail · demo data</CardDescription>
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
                  onClick={() =>
                    setReply(
                      "Thanks Maya — happy to explore 180 seats. I'll share a revised quote today and flag OEM language for Legal before our call.",
                    )
                  }
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  AI draft
                </Button>
              </div>
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a reply… sending requires your approval."
                className="min-h-[140px]"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline">Save draft</Button>
                <Button>Send (approval)</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
