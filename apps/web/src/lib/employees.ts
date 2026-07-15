import type { AgentRole } from "@nexa/shared";
import {
  AGENT_DEFINITIONS,
  listAgentDefinitions,
} from "@nexa/ai/agents";

export type EmployeeStatus = "online" | "busy" | "idle";

const STATUS_MAP: Record<AgentRole, EmployeeStatus> = {
  ceo: "online",
  coo: "busy",
  project_manager: "online",
  developer: "busy",
  designer: "idle",
  finance_manager: "online",
  marketing_manager: "online",
  customer_support: "busy",
  legal_assistant: "idle",
  research_assistant: "online",
  social_media_manager: "online",
  sales_manager: "busy",
};

export function getEmployees() {
  return listAgentDefinitions().map((agent) => ({
    ...agent,
    status: STATUS_MAP[agent.role],
    title: agent.role
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
  }));
}

export function getEmployee(role: string) {
  if (!(role in AGENT_DEFINITIONS)) return null;
  const agent = AGENT_DEFINITIONS[role as AgentRole];
  return {
    ...agent,
    status: STATUS_MAP[agent.role],
    title: agent.role
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
  };
}
