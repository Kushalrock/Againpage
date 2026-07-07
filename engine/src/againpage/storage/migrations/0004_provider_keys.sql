-- Store provider API keys with the settings so they can be entered once via the
-- UI and reach the engine (no per-run .env). A real env var still overrides.
ALTER TABLE settings ADD COLUMN openrouter_key TEXT;
ALTER TABLE settings ADD COLUMN ollama_key TEXT;
