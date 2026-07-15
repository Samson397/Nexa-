"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiJson } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const projects = [
  { name: "Ops OS Launch", progress: 72, owner: "Sam Chen" },
  { name: "Helix Renewal", progress: 40, owner: "Chris Dalton" },
  { name: "Knowledge v2", progress: 55, owner: "Avery Kim" },
];

type Priority = "low" | "medium" | "high" | "urgent";

type TaskCard = {
  id: string;
  title: string;
  priority: Priority;
  due: string;
  project: string;
  status: string;
};

const MOCK_TASKS: TaskCard[] = [
  {
    id: "t1",
    title: "Map approval gates for invoice chase",
    priority: "high",
    due: "Jul 16",
    project: "Ops OS Launch",
    status: "todo",
  },
  {
    id: "t2",
    title: "Collect brand assets for social draft",
    priority: "medium",
    due: "Jul 17",
    project: "Knowledge v2",
    status: "todo",
  },
  {
    id: "t3",
    title: "Draft Helix counter proposal",
    priority: "urgent",
    due: "Today",
    project: "Helix Renewal",
    status: "in_progress",
  },
  {
    id: "t4",
    title: "Index Ops Playbook for Support",
    priority: "high",
    due: "Jul 15",
    project: "Knowledge v2",
    status: "in_progress",
  },
  {
    id: "t5",
    title: "Legal risk note on OEM clause",
    priority: "medium",
    due: "Jul 18",
    project: "Helix Renewal",
    status: "review",
  },
  {
    id: "t6",
    title: "Connect Outlook calendar",
    priority: "low",
    due: "Jul 14",
    project: "Ops OS Launch",
    status: "done",
  },
];

const COLUMN_META = [
  { id: "todo", title: "To do" },
  { id: "in_progress", title: "In progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
] as const;

const priorityVariant = {
  low: "secondary",
  medium: "default",
  high: "warning",
  urgent: "danger",
} as const;

function formatDue(dueDate?: string | null): string {
  if (!dueDate) return "No due date";
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return dueDate;
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function normalizePriority(p?: string): Priority {
  if (p === "low" || p === "medium" || p === "high" || p === "urgent") return p;
  return "medium";
}

export default function TasksPage() {
  const [view, setView] = useState("board");
  const [tasks, setTasks] = useState<TaskCard[]>(MOCK_TASKS);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiJson<{
          items: Array<{
            id: string;
            title: string;
            status: string;
            priority?: string;
            dueDate?: string | null;
            projectId?: string | null;
          }>;
        }>("/api/tasks");
        if (cancelled || !data.items?.length) return;
        setTasks(
          data.items.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status || "todo",
            priority: normalizePriority(t.priority),
            due: formatDue(t.dueDate),
            project: t.projectId ? "Project" : "General",
          })),
        );
      } catch {
        // keep mocks
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns = useMemo(
    () =>
      COLUMN_META.map((col) => ({
        ...col,
        tasks: tasks.filter((t) => t.status === col.id),
      })),
    [tasks],
  );

  async function createTask() {
    setCreating(true);
    const title = "New task from NEXA";
    try {
      const data = await apiJson<{
        task: {
          id: string;
          title: string;
          status: string;
          priority?: string;
          dueDate?: string | null;
        };
      }>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title,
          status: "todo",
          priority: "medium",
        }),
      });
      setTasks((prev) => [
        {
          id: data.task.id,
          title: data.task.title,
          status: data.task.status || "todo",
          priority: normalizePriority(data.task.priority),
          due: formatDue(data.task.dueDate),
          project: "General",
        },
        ...prev,
      ]);
    } catch {
      setTasks((prev) => [
        {
          id: `local-${Date.now()}`,
          title,
          status: "todo",
          priority: "medium",
          due: "No due date",
          project: "General",
        },
        ...prev,
      ]);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
            Tasks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            Projects and execution boards with priorities and deadlines.
          </p>
        </div>
        <Button disabled={creating} onClick={() => void createTask()}>
          <Plus />
          {creating ? "Creating…" : "New task"}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {projects.map((project, index) => (
          <motion.div
            key={project.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
                <CardDescription>Owner · {project.owner}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="board">Kanban</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>
        <TabsContent value="board">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {columns.map((column) => (
              <div key={column.id} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold">{column.title}</h2>
                  <Badge variant="secondary">{column.tasks.length}</Badge>
                </div>
                <div className="space-y-3">
                  {column.tasks.map((task) => (
                    <Card key={task.id} className="hover:border-accent/30">
                      <CardContent className="space-y-3 p-4">
                        <p className="text-sm font-medium">{task.title}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={priorityVariant[task.priority]}>
                            {task.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Due {task.due}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {task.project}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="list">
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {columns.flatMap((column) =>
                column.tasks.map((task) => (
                  <div
                    key={`${column.id}-${task.id}`}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.project} · {column.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={priorityVariant[task.priority]}>
                        {task.priority}
                      </Badge>
                      <span
                        className={cn(
                          "text-xs text-muted-foreground",
                          task.due === "Today" && "text-warning",
                        )}
                      >
                        {task.due}
                      </span>
                    </div>
                  </div>
                )),
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
