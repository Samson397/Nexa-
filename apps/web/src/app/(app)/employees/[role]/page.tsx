"use client";

import Link from "next/link";
import { use, useState } from "react";
import { ArrowLeft, ShieldCheck, Wrench } from "lucide-react";
import {
  ChatInterface,
  type ChatMessage,
} from "@/components/chat/chat-interface";
import { getEmployee } from "@/lib/employees";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = use(params);
  const employee = getEmployee(role);
  const [messages, setMessages] = useState<ChatMessage[]>(
    employee
      ? [
          {
            id: "intro",
            role: "assistant",
            content: `Hi — I'm **${employee.name}**, your ${employee.title} AI Employee.\n\n${employee.description}\n\nPersonality: _${employee.personality}_`,
          },
        ]
      : [],
  );

  if (!employee) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-semibold">Agent not found</h1>
        <Button asChild variant="outline">
          <Link href="/employees">Back to AI Employees</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon-sm" className="mt-1">
            <Link href="/employees">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {employee.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {employee.title} · chat, tools, and permissions
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <Avatar className="h-14 w-14">
              <AvatarFallback>
                {employee.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{employee.title}</CardTitle>
              <CardDescription>{employee.personality}</CardDescription>
              <Badge className="mt-2" variant="success">
                {employee.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">{employee.description}</p>
            <div>
              <p className="mb-2 flex items-center gap-2 font-medium">
                <Wrench className="h-4 w-4 text-accent" />
                Tools
              </p>
              <div className="flex flex-wrap gap-1.5">
                {employee.tools.map((tool) => (
                  <Badge key={tool} variant="secondary">
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-2 font-medium">
                <ShieldCheck className="h-4 w-4 text-accent" />
                Permissions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {employee.permissions.map((permission) => (
                  <Badge key={permission} variant="outline">
                    {permission}
                  </Badge>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Model: {employee.defaultProvider} / {employee.defaultModel}
            </p>
          </CardContent>
        </Card>
      </div>

      <ChatInterface
        className="min-h-[560px]"
        title={`Chat with ${employee.name}`}
        subtitle={`${employee.title} agent`}
        placeholder={`Message ${employee.name}…`}
        messages={messages}
        onSend={async (content) => {
          setMessages((prev) => [
            ...prev,
            { id: `u-${Date.now()}`, role: "user", content },
            {
              id: `a-${Date.now()}`,
              role: "assistant",
              content: `As your **${employee.title}**, I'd prioritize the highest-leverage next step and surface any approval-required actions before executing. (Demo reply.)`,
            },
          ]);
        }}
      />
    </div>
  );
}
