"use client";

import { useState } from "react";
import { Fingerprint, KeyRound, Trash2 } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
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

type PasskeyRow = {
  id: string;
  name: string;
  createdAt: string;
};

export default function SettingsPage() {
  const [twoFactor, setTwoFactor] = useState(false);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [approvalNotifs, setApprovalNotifs] = useState(true);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaUri, setMfaUri] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaMessage, setMfaMessage] = useState<string | null>(null);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState<string | null>(null);
  const [passkeys, setPasskeys] = useState<PasskeyRow[]>([
    { id: "demo-mac", name: "MacBook Touch ID", createdAt: "2025-06-02" },
  ]);

  async function enrollMfa() {
    setMfaBusy(true);
    setMfaMessage(null);
    try {
      const res = await fetch("/api/auth/mfa/enroll", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        factorId?: string;
        secret?: string;
        uri?: string;
        message?: string;
        error?: { message?: string };
      };
      if (!res.ok || !data.ok) {
        setMfaMessage(data.error?.message ?? "Unable to start MFA enrollment");
        return;
      }
      setMfaFactorId(data.factorId ?? null);
      setMfaSecret(data.secret ?? null);
      setMfaUri(data.uri ?? null);
      setMfaMessage(
        data.message ??
          "Scan the secret with your authenticator, then enter a code to verify.",
      );
    } catch {
      setMfaMessage("Network error during MFA enroll");
    } finally {
      setMfaBusy(false);
    }
  }

  async function verifyMfa() {
    if (!mfaFactorId) {
      setMfaMessage("Enroll MFA first");
      return;
    }
    setMfaBusy(true);
    setMfaMessage(null);
    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factorId: mfaFactorId, code: mfaCode }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        verified?: boolean;
        message?: string;
        error?: { message?: string };
      };
      if (!res.ok || !data.verified) {
        setMfaMessage(data.error?.message ?? "Invalid MFA code");
        return;
      }
      setTwoFactor(true);
      setMfaMessage(data.message ?? "MFA verified and enabled.");
      setMfaCode("");
    } catch {
      setMfaMessage("Network error during MFA verify");
    } finally {
      setMfaBusy(false);
    }
  }

  async function registerPasskey() {
    setPasskeyBusy(true);
    setPasskeyMessage(null);
    try {
      const optRes = await fetch("/api/auth/passkey/register-options", {
        method: "POST",
      });
      const optData = (await optRes.json()) as {
        ok?: boolean;
        options?: Parameters<typeof startRegistration>[0]["optionsJSON"];
        error?: { message?: string };
      };
      if (!optRes.ok || !optData.options) {
        setPasskeyMessage(
          optData.error?.message ?? "Unable to start passkey registration",
        );
        return;
      }

      const attestation = await startRegistration({
        optionsJSON: optData.options,
      });

      const verifyRes = await fetch("/api/auth/passkey/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: attestation,
          name: "This device",
        }),
      });
      const verifyData = (await verifyRes.json()) as {
        ok?: boolean;
        passkey?: { id: string; name?: string; createdAt: string };
        error?: { message?: string };
      };
      if (!verifyRes.ok || !verifyData.ok || !verifyData.passkey) {
        setPasskeyMessage(
          verifyData.error?.message ?? "Passkey registration failed",
        );
        return;
      }

      setPasskeys((prev) => [
        {
          id: verifyData.passkey!.id,
          name: verifyData.passkey!.name ?? "Passkey",
          createdAt: verifyData.passkey!.createdAt.slice(0, 10),
        },
        ...prev,
      ]);
      setPasskeyMessage("Passkey registered.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Passkey registration cancelled";
      setPasskeyMessage(message);
    } finally {
      setPasskeyBusy(false);
    }
  }

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
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
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
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={mfaBusy}
                  onClick={() => void enrollMfa()}
                >
                  {mfaBusy ? "Working…" : "Enroll MFA"}
                </Button>
              </div>
              {mfaSecret || mfaUri ? (
                <div className="space-y-3 rounded-xl border border-border p-3 text-sm">
                  {mfaSecret ? (
                    <p>
                      <span className="text-muted-foreground">Secret: </span>
                      <code className="break-all">{mfaSecret}</code>
                    </p>
                  ) : null}
                  {mfaUri ? (
                    <p className="break-all text-xs text-muted-foreground">
                      {mfaUri}
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-medium" htmlFor="mfa-code">
                        Verification code
                      </label>
                      <Input
                        id="mfa-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="000000"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value)}
                      />
                    </div>
                    <Button
                      disabled={mfaBusy || mfaCode.length < 4}
                      onClick={() => void verifyMfa()}
                    >
                      Verify
                    </Button>
                  </div>
                </div>
              ) : null}
              {mfaMessage ? (
                <p className="text-sm text-muted-foreground">{mfaMessage}</p>
              ) : null}
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
              {passkeys.map((pk) => (
                <div
                  key={pk.id}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Fingerprint className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-sm font-medium">{pk.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Added {pk.createdAt}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              ))}
              <Button
                variant="outline"
                disabled={passkeyBusy}
                onClick={() => void registerPasskey()}
              >
                {passkeyBusy ? "Waiting for authenticator…" : "Add passkey"}
              </Button>
              {passkeyMessage ? (
                <p className="text-sm text-muted-foreground">{passkeyMessage}</p>
              ) : null}
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
