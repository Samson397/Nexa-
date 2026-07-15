"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { motion } from "framer-motion";
import {
  Bot,
  Mic,
  Paperclip,
  SendHorizonal,
  Sparkles,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
}

interface ChatInterfaceProps {
  messages: ChatMessage[];
  title?: string;
  subtitle?: string;
  placeholder?: string;
  onSend?: (content: string) => void | Promise<void>;
  streaming?: boolean;
  className?: string;
  compact?: boolean;
}

export function ChatInterface({
  messages,
  title = "NEXA Chat",
  subtitle = "Streaming-ready assistant",
  placeholder = "Ask NEXA anything…",
  onSend,
  streaming = false,
  className,
  compact = false,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function handleSend() {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setInput("");
    try {
      await onSend?.(content);
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-glass",
        className,
      )}
    >
      {!compact ? (
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="font-display text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          {streaming ? (
            <span className="ml-auto text-xs text-accent">Streaming…</span>
          ) : null}
        </div>
      ) : null}

      <ScrollArea className="flex-1 px-3 py-4 md:px-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.03, 0.2) }}
              className={cn(
                "flex gap-3",
                message.role === "user" && "flex-row-reverse",
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback
                  className={cn(
                    message.role === "user"
                      ? "bg-muted text-foreground"
                      : "bg-accent-soft text-accent",
                  )}
                >
                  {message.role === "user" ? (
                    <User className="h-3.5 w-3.5" />
                  ) : (
                    <Bot className="h-3.5 w-3.5" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                  message.role === "user"
                    ? "bg-accent text-accent-foreground"
                    : "glass-strong",
                )}
              >
                {message.role === "assistant" ? (
                  <div className="prose-nexa">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </motion.div>
          ))}
          {streaming ? (
            <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:240ms]" />
              </span>
              Thinking
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-border p-3 md:p-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border bg-card-solid/50 p-2 dark:bg-card">
          <Button variant="ghost" size="icon-sm" type="button" aria-label="Attach">
            <Paperclip />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="min-h-[44px] max-h-36 flex-1 resize-none border-0 bg-transparent px-1 py-2 shadow-none focus-visible:ring-0"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <Button variant="ghost" size="icon-sm" type="button" aria-label="Voice">
            <Mic />
          </Button>
          <Button
            size="icon-sm"
            type="button"
            onClick={() => void handleSend()}
            disabled={!input.trim() || sending}
            aria-label="Send"
          >
            <SendHorizonal />
          </Button>
        </div>
      </div>
    </div>
  );
}
