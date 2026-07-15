"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  ChatInterface,
  type ChatMessage,
} from "@/components/chat/chat-interface";
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from "@/lib/mock-chat";
import { isUuid, streamChat } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export default function ChatConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const conversation =
    MOCK_CONVERSATIONS.find((item) => item.id === id) ?? MOCK_CONVERSATIONS[0]!;
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [conversationId, setConversationId] = useState<string | undefined>(
    isUuid(id) ? id : undefined,
  );
  const [streaming, setStreaming] = useState(false);
  const conversationIdRef = useRef(conversationId);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  async function handleSend(content: string) {
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content,
    };
    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setStreaming(true);

    try {
      const result = await streamChat({
        messages: [...messages, userMsg].map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        })),
        conversationId: conversationIdRef.current,
        onToken: (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + chunk }
                : m,
            ),
          );
        },
      });
      if (result.conversationId && isUuid(result.conversationId)) {
        setConversationId(result.conversationId);
      }
      if (!result.text) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    "Noted. I'll keep context for this thread and propose next actions.",
                }
              : m,
          ),
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "Noted. I'll keep context for this thread and propose next actions when the model stream is connected.",
              }
            : m,
        ),
      );
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] flex-col gap-4 md:h-[calc(100dvh-5.5rem)]">
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon-sm" className="mt-1">
          <Link href="/chat" aria-label="Back to chats">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {conversation.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conversation `{id}` · updated {conversation.updatedAt}
            {conversationId ? ` · persisted ${conversationId.slice(0, 8)}…` : ""}
          </p>
        </div>
      </div>

      <ChatInterface
        className="min-h-0 flex-1"
        messages={messages}
        title={conversation.title}
        subtitle="Dynamic conversation view"
        streaming={streaming}
        onSend={handleSend}
      />
    </div>
  );
}
