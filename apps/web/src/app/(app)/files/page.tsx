"use client";

import { useState } from "react";
import {
  Cloud,
  File,
  Folder,
  HardDrive,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const providers = [
  { name: "Google Drive", status: "connected" as const, icon: Cloud },
  { name: "Dropbox", status: "connected" as const, icon: Cloud },
  { name: "OneDrive", status: "disconnected" as const, icon: HardDrive },
];

const browser = [
  { name: "Customers", type: "folder", meta: "18 items" },
  { name: "Finance", type: "folder", meta: "42 items" },
  { name: "Product", type: "folder", meta: "11 items" },
  { name: "Q3_Ops_Playbook.pdf", type: "file", meta: "2.4 MB · Drive" },
  { name: "brand-kit.zip", type: "file", meta: "18 MB · Dropbox" },
  { name: "invoice-template.xlsx", type: "file", meta: "220 KB · Drive" },
];

export default function FilesPage() {
  const [path] = useState("My Drive / NEXA");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Files
        </h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Connect cloud drives and browse workspace files without storing
          passwords.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {providers.map((provider) => {
          const Icon = provider.icon;
          return (
            <Card key={provider.name}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle className="text-base">{provider.name}</CardTitle>
                    <CardDescription>
                      {provider.status === "connected" ? "Synced" : "Not linked"}
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant={
                    provider.status === "connected" ? "success" : "secondary"
                  }
                >
                  {provider.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <Button
                  size="sm"
                  variant={
                    provider.status === "connected" ? "outline" : "default"
                  }
                  className="w-full"
                >
                  {provider.status === "connected" ? "Manage" : "Connect"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>File browser</CardTitle>
            <CardDescription>{path}</CardDescription>
          </div>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="hidden" />
            <TabsContent value="recent" className="hidden" />
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-2">
          {browser.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-accent">
                  {item.type === "folder" ? (
                    <Folder className="h-4 w-4" />
                  ) : (
                    <File className="h-4 w-4" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.meta}</p>
                </div>
              </div>
              <Button size="sm" variant="ghost">
                Open
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
