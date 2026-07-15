"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

async function loginWithPassword(email: string, password: string) {
  try {
    await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    // Demo continues even if Supabase is not configured.
  }
}

function startOAuth(provider: "google" | "github" | "apple") {
  window.location.href = `/api/auth/oauth?provider=${provider}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("avery@nexa.ai");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    await loginWithPassword(email, password);
    setLoading(false);
    router.push("/dashboard");
  }

  return (
    <div className="glass-strong w-full max-w-md rounded-3xl p-6 shadow-xl sm:p-8">
      <div className="mb-6 space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Sign in
        </h1>
        <p className="text-sm text-muted-foreground">
          Access your NEXA workspace. Two-factor authentication available after
          password or OAuth.
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={8}
            required
          />
        </div>
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Continue"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <div className="grid gap-2">
        <Button
          variant="outline"
          className="w-full justify-start"
          type="button"
          onClick={() => startOAuth("google")}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-slate-800">
            G
          </span>
          Continue with Google
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          type="button"
          onClick={() => startOAuth("apple")}
        >
          <span className="text-base leading-none"></span>
          Continue with Apple
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          type="button"
          onClick={() => startOAuth("github")}
        >
          <Github />
          Continue with GitHub
        </Button>
        <Button
          variant="soft"
          className="w-full justify-start"
          type="button"
          onClick={() => router.push("/dashboard")}
        >
          <Fingerprint />
          Sign in with passkey
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to NEXA?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
