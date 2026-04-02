
export type SortDir = "asc" | "desc";

export interface SearchResult<T> {
  items: T[];
  hasMore: boolean;
  total: number | null;
}

export type SearchOpts = {
  keyword: string;
  limit: number;
  page: number;
  orderBy?: string | null;
  direction?: SortDir;
  extendWhere?: string[] | null;
};
