"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

async function signupWithPassword(email: string, password: string) {
  try {
    await fetch("/api/auth/signup", {
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

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    await signupWithPassword(email, password);
    setLoading(false);
    router.push("/dashboard");
  }

  return (
    <div className="glass-strong w-full max-w-md rounded-3xl p-6 shadow-xl sm:p-8">
      <div className="mb-6 space-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Create your workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          Spin up NEXA with secure email auth. Enable 2FA and passkeys anytime
          from Settings.
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Full name
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Avery Kane"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Work email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            required
          />
        </div>
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? "Creating…" : "Get Started"}
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
          Sign up with Google
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          type="button"
          onClick={() => startOAuth("apple")}
        >
          <span className="text-base leading-none"></span>
          Sign up with Apple
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          type="button"
          onClick={() => startOAuth("github")}
        >
          <Github />
          Sign up with GitHub
        </Button>
        <Button
          variant="soft"
          className="w-full justify-start"
          type="button"
          onClick={() => router.push("/dashboard")}
        >
          <Fingerprint />
          Create with passkey
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
