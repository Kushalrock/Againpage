export type Provider = "openrouter" | "ollama" | "custom";
export type Cadence = "daily" | "few_days" | "weekly" | "biweekly";
export interface Settings {
  vault_path: string; excluded_paths: string[]; profile_text: string;
  cadence: Cadence; delivery_time: string; reading_min: number; notes_per_issue: number;
  provider: Provider; ollama_endpoint: string;
  embed_model: string; summary_model: string; writer_model: string;
}
export type SettingsResponse = Settings & { vault_note_count: number };
export type SettingsPatch = Partial<Settings>;
export interface ProviderTestRequest { provider: Provider; ollama_endpoint: string; embed_model: string; summary_model: string; writer_model: string; }
export interface ProviderTestResult { ok: boolean; reachable: boolean; models: Record<string, boolean>; detail: string; }
export interface VaultStatus { vault_path: string; note_count: number; scanned_at: string; }
