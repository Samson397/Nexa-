"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { NAV_ITEMS, PRIMARY_MOBILE_NAV } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { NexaLogo } from "@/components/layout/nexa-logo";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname();
  const primary = NAV_ITEMS.filter((item) =>
    (PRIMARY_MOBILE_NAV as readonly string[]).includes(item.href),
  );

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <ul className="grid grid-cols-5 gap-1 py-2">
          {primary.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px]",
                    active
                      ? "text-accent"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="truncate">{item.title.split(" ")[0]}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation"
              className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onOpenChange(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-[min(88vw,320px)] flex-col border-r border-border bg-sidebar shadow-2xl md:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <div className="flex h-16 items-center justify-between px-4">
                <NexaLogo size="sm" />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onOpenChange(false)}
                  aria-label="Close"
                >
                  <X />
                </Button>
              </div>
              <ScrollArea className="flex-1 px-3 pb-6">
                <div className="flex flex-col gap-1">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => onOpenChange(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
                          active
                            ? "bg-accent-soft text-accent"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </ScrollArea>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
