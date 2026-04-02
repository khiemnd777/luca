export type SearchModel = {
  entityType: string;
  entityId: number;
  title: string;
  subtitle?: string | null;
  keywords?: string | null;
  attributes?: Record<string, any>;
  rank?: number | null;
  updatedAt: string;
};