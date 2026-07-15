/** Shared types, constants, and utilities for NEXA. */

export type UserRole = "owner" | "admin" | "member" | "viewer";

export type AiProvider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "deepseek"
  | "openrouter";

export type IntegrationProvider =
  | "github"
  | "gitlab"
  | "slack"
  | "discord"
  | "notion"
  | "trello"
  | "clickup"
  | "stripe"
  | "paypal"
  | "shopify"
  | "woocommerce"
  | "x"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "linkedin"
  | "youtube"
  | "google_drive"
  | "dropbox"
  | "onedrive"
  | "gmail"
  | "outlook"
  | "google_calendar"
  | "outlook_calendar"
  | "apple_calendar";

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "cancelled";

export type AgentRole =
  | "ceo"
  | "coo"
  | "project_manager"
  | "developer"
  | "designer"
  | "finance_manager"
  | "marketing_manager"
  | "customer_support"
  | "legal_assistant"
  | "research_assistant"
  | "social_media_manager"
  | "sales_manager";

export type AutomationApprovalMode = "always" | "sensitive_only" | "never";

export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.mfa"
  | "chat.message"
  | "agent.run"
  | "file.upload"
  | "file.delete"
  | "integration.connect"
  | "integration.disconnect"
  | "automation.run"
  | "automation.approve"
  | "automation.reject"
  | "settings.update"
  | "kb.index"
  | "desktop.action"
  | "mobile.action";

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export const AGENT_ROLES: AgentRole[] = [
  "ceo",
  "coo",
  "project_manager",
  "developer",
  "designer",
  "finance_manager",
  "marketing_manager",
  "customer_support",
  "legal_assistant",
  "research_assistant",
  "social_media_manager",
  "sales_manager",
];

export const INTEGRATION_CATEGORIES = {
  productivity: ["notion", "trello", "clickup"] as IntegrationProvider[],
  communication: ["slack", "discord"] as IntegrationProvider[],
  development: ["github", "gitlab"] as IntegrationProvider[],
  payments: ["stripe", "paypal"] as IntegrationProvider[],
  commerce: ["shopify", "woocommerce"] as IntegrationProvider[],
  social: [
    "x",
    "facebook",
    "instagram",
    "tiktok",
    "linkedin",
    "youtube",
  ] as IntegrationProvider[],
  storage: ["google_drive", "dropbox", "onedrive"] as IntegrationProvider[],
  email: ["gmail", "outlook"] as IntegrationProvider[],
  calendar: [
    "google_calendar",
    "outlook_calendar",
    "apple_calendar",
  ] as IntegrationProvider[],
} as const;

export const SENSITIVE_AUTOMATION_ACTIONS = [
  "send_message",
  "publish_content",
  "modify_data",
  "delete_data",
  "charge_payment",
  "send_email",
] as const;

export type SensitiveAutomationAction =
  (typeof SENSITIVE_AUTOMATION_ACTIONS)[number];
