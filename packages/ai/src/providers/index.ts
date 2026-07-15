import type { AiProvider } from "@nexa/shared";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModelV1 } from "ai";

export interface ProviderConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  googleAiApiKey?: string;
  deepseekApiKey?: string;
  openrouterApiKey?: string;
}

/**
 * Resolve a language model for the given provider + model id.
 * DeepSeek and OpenRouter use OpenAI-compatible APIs.
 */
export function getLanguageModel(
  provider: AiProvider,
  model: string,
  config: ProviderConfig = {},
): LanguageModelV1 {
  switch (provider) {
    case "openai": {
      const openai = createOpenAI({
        apiKey: config.openaiApiKey ?? process.env.OPENAI_API_KEY,
      });
      return openai(model);
    }
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: config.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY,
      });
      return anthropic(model);
    }
    case "gemini": {
      const google = createGoogleGenerativeAI({
        apiKey: config.googleAiApiKey ?? process.env.GOOGLE_AI_API_KEY,
      });
      return google(model);
    }
    case "deepseek": {
      const deepseek = createOpenAI({
        apiKey: config.deepseekApiKey ?? process.env.DEEPSEEK_API_KEY,
        baseURL: "https://api.deepseek.com/v1",
      });
      return deepseek(model);
    }
    case "openrouter": {
      const openrouter = createOpenAI({
        apiKey: config.openrouterApiKey ?? process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
      });
      return openrouter(model);
    }
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unsupported AI provider: ${_exhaustive}`);
    }
  }
}

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  openai: "gpt-4o",
  anthropic: "claude-sonnet-4-20250514",
  gemini: "gemini-2.0-flash",
  deepseek: "deepseek-chat",
  openrouter: "openrouter/auto",
};
