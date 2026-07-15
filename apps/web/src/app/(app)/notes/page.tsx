"use client";

import { useCallback, useEffect, useState } from "react";
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
import { apiJson } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type NoteItem = {
  id: string;
  title: string;
  folder: string;
  tags: string[];
  preview: string;
  body: string;
};

const folders = ["All notes", "Strategy", "Meetings", "Personal"];

const MOCK_NOTES: NoteItem[] = [
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

function mapApiNote(raw: {
  id: string;
  title?: string;
  plainText?: string;
  tags?: string[];
  folderId?: string | null;
  content?: { text?: string };
}): NoteItem {
  const body =
    raw.plainText ||
    (typeof raw.content?.text === "string" ? raw.content.text : "") ||
    "";
  const tags = Array.isArray(raw.tags) ? raw.tags : [];
  const folder =
    tags.includes("meetings") || tags.includes("sales")
      ? "Meetings"
      : tags.includes("strategy") || tags.includes("automations")
        ? "Strategy"
        : tags.includes("personal") || tags.includes("focus")
          ? "Personal"
          : "All notes";
  return {
    id: raw.id,
    title: raw.title || "Untitled",
    folder: folder === "All notes" ? "Strategy" : folder,
    tags,
    preview: body.slice(0, 48) + (body.length > 48 ? "…" : ""),
    body,
  };
}

export default function NotesPage() {
  const [folder, setFolder] = useState("All notes");
  const [notes, setNotes] = useState<NoteItem[]>(MOCK_NOTES);
  const [activeId, setActiveId] = useState(MOCK_NOTES[0]!.id);
  const [title, setTitle] = useState(MOCK_NOTES[0]!.title);
  const [body, setBody] = useState(MOCK_NOTES[0]!.body);
  const [summary, setSummary] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState<"api" | "mock">("mock");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiJson<{
          items: Array<{
            id: string;
            title?: string;
            plainText?: string;
            tags?: string[];
            folderId?: string | null;
            content?: { text?: string };
          }>;
        }>("/api/notes");
        if (cancelled || !data.items?.length) return;
        const mapped = data.items.map(mapApiNote);
        setNotes(mapped);
        setActiveId(mapped[0]!.id);
        setTitle(mapped[0]!.title);
        setBody(mapped[0]!.body);
        setSource("api");
      } catch {
        // keep mock notes
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered =
    folder === "All notes"
      ? notes
      : notes.filter((note) => note.folder === folder);
  const active = notes.find((note) => note.id === activeId) ?? notes[0]!;

  const saveNote = useCallback(async () => {
    if (source !== "api") {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === activeId
            ? {
                ...n,
                title,
                body,
                preview: body.slice(0, 48) + (body.length > 48 ? "…" : ""),
              }
            : n,
        ),
      );
      return;
    }
    setSaving(true);
    try {
      await apiJson(`/api/notes/${activeId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          plainText: body,
          content: { type: "doc", text: body },
        }),
      });
      setNotes((prev) =>
        prev.map((n) =>
          n.id === activeId
            ? {
                ...n,
                title,
                body,
                preview: body.slice(0, 48) + (body.length > 48 ? "…" : ""),
              }
            : n,
        ),
      );
    } catch {
      // keep local edits
    } finally {
      setSaving(false);
    }
  }, [activeId, body, source, title]);

  async function summarize() {
    try {
      const data = await apiJson<{ summary: string }>(
        `/api/notes/${activeId}/summarize`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setSummary(data.summary);
    } catch {
      setSummary(
        "Summary: renewal negotiation focus — seat pricing, OEM risk, and legal follow-ups before Thursday call.",
      );
    }
  }

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
                      setTitle(note.title);
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
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => void saveNote()}
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => void saveNote()}
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button variant="soft" size="sm" onClick={() => void summarize()}>
                  <Sparkles />
                  AI summarize
                </Button>
              </div>
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
              onBlur={() => void saveNote()}
              className="min-h-[340px] resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
