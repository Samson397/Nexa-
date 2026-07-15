"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bell,
  Calendar,
  CheckCircle2,
  FileText,
  Mail,
  MonitorSmartphone,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

export function DailyBriefing() {
  return (
    <motion.div {...fadeUp} transition={{ duration: 0.45 }}>
      <Card className="overflow-hidden nexa-glow border-accent/25 bg-gradient-to-br from-accent-soft via-glass to-glass">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <Badge>Morning briefing</Badge>
          </div>
          <CardTitle className="text-xl md:text-2xl">
            Focus: ship Q3 ops automation + close two renewals
          </CardTitle>
          <CardDescription>
            CEO Alex Rivera prepared this for Wed, Jul 15 · 3 blockers, 2
            approvals waiting, inbox clear except 4 priority threads.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/chat">Open AI briefing</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/tasks">Review priorities</Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function CalendarStrip() {
  const days = [
    { label: "Mon", events: 2 },
    { label: "Tue", events: 4 },
    { label: "Wed", events: 5, active: true },
    { label: "Thu", events: 1 },
    { label: "Fri", events: 3 },
    { label: "Sat", events: 0 },
    { label: "Sun", events: 0 },
  ];

  return (
    <motion.div {...fadeUp} transition={{ delay: 0.05, duration: 0.45 }}>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent" />
              This week
            </CardTitle>
            <CardDescription>Synced from Google + Outlook</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/calendar">Open</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => (
              <div
                key={day.label}
                className={cn(
                  "rounded-xl border border-border px-1 py-3 text-center",
                  day.active && "border-accent/40 bg-accent-soft",
                )}
              >
                <p className="text-[11px] text-muted-foreground">{day.label}</p>
                <p className="mt-1 font-display text-lg font-semibold">
                  {day.events}
                </p>
              </div>
            ))}
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex justify-between gap-3">
              <span>Ops stand-up</span>
              <span className="text-muted-foreground">10:00</span>
            </li>
            <li className="flex justify-between gap-3">
              <span>Renewal: Helix Labs</span>
              <span className="text-muted-foreground">14:30</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function TasksWidget() {
  const tasks = [
    { title: "Approve Slack publish draft", priority: "urgent", due: "Today" },
    { title: "Finalize automation for invoice chase", priority: "high", due: "Today" },
    { title: "Review legal pack for Nova", priority: "medium", due: "Thu" },
  ];

  return (
    <motion.div {...fadeUp} transition={{ delay: 0.1, duration: 0.45 }}>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              Priority tasks
            </CardTitle>
            <CardDescription>7 open · 2 overdue</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/tasks">Board</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.title}
              className="flex items-start justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground">Due {task.due}</p>
              </div>
              <Badge
                variant={
                  task.priority === "urgent"
                    ? "danger"
                    : task.priority === "high"
                      ? "warning"
                      : "secondary"
                }
              >
                {task.priority}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function RecentFilesWidget() {
  const files = [
    { name: "Q3_Ops_Playbook.pdf", meta: "Knowledge · 12m ago" },
    { name: "Helix_renewal.docx", meta: "Drive · 1h ago" },
    { name: "automation-spec.md", meta: "GitHub · Yesterday" },
  ];
  return (
    <motion.div {...fadeUp} transition={{ delay: 0.12, duration: 0.45 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-accent" />
            Recent files
          </CardTitle>
          <CardDescription>Across Drive, Dropbox, and Knowledge</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {files.map((file) => (
            <div key={file.name} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium">{file.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {file.meta}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function EmailsWidget() {
  return (
    <motion.div {...fadeUp} transition={{ delay: 0.14, duration: 0.45 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-accent" />
            Priority email
          </CardTitle>
          <CardDescription>OAuth inboxes only · no passwords stored</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium">Re: Helix Labs renewal terms</p>
            <p className="text-muted-foreground">Need counter on seat volume…</p>
          </div>
          <div>
            <p className="font-medium">Invoice discrepancy — Stripe export</p>
            <p className="text-muted-foreground">Finance agent drafted a reply</p>
          </div>
          <Button asChild size="sm" variant="outline" className="w-full">
            <Link href="/email">Summarize inbox</Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function NotificationsWidget() {
  return (
    <motion.div {...fadeUp} transition={{ delay: 0.16, duration: 0.45 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-accent" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="font-medium text-accent">Approval needed</span> —
            Social publish to LinkedIn
          </p>
          <p>
            <span className="font-medium">Desktop companion</span> — Waiting for
            path approval: ~/Projects/nexa
          </p>
          <p>
            <span className="font-medium">Automation</span> — Invoice chase ran
            successfully
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function RecommendationsWidget() {
  return (
    <motion.div {...fadeUp} transition={{ delay: 0.18, duration: 0.45 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            AI recommendations
          </CardTitle>
          <CardDescription>From your AI employees</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Move Helix renewal earlier — calendar conflict with product sync.</p>
          <p>Index the new Ops Playbook into Knowledge for Support agent.</p>
          <p>Enable passkey for Avery — two devices still password-only.</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function BusinessOverview() {
  const metrics = [
    { label: "MRR", value: "$186k", delta: "+4.2%" },
    { label: "Open deals", value: "12", delta: "3 closing" },
    { label: "Automations", value: "28", delta: "91% ok" },
    { label: "Agents online", value: "12/12", delta: "Healthy" },
  ];
  return (
    <motion.div {...fadeUp} transition={{ delay: 0.2, duration: 0.45 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            Business overview
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-border/70 px-3 py-3"
            >
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="font-display text-xl font-semibold">{metric.value}</p>
              <p className="text-xs text-accent">{metric.delta}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function DevicesServicesWidget() {
  return (
    <motion.div {...fadeUp} transition={{ delay: 0.22, duration: 0.45 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorSmartphone className="h-4 w-4 text-accent" />
            Devices & services
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span>MacBook Pro · Desktop</span>
            <Badge variant="success">Online</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>iPhone · Mobile</span>
            <Badge variant="success">Online</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Gmail + Drive</span>
            <Badge>Connected</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Slack workspace</span>
            <Badge variant="warning">Needs reauth</Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
