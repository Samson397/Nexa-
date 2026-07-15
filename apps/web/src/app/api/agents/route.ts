import { AGENT_DEFINITIONS, listAgentDefinitions } from "@nexa/ai";
import { handleRouteError, jsonOk, rateLimitByIp } from "@/lib/api";

export const runtime = "nodejs";

/**
 * GET /api/agents — list built-in AI employee definitions from @nexa/ai.
 */
export async function GET(request: Request) {
  try {
    const limited = rateLimitByIp(request, {
      name: "agents",
      limit: 120,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const agents = listAgentDefinitions().map((agent) => ({
      role: agent.role,
      name: agent.name,
      description: agent.description,
      personality: agent.personality,
      tools: agent.tools,
      permissions: agent.permissions,
      defaultModel: agent.defaultModel,
      defaultProvider: agent.defaultProvider,
      // systemPrompt intentionally omitted from list for payload size;
      // chat route loads it server-side via getAgentDefinition.
    }));

    return jsonOk({
      items: agents,
      total: agents.length,
      roles: Object.keys(AGENT_DEFINITIONS),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
