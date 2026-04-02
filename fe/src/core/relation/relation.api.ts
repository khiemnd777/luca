import { useAuthStore } from "@store/auth-store";
import type { FetchTableOpts } from "../table/table.types";
import type { ListResult } from "../types/list-result";
import { apiClient } from "../network/api-client";
import { mapper } from "../mapper/auto-mapper";
import type { SearchOpts, SearchResult } from "../types/search.types";

export async function rel1<T>(key: string, refId: number): Promise<T> {
  const { departmentApiPath } = useAuthStore.getState();
  refId = refId === undefined ? -1 : refId;
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/relation/${key}/${refId}/one`);
  const result = mapper.map<any, T>("Common", data, "dto_to_model");
  return result;
}

export async function rel1n<T>(key: string, mainId: number, tableOpts: FetchTableOpts): Promise<ListResult<T>> {
  const { departmentApiPath } = useAuthStore.getState();
  mainId = mainId === undefined ? -1 : mainId;
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/relation/${key}/${mainId}/1n/list`, tableOpts);
  const result = mapper.map<any[], ListResult<T>>("Common", data, "dto_to_model");
  return result;
}

export async function relM2m<T>(key: string, mainId: number, tableOpts: FetchTableOpts): Promise<ListResult<T>> {
  const { departmentApiPath } = useAuthStore.getState();
  mainId = mainId === undefined ? -1 : mainId;
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/relation/${key}/${mainId}/m2m/list`, tableOpts);
  const result = mapper.map<any[], ListResult<T>>("Common", data, "dto_to_model");
  return result;
}

export async function search<T>(key: string, opts: SearchOpts): Promise<SearchResult<T>> {
  const { departmentApiPath } = useAuthStore.getState();
  console.log(opts);
  const { data } = await apiClient.search<any>(`${departmentApiPath()}/relation/${key}/search`, opts);
  const result = mapper.map<any, SearchResult<T>>("Common", data, "dto_to_model");
  return result;
}
