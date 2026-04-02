export interface SectionModel {
  id: number;
  leaderId?: number | null;
  leaderName?: string | null;
  name: string;
  code?: string;
  color?: string;
  customFields?: Record<string, any> | null;
  processIds?: number[] | null;
  processNames?: string | null;
  description: string;
  active: boolean;
}

export interface SectionImportResult {
  totalRows: number;
  added: number;
  skipped: number;
  errors?: string[];
}
