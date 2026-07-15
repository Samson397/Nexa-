"use client";

import { useState } from "react";
import { Folder, Sparkles, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const folders = ["All notes", "Strategy", "Meetings", "Personal"];
const notes = [
  {
    id: "n1",
    title: "Helix renewal talking points",
    folder: "Meetings",
    tags: ["sales", "renewal"],
    preview: "Seat volume, OEM clause risks…",
    body: "Helix wants volume discount at 180 seats.\n\nRisks:\n- OEM redistribution language\n- Auto-renewal notice window\n\nNext: Sales Manager draft + Legal assist.",
  },
  {
    id: "n2",
    title: "Ops automation principles",
    folder: "Strategy",
    tags: ["automations", "security"],
    preview: "Always approve send_email…",
    body: "Principles:\n1. OAuth only\n2. Approval for sensitive actions\n3. Full audit trail\n4. No password storage",
  },
  {
    id: "n3",
    title: "Weekly personal priorities",
    folder: "Personal",
    tags: ["focus"],
    preview: "Deep work Wed afternoon…",
    body: "Protect Wed 13:00–16:00 for deep work on Automations canvas.",
  },
];

export default function NotesPage() {
  const [folder, setFolder] = useState("All notes");
  const [activeId, setActiveId] = useState(notes[0].id);
  const [body, setBody] = useState(notes[0].body);
  const [summary, setSummary] = useState<string | null>(null);

  const filtered =
    folder === "All notes"
      ? notes
      : notes.filter((note) => note.folder === folder);
  const active = notes.find((note) => note.id === activeId) ?? notes[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Notes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Folders, tags, and an AI summarize assist for capture and recall.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[200px_240px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Folders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {folders.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFolder(item)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm",
                  folder === item
                    ? "bg-accent-soft text-accent"
                    : "text-muted-foreground hover:bg-muted/70",
                )}
              >
                <Folder className="h-4 w-4" />
                {item}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-sm">Notes</CardTitle>
            <CardDescription>{filtered.length} in view</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[420px]">
              <div className="space-y-1 px-3 pb-3">
                {filtered.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => {
                      setActiveId(note.id);
                      setBody(note.body);
                      setSummary(null);
                    }}
                    className={cn(
                      "w-full rounded-xl px-3 py-2.5 text-left",
                      activeId === note.id
                        ? "bg-accent-soft"
                        : "hover:bg-muted/70",
                    )}
                  >
                    <p className="truncate text-sm font-medium">{note.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {note.preview}
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="min-h-[520px]">
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <Input
                  defaultValue={active.title}
                  className="border-0 bg-transparent px-0 font-display text-xl font-semibold shadow-none focus-visible:ring-0"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  {active.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      <Tag className="mr-1 h-3 w-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                variant="soft"
                size="sm"
                onClick={() =>
                  setSummary(
                    "Summary: renewal negotiation focus — seat pricing, OEM risk, and legal follow-ups before Thursday call.",
                  )
                }
              >
                <Sparkles />
                AI summarize
              </Button>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            {summary ? (
              <div className="mb-4 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
                {summary}
              </div>
            ) : null}
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[340px] resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
