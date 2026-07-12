export type Provider = "openrouter" | "ollama" | "custom";
export interface Settings {
  vault_paths: string[]; excluded_paths: string[]; profile_text: string;
  cadence_days: number; delivery_time: string; timezone: string; reading_min: number; notes_per_issue: number;
  provider: Provider; ollama_endpoint: string;
  embed_model: string; summary_model: string; writer_model: string;
  writer_prompt: string; note_expand_prompt: string; note_expand_words: number;
  sync_interval_minutes: number;
  has_openrouter_key?: boolean; has_ollama_key?: boolean;   // returned: whether a key is saved
  openrouter_key?: string; ollama_key?: string;             // write-only in a patch; never returned
}
export type SettingsResponse = Settings & {
  vault_note_count: number;
  engine_version?: string;      // response-only; absent on an engine too old to advertise it
  min_reader_version?: string;
};
export type SettingsPatch = Partial<Settings>;
export interface ProviderTestRequest { provider: Provider; ollama_endpoint: string; embed_model: string; summary_model: string; writer_model: string; }
export interface ProviderTestResult { ok: boolean; reachable: boolean; models: Record<string, boolean>; detail: string; }
export interface VaultStatus { vault_paths: string[]; note_count: number; scanned_at: string; }
