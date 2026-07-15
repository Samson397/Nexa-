"use client";

import { useState } from "react";
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
import { cn } from "@/lib/utils";

const projects = [
  { name: "Ops OS Launch", progress: 72, owner: "Sam Chen" },
  { name: "Helix Renewal", progress: 40, owner: "Chris Dalton" },
  { name: "Knowledge v2", progress: 55, owner: "Avery Kim" },
];

type Priority = "low" | "medium" | "high" | "urgent";

const columns = [
  {
    id: "todo",
    title: "To do",
    tasks: [
      {
        title: "Map approval gates for invoice chase",
        priority: "high" as Priority,
        due: "Jul 16",
        project: "Ops OS Launch",
      },
      {
        title: "Collect brand assets for social draft",
        priority: "medium" as Priority,
        due: "Jul 17",
        project: "Knowledge v2",
      },
    ],
  },
  {
    id: "in_progress",
    title: "In progress",
    tasks: [
      {
        title: "Draft Helix counter proposal",
        priority: "urgent" as Priority,
        due: "Today",
        project: "Helix Renewal",
      },
      {
        title: "Index Ops Playbook for Support",
        priority: "high" as Priority,
        due: "Jul 15",
        project: "Knowledge v2",
      },
    ],
  },
  {
    id: "review",
    title: "Review",
    tasks: [
      {
        title: "Legal risk note on OEM clause",
        priority: "medium" as Priority,
        due: "Jul 18",
        project: "Helix Renewal",
      },
    ],
  },
  {
    id: "done",
    title: "Done",
    tasks: [
      {
        title: "Connect Outlook calendar",
        priority: "low" as Priority,
        due: "Jul 14",
        project: "Ops OS Launch",
      },
    ],
  },
];

const priorityVariant = {
  low: "secondary",
  medium: "default",
  high: "warning",
  urgent: "danger",
} as const;

export default function TasksPage() {
  const [view, setView] = useState("board");

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
        <Button>
          <Plus />
          New task
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
                    <Card key={task.title} className="hover:border-accent/30">
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
                    key={`${column.id}-${task.title}`}
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
