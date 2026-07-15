"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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
import { apiJson } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const hours = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
const weekDays = ["Mon 13", "Tue 14", "Wed 15", "Thu 16", "Fri 17"];

type CalEvent = {
  day: number;
  start: string;
  end: string;
  title: string;
  source: string;
};

const MOCK_EVENTS: CalEvent[] = [
  {
    day: 2,
    start: "10:00",
    end: "10:30",
    title: "Ops stand-up",
    source: "Google",
  },
  {
    day: 2,
    start: "14:30",
    end: "15:15",
    title: "Helix Labs renewal",
    source: "Outlook",
  },
  {
    day: 2,
    start: "16:00",
    end: "16:45",
    title: "Design critique",
    source: "Apple",
  },
  {
    day: 3,
    start: "11:00",
    end: "12:00",
    title: "Automation review",
    source: "Google",
  },
];

function hourLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "09:00";
  return `${String(d.getHours()).padStart(2, "0")}:00`;
}

function endLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "10:00";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function dayIndex(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 2;
  // Map JS Sunday=0 … to Mon=0 … Fri=4 (clamp)
  const js = d.getDay();
  const monBased = js === 0 ? 6 : js - 1;
  return Math.min(4, Math.max(0, monBased));
}

export default function CalendarPage() {
  const [view, setView] = useState("week");
  const [events, setEvents] = useState<CalEvent[]>(MOCK_EVENTS);
  const [source, setSource] = useState("Google · Outlook · Apple");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiJson<{
          items: Array<{
            id: string;
            title: string;
            startAt: string;
            endAt: string;
            externalProvider?: string | null;
            location?: string | null;
          }>;
          source?: string;
        }>("/api/calendar");
        if (cancelled || !data.items?.length) return;
        setEvents(
          data.items.map((e) => ({
            day: dayIndex(e.startAt),
            start: hourLabel(e.startAt),
            end: endLabel(e.endAt),
            title: e.title,
            source: e.externalProvider
              ? String(e.externalProvider).replaceAll("_", " ")
              : "NEXA",
          })),
        );
        setSource(data.source ?? "calendar");
      } catch {
        // keep mocks
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dayEvents = useMemo(
    () => events.filter((event) => event.day === 2),
    [events],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
            Calendar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            Week and day views across connected calendars.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            Connect Google
          </Button>
          <Button variant="outline" size="sm">
            Connect Outlook
          </Button>
          <Button variant="outline" size="sm">
            Connect Apple
          </Button>
        </div>
      </div>

      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="day">Day</TabsTrigger>
        </TabsList>

        <TabsContent value="week">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Week of Jul 13</CardTitle>
              <CardDescription>{source}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[64px_repeat(5,1fr)] gap-2 border-b border-border pb-2">
                  <div />
                  {weekDays.map((day, index) => (
                    <div
                      key={day}
                      className={cn(
                        "rounded-xl px-2 py-2 text-center text-sm font-medium",
                        index === 2 && "bg-accent-soft text-accent",
                      )}
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="mt-2 space-y-2">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="grid grid-cols-[64px_repeat(5,1fr)] gap-2"
                    >
                      <div className="pt-2 text-xs text-muted-foreground">
                        {hour}
                      </div>
                      {weekDays.map((_, dayIndexNum) => {
                        const event = events.find(
                          (item) =>
                            item.day === dayIndexNum && item.start === hour,
                        );
                        return (
                          <div
                            key={`${dayIndexNum}-${hour}`}
                            className="min-h-14 rounded-xl border border-border/50 bg-muted/20 p-1"
                          >
                            {event ? (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="h-full rounded-lg bg-accent-soft px-2 py-1.5"
                              >
                                <p className="text-xs font-semibold text-accent">
                                  {event.title}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {event.start}–{event.end} · {event.source}
                                </p>
                              </motion.div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="day">
          <Card>
            <CardHeader>
              <CardTitle>Wednesday, Jul 15</CardTitle>
              <CardDescription>
                {dayEvents.length} meetings · focus blocks free
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dayEvents.map((event) => (
                <div
                  key={`${event.title}-${event.start}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.start} – {event.end}
                    </p>
                  </div>
                  <Badge>{event.source}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
