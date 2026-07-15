import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  BookOpen,
  CheckSquare,
  Calendar,
  StickyNote,
  FolderOpen,
  Mail,
  Workflow,
  Puzzle,
  Smartphone,
  Settings,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Daily briefing and business overview",
  },
  {
    title: "AI Chat",
    href: "/chat",
    icon: MessageSquare,
    description: "Conversations with your AI operating system",
  },
  {
    title: "AI Employees",
    href: "/employees",
    icon: Users,
    description: "Specialized agents across your org",
  },
  {
    title: "Knowledge",
    href: "/knowledge",
    icon: BookOpen,
    description: "Indexed documents and research",
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
    description: "Projects, priorities, and execution",
  },
  {
    title: "Calendar",
    href: "/calendar",
    icon: Calendar,
    description: "Schedule and connected calendars",
  },
  {
    title: "Notes",
    href: "/notes",
    icon: StickyNote,
    description: "Capture, tag, and summarize",
  },
  {
    title: "Files",
    href: "/files",
    icon: FolderOpen,
    description: "Cloud drives and local bridges",
  },
  {
    title: "Email",
    href: "/email",
    icon: Mail,
    description: "OAuth inboxes and AI drafts",
  },
  {
    title: "Automations",
    href: "/automations",
    icon: Workflow,
    description: "Workflows with approval controls",
  },
  {
    title: "Integrations",
    href: "/integrations",
    icon: Puzzle,
    description: "Connect tools and channels",
  },
  {
    title: "Devices",
    href: "/devices",
    icon: Smartphone,
    description: "Desktop and mobile companions",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Profile, security, and providers",
  },
];

export const PRIMARY_MOBILE_NAV = [
  "/dashboard",
  "/chat",
  "/employees",
  "/tasks",
  "/settings",
] as const;
