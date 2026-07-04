import type { Provider } from '../types/settings'

/**
 * Sensible default model names per provider, applied when a provider is
 * selected (in Settings) or chosen during onboarding. These are real values
 * written to settings — not just input placeholders — so the engine receives
 * usable model names instead of empty strings.
 *
 * Note: OpenRouter is chat-only (no /embeddings endpoint), so the "custom"
 * provider is the working choice for the full pipeline — embeddings via a
 * local Ollama model, summarising + writing via OpenRouter.
 */
export const PROVIDER_DEFAULTS: Record<
  Provider,
  { embed_model: string; summary_model: string; writer_model: string }
> = {
  openrouter: {
    embed_model: 'openai/text-embedding-3-small',
    summary_model: 'openai/gpt-4o-mini',
    writer_model: 'anthropic/claude-3.5-sonnet',
  },
  ollama: {
    embed_model: 'nomic-embed-text',
    summary_model: 'llama3.1:8b',
    writer_model: 'llama3.1:70b',
  },
  custom: {
    embed_model: 'ollama/nomic-embed-text',
    summary_model: 'openrouter/openai/gpt-4o-mini',
    writer_model: 'openrouter/anthropic/claude-3.5-sonnet',
  },
}
