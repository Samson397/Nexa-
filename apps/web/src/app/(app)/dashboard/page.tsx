"use client";

import {
  BusinessOverview,
  CalendarStrip,
  DailyBriefing,
  DevicesServicesWidget,
  EmailsWidget,
  NotificationsWidget,
  RecentFilesWidget,
  RecommendationsWidget,
  TasksWidget,
} from "@/components/dashboard/widgets";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Your daily command center — briefing, calendar, tasks, and live system
          signals.
        </p>
      </div>

      <DailyBriefing />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <CalendarStrip />
            <TasksWidget />
          </div>
          <BusinessOverview />
          <div className="grid gap-4 md:grid-cols-2">
            <RecentFilesWidget />
            <EmailsWidget />
          </div>
        </div>
        <div className="space-y-4">
          <RecommendationsWidget />
          <NotificationsWidget />
          <DevicesServicesWidget />
        </div>
      </div>
    </div>
  );
}
