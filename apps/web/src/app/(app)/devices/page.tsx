"use client";

import { motion } from "framer-motion";
import {
  FolderLock,
  Laptop,
  Shield,
  Smartphone,
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
import { Switch } from "@/components/ui/switch";

const devices = [
  {
    name: "MacBook Pro 16″",
    kind: "Desktop companion",
    status: "online",
    lastSeen: "Active now",
    icon: Laptop,
    paths: ["~/Projects/nexa", "~/Documents/NEXA Exports"],
    permissions: [
      { label: "Read approved folders", enabled: true },
      { label: "Write exports folder", enabled: true },
      { label: "Shell commands", enabled: false },
      { label: "Screen capture assist", enabled: false },
    ],
  },
  {
    name: "iPhone 15 Pro",
    kind: "Mobile companion",
    status: "online",
    lastSeen: "2m ago",
    icon: Smartphone,
    paths: ["On-device captures / NEXA"],
    permissions: [
      { label: "Push notifications", enabled: true },
      { label: "Camera for docs", enabled: true },
      { label: "Background sync", enabled: true },
      { label: "Location context", enabled: false },
    ],
  },
];

export default function DevicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Devices
        </h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Desktop and mobile companions with approved paths and explicit
          permission boundaries.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {devices.map((device, index) => {
          const Icon = device.icon;
          return (
            <motion.div
              key={device.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <Card className="h-full">
                <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <CardTitle>{device.name}</CardTitle>
                      <CardDescription>
                        {device.kind} · {device.lastSeen}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="success">{device.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <FolderLock className="h-4 w-4 text-accent" />
                      Approved paths
                    </p>
                    <ul className="space-y-2">
                      {device.paths.map((path) => (
                        <li
                          key={path}
                          className="rounded-xl border border-border/70 px-3 py-2 font-mono text-xs"
                        >
                          {path}
                        </li>
                      ))}
                    </ul>
                    <Button size="sm" variant="outline" className="mt-3">
                      Request new path
                    </Button>
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Shield className="h-4 w-4 text-accent" />
                      Permissions
                    </p>
                    <div className="space-y-3">
                      {device.permissions.map((permission) => (
                        <div
                          key={permission.label}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5"
                        >
                          <span className="text-sm">{permission.label}</span>
                          <Switch defaultChecked={permission.enabled} />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
