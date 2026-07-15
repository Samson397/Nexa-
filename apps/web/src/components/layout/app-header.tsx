"use client";

import { Bell, Menu, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/layout/theme-toggle";

interface AppHeaderProps {
  title?: string;
  onOpenMobileNav?: () => void;
}

export function AppHeader({ title, onOpenMobileNav }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl md:px-6">
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
      >
        <Menu />
      </Button>

      {title ? (
        <h1 className="font-display text-lg font-semibold tracking-tight md:hidden">
          {title}
        </h1>
      ) : null}

      <div className="relative mx-auto hidden w-full max-w-xl md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 border-border/80 bg-glass pl-9"
          placeholder="Search NEXA — tasks, files, agents, knowledge…"
          aria-label="Search"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground lg:inline">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />
        <Button variant="ghost" size="icon-sm" className="relative" aria-label="Notifications">
          <Bell />
          <Badge className="absolute -right-1 -top-1 h-4 min-w-4 justify-center px-1 text-[9px]">
            3
          </Badge>
        </Button>
      </div>
    </header>
  );
}
