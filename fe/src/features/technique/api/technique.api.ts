import type { FetchTableOpts } from "@core/table/table.types";
import type { ListResult } from "@core/types/list-result";
import type { TechniqueImportResult, TechniqueModel } from "@features/technique/model/technique.model";
import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import { mapper } from "@core/mapper/auto-mapper";
import type { SearchOpts, SearchResult } from "@core/types/search.types";

export async function table(tableOpts: FetchTableOpts, categoryId?: number | null): Promise<ListResult<TechniqueModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const opts = categoryId ? { ...tableOpts, categoryId } : tableOpts;
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/technique/list`, opts as FetchTableOpts);
  const result = mapper.map<any[], ListResult<TechniqueModel>>("Technique", data, "dto_to_model");
  return result;
}

export async function search(opts: SearchOpts, categoryId?: number | null): Promise<SearchResult<TechniqueModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const params = categoryId ? { ...opts, categoryId } : opts;
  const { data } = await apiClient.search<any[]>(`${departmentApiPath()}/technique/search`, params as SearchOpts);
  const result = mapper.map<any[], SearchResult<TechniqueModel>>("Technique", data, "dto_to_model");
  return result;
}

export async function id(id: number): Promise<TechniqueModel> {
  const { departmentApiPath } = useAuthStore.getState();
  id = id === undefined ? -1 : id;
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/technique/${id}`);
  const result = mapper.map<any, TechniqueModel>("Technique", data, "dto_to_model");
  return result;
}

export async function create(model: TechniqueModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.post<any>(`${departmentApiPath()}/technique`, model);
}

export async function update(model: TechniqueModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.put<any>(`${departmentApiPath()}/technique/${model.id}`, model);
}

export async function unlink(id: number): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.delete<any>(`${departmentApiPath()}/technique/${id}`);
}

export async function importExcel(file: File): Promise<TechniqueImportResult> {
  const { departmentApiPath } = useAuthStore.getState();
  const formData = new FormData();
  formData.append("file", file, file.name);
  const { data } = await apiClient.post<any>(`${departmentApiPath()}/technique/import-excel`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data as TechniqueImportResult;
}
