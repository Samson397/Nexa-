"use client";

import Link from "next/link";
import { use, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  ChatInterface,
  type ChatMessage,
} from "@/components/chat/chat-interface";
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from "@/lib/mock-chat";
import { Button } from "@/components/ui/button";

export default function ChatConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const conversation =
    MOCK_CONVERSATIONS.find((item) => item.id === id) ?? MOCK_CONVERSATIONS[0];
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);

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
          </p>
        </div>
      </div>

      <ChatInterface
        className="min-h-0 flex-1"
        messages={messages}
        title={conversation.title}
        subtitle="Dynamic conversation view"
        onSend={async (content) => {
          setMessages((prev) => [
            ...prev,
            { id: `u-${Date.now()}`, role: "user", content },
            {
              id: `a-${Date.now()}`,
              role: "assistant",
              content:
                "Noted. I'll keep context for this thread and propose next actions when the model stream is connected.",
            },
          ]);
        }}
      />
    </div>
  );
}
