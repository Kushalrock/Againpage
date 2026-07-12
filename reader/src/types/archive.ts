export interface ArchiveItem { id: string; issue_no: number; date: string; title: string; dek: string; tags: string[]; reading_min: number; active: boolean; favorite: boolean; }
export interface ArchiveGroup { label: string; items: ArchiveItem[]; }
export interface ArchiveResponse { groups: ArchiveGroup[]; total: number; }
