"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronsLeft, ChevronsRight, LogOut } from "lucide-react";
import { NAV_ITEMS } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { NexaLogo } from "@/components/layout/nexa-logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-sidebar/90 backdrop-blur-xl transition-[width] duration-300 md:flex",
        collapsed ? "w-[76px]" : "w-[260px]",
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center px-3",
          collapsed ? "justify-center" : "justify-between gap-2 px-4",
        )}
      >
        <Link href="/dashboard" className="min-w-0">
          <NexaLogo showWordmark={!collapsed} size="sm" />
        </Link>
        {!collapsed ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            aria-label="Collapse sidebar"
          >
            <ChevronsLeft />
          </Button>
        ) : null}
      </div>

      {collapsed ? (
        <div className="mb-2 flex justify-center">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            aria-label="Expand sidebar"
          >
            <ChevronsRight />
          </Button>
        </div>
      ) : null}

      <ScrollArea className="flex-1 px-2 pb-4">
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.title : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  collapsed && "justify-center px-0",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl bg-accent-soft"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                ) : null}
                <Icon className="relative z-10 h-4 w-4 shrink-0" />
                {!collapsed ? (
                  <span className="relative z-10 truncate font-medium">
                    {item.title}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />
      <div className={cn("p-3", collapsed && "flex flex-col items-center")}>
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl p-2",
            collapsed && "justify-center p-0",
          )}
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback>AK</AvatarFallback>
          </Avatar>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">Avery Kane</p>
              <p className="truncate text-xs text-muted-foreground">
                Owner · NEXA HQ
              </p>
            </div>
          ) : null}
          {!collapsed ? (
            <Button variant="ghost" size="icon-sm" aria-label="Sign out">
              <LogOut />
            </Button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
