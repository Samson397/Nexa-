"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { INTEGRATION_CATEGORIES, type IntegrationProvider } from "@nexa/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiJson } from "@/lib/api-client";

const LABELS: Record<IntegrationProvider, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  slack: "Slack",
  discord: "Discord",
  notion: "Notion",
  trello: "Trello",
  clickup: "ClickUp",
  stripe: "Stripe",
  paypal: "PayPal",
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  x: "X",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  google_drive: "Drive",
  dropbox: "Dropbox",
  onedrive: "OneDrive",
  gmail: "Gmail",
  outlook: "Outlook",
  google_calendar: "Google Calendar",
  outlook_calendar: "Outlook Calendar",
  apple_calendar: "Apple Calendar",
};

const CATEGORY_LABELS: Record<keyof typeof INTEGRATION_CATEGORIES, string> = {
  development: "Development",
  communication: "Communication",
  productivity: "Productivity",
  payments: "Payments",
  commerce: "Commerce",
  social: "Social",
  storage: "Storage",
  email: "Email",
  calendar: "Calendar",
};

const CONNECTED = new Set<IntegrationProvider>([
  "github",
  "slack",
  "gmail",
  "google_drive",
  "stripe",
  "notion",
]);

const DISPLAY_ORDER: (keyof typeof INTEGRATION_CATEGORIES)[] = [
  "development",
  "communication",
  "productivity",
  "payments",
  "commerce",
  "social",
  "email",
  "storage",
  "calendar",
];

export default function IntegrationsPage() {
  const [connected, setConnected] = useState(CONNECTED);
  const [busy, setBusy] = useState<IntegrationProvider | null>(null);

  async function connect(provider: IntegrationProvider) {
    if (connected.has(provider)) {
      setConnected((prev) => {
        const next = new Set(prev);
        next.delete(provider);
        return next;
      });
      return;
    }

    setBusy(provider);
    try {
      const data = await apiJson<{
        oauthUrl?: string;
        demo?: boolean;
      }>("/api/integrations/connect", {
        method: "POST",
        body: JSON.stringify({ provider }),
      });
      if (data.oauthUrl) {
        window.location.assign(data.oauthUrl);
        return;
      }
      setConnected((prev) => new Set(prev).add(provider));
    } catch {
      // Graceful mock toggle when API is unavailable
      setConnected((prev) => new Set(prev).add(provider));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Integrations
        </h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          OAuth connections across development, social, commerce, storage, and
          more. Never share third-party passwords with NEXA.
        </p>
      </div>

      {DISPLAY_ORDER.map((category, categoryIndex) => (
        <section key={category} className="space-y-3">
          <h2 className="font-display text-lg font-semibold">
            {CATEGORY_LABELS[category]}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {INTEGRATION_CATEGORIES[category].map((provider, index) => {
              const isConnected = connected.has(provider);
              return (
                <motion.div
                  key={provider}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: Math.min(categoryIndex * 0.03 + index * 0.02, 0.35),
                  }}
                >
                  <Card className="h-full">
                    <CardHeader className="flex-row items-start justify-between space-y-0">
                      <div>
                        <CardTitle className="text-base">
                          {LABELS[provider]}
                        </CardTitle>
                        <CardDescription className="capitalize">
                          {provider.replaceAll("_", " ")}
                        </CardDescription>
                      </div>
                      <Badge variant={isConnected ? "success" : "secondary"}>
                        {isConnected ? "Connected" : "Available"}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <Button
                        className="w-full"
                        variant={isConnected ? "outline" : "default"}
                        disabled={busy === provider}
                        onClick={() => void connect(provider)}
                      >
                        {busy === provider
                          ? "Connecting…"
                          : isConnected
                            ? "Disconnect"
                            : "Connect"}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
