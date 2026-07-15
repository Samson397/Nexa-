"use client";

import { useState } from "react";
import { Fingerprint, KeyRound, Trash2 } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const providers = [
  { name: "OpenAI", placeholder: "sk-…" },
  { name: "Anthropic", placeholder: "sk-ant-…" },
  { name: "Google Gemini", placeholder: "AIza…" },
  { name: "DeepSeek", placeholder: "sk-…" },
  { name: "OpenRouter", placeholder: "sk-or-…" },
];

export default function SettingsPage() {
  const [twoFactor, setTwoFactor] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [approvalNotifs, setApprovalNotifs] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Profile, appearance, security, API keys, notifications, and workspace
          danger zone.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="api">API keys</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="danger">Danger zone</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>How you appear across NEXA</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="full-name">
                  Full name
                </label>
                <Input id="full-name" defaultValue="Avery Kane" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="email">
                  Email
                </label>
                <Input id="email" type="email" defaultValue="avery@nexa.ai" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium" htmlFor="company">
                  Workspace
                </label>
                <Input id="company" defaultValue="NEXA HQ" />
              </div>
              <Button className="md:col-span-2 md:w-fit">Save profile</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Deep slate surfaces with cyan/teal accents — choose light or dark
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Theme</p>
                <p className="text-sm text-muted-foreground">
                  Toggle dark / light mode
                </p>
              </div>
              <ThemeToggle />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Two-factor authentication</CardTitle>
              <CardDescription>
                Recommended for owners and admins
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <KeyRound className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-sm font-medium">Authenticator app / TOTP</p>
                  <p className="text-sm text-muted-foreground">
                    Challenge after password or OAuth
                  </p>
                </div>
              </div>
              <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Passkeys</CardTitle>
              <CardDescription>
                Passwordless sign-in on enrolled devices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border px-3 py-3">
                <div className="flex items-center gap-3">
                  <Fingerprint className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-sm font-medium">MacBook Touch ID</p>
                    <p className="text-xs text-muted-foreground">Added Jun 2</p>
                  </div>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
              <Button variant="outline">Add passkey</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>Provider API keys</CardTitle>
              <CardDescription>
                Stored encrypted for your workspace AI providers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {providers.map((provider) => (
                <div key={provider.name} className="space-y-2">
                  <label className="text-sm font-medium">{provider.name}</label>
                  <Input
                    type="password"
                    placeholder={provider.placeholder}
                    autoComplete="off"
                  />
                </div>
              ))}
              <Button>Save keys</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Control briefing, approvals, and product updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Email digests</p>
                  <p className="text-sm text-muted-foreground">
                    Morning briefing and weekly summary
                  </p>
                </div>
                <Switch
                  checked={emailNotifs}
                  onCheckedChange={setEmailNotifs}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Approval requests</p>
                  <p className="text-sm text-muted-foreground">
                    Push when automations need sign-off
                  </p>
                </div>
                <Switch
                  checked={approvalNotifs}
                  onCheckedChange={setApprovalNotifs}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger">
          <Card className="border-danger/40">
            <CardHeader>
              <CardTitle className="text-destructive">Danger zone</CardTitle>
              <CardDescription>
                Irreversible workspace actions — require re-auth
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline">Export workspace data</Button>
              <Button variant="destructive">
                <Trash2 />
                Delete workspace
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
