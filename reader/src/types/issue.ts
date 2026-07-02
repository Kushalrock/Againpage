export type ConnectionFlavor = "discovery" | "reminder";
export interface Connection { flavor: ConnectionFlavor; a: string; b: string; overlap: string; text: string; }
export interface StandaloneSummary { note: string; source: string; text: string; }
export interface Question { text: string; }
export interface Wildcard { bridge: string; trivia: string; }
export interface Forgotten { note: string; nudge: string; }
export interface IssueContent {
  title: string;                    // edition title (e.g. "Amor Fati")
  dek: string;                      // "Today's edition · ..." kicker
  standfirst: string;               // italic sub-headline under the title
  sources: string[];                // note titles composing the edition
  lead: string;                     // markdown; reader renders drop-cap + subheads + quotes + lists
  connections: Connection[];
  standalone_summaries: StandaloneSummary[];
  questions: Question[];
  apply: string[];
  wildcard: Wildcard | null;
  forgotten: Forgotten | null;
}
export interface IssueResponse {
  id: string; issue_no: number; issue_date: string;  // ISO date
  reading_min: number; theme_label: string;
  content: IssueContent;
}
