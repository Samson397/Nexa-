"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MessageSquarePlus, Search } from "lucide-react";
import {
  ChatInterface,
  type ChatMessage,
} from "@/components/chat/chat-interface";
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from "@/lib/mock-chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [activeId, setActiveId] = useState<string>(MOCK_CONVERSATIONS[0].id);

  const conversations = useMemo(
    () =>
      MOCK_CONVERSATIONS.filter((c) =>
        c.title.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] flex-col gap-4 md:h-[calc(100dvh-5.5rem)]">
      <div className="shrink-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          AI Chat
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conversations with NEXA — markdown replies, attachments, and voice-ready
          composer.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="glass flex min-h-0 flex-col overflow-hidden rounded-2xl">
          <div className="flex items-center gap-2 border-b border-border p-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search chats"
                className="h-9 pl-8"
              />
            </div>
            <Button size="icon-sm" variant="soft" aria-label="New chat">
              <MessageSquarePlus />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {conversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/chat/${conversation.id}`}
                  onClick={() => setActiveId(conversation.id)}
                  className={cn(
                    "block rounded-xl px-3 py-2.5 transition-colors",
                    activeId === conversation.id
                      ? "bg-accent-soft"
                      : "hover:bg-muted/70",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">
                      {conversation.title}
                    </p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {conversation.updatedAt}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {conversation.preview}
                  </p>
                </Link>
              ))}
            </div>
          </ScrollArea>
          <div className="border-t border-border p-3">
            <Badge variant="secondary">4 conversations · demo data</Badge>
          </div>
        </aside>

        <ChatInterface
          className="min-h-[420px]"
          messages={messages}
          title="Q3 ops automation plan"
          subtitle="NEXA OS · gpt-4o"
          onSend={async (content) => {
            const userMsg: ChatMessage = {
              id: `u-${Date.now()}`,
              role: "user",
              content,
            };
            const assistantMsg: ChatMessage = {
              id: `a-${Date.now()}`,
              role: "assistant",
              content:
                "Got it — I'll stage that change in Automations with an approval badge on the send step. (Demo response; streaming API not connected yet.)",
            };
            setMessages((prev) => [...prev, userMsg, assistantMsg]);
          }}
        />
      </div>
    </div>
  );
}
