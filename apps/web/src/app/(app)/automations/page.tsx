"use client";

import { motion } from "framer-motion";
import {
  GitBranch,
  Mail,
  ShieldAlert,
  Sparkles,
  Webhook,
  Zap,
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

const workflows = [
  {
    name: "Invoice chase (approved send)",
    status: "active",
    runs: 128,
    approvals: "always",
  },
  {
    name: "Renewal risk briefing",
    status: "active",
    runs: 42,
    approvals: "sensitive_only",
  },
  {
    name: "Social draft → LinkedIn",
    status: "paused",
    runs: 19,
    approvals: "always",
  },
];

const nodes = [
  {
    id: "trigger",
    label: "Trigger",
    detail: "invoice.aging > 7d",
    icon: Webhook,
    x: "8%",
    y: "28%",
  },
  {
    id: "enrich",
    label: "Enrich",
    detail: "CRM + Stripe",
    icon: Sparkles,
    x: "32%",
    y: "18%",
  },
  {
    id: "branch",
    label: "Branch",
    detail: "ARR ≥ $25k?",
    icon: GitBranch,
    x: "54%",
    y: "38%",
  },
  {
    id: "approve",
    label: "Approval",
    detail: "send_email",
    icon: ShieldAlert,
    x: "74%",
    y: "22%",
    approval: true,
  },
  {
    id: "send",
    label: "Action",
    detail: "Gmail OAuth send",
    icon: Mail,
    x: "74%",
    y: "58%",
  },
];

export default function AutomationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
            Automations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            Workflow list plus a visual builder with approval badges on sensitive
            steps.
          </p>
        </div>
        <Button>
          <Zap />
          New workflow
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {workflows.map((workflow, index) => (
          <motion.div
            key={workflow.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{workflow.name}</CardTitle>
                  <Badge
                    variant={
                      workflow.status === "active" ? "success" : "secondary"
                    }
                  >
                    {workflow.status}
                  </Badge>
                </div>
                <CardDescription>
                  {workflow.runs} runs · approval {workflow.approvals}
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Visual builder</CardTitle>
          <CardDescription>
            Draft canvas for invoice chase — approval required before send
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative h-[420px] overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_45%)] nexa-grid">
            <svg className="absolute inset-0 h-full w-full" aria-hidden>
              <path
                d="M 120 140 C 200 140, 220 110, 300 110"
                stroke="currentColor"
                className="text-accent/40"
                fill="none"
                strokeWidth="2"
              />
              <path
                d="M 360 130 C 420 160, 460 190, 520 200"
                stroke="currentColor"
                className="text-accent/40"
                fill="none"
                strokeWidth="2"
              />
              <path
                d="M 560 210 C 620 180, 660 140, 720 130"
                stroke="currentColor"
                className="text-accent/40"
                fill="none"
                strokeWidth="2"
              />
              <path
                d="M 560 230 C 620 260, 660 280, 720 290"
                stroke="currentColor"
                className="text-accent/30"
                fill="none"
                strokeWidth="2"
                strokeDasharray="6 6"
              />
            </svg>

            {nodes.map((node, index) => {
              const Icon = node.icon;
              return (
                <motion.div
                  key={node.id}
                  className="absolute w-44"
                  style={{ left: node.x, top: node.y }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + index * 0.06 }}
                >
                  <div className="glass-strong rounded-2xl p-3 shadow-lg">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-soft text-accent">
                        <Icon className="h-4 w-4" />
                      </span>
                      {node.approval ? (
                        <Badge variant="warning">Approval</Badge>
                      ) : (
                        <Badge variant="secondary">{node.label}</Badge>
                      )}
                    </div>
                    <p className="text-sm font-semibold">{node.label}</p>
                    <p className="text-xs text-muted-foreground">{node.detail}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
