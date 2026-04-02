import type { FetchTableOpts } from "@core/table/table.types";
import type { ListResult } from "@core/types/list-result";
import type { RestorationTypeImportResult, RestorationTypeModel } from "@features/restoration_type/model/restoration_type.model";
import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import { mapper } from "@core/mapper/auto-mapper";
import type { SearchOpts, SearchResult } from "@core/types/search.types";

export async function table(tableOpts: FetchTableOpts, categoryId?: number | null): Promise<ListResult<RestorationTypeModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const opts = categoryId ? { ...tableOpts, categoryId } : tableOpts;
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/restoration_type/list`, opts as FetchTableOpts);
  const result = mapper.map<any[], ListResult<RestorationTypeModel>>("RestorationType", data, "dto_to_model");
  return result;
}

export async function search(opts: SearchOpts, categoryId?: number | null): Promise<SearchResult<RestorationTypeModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const params = categoryId ? { ...opts, categoryId } : opts;
  const { data } = await apiClient.search<any[]>(`${departmentApiPath()}/restoration_type/search`, params as SearchOpts);
  const result = mapper.map<any[], SearchResult<RestorationTypeModel>>("RestorationType", data, "dto_to_model");
  return result;
}

export async function id(id: number): Promise<RestorationTypeModel> {
  const { departmentApiPath } = useAuthStore.getState();
  id = id === undefined ? -1 : id;
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/restoration_type/${id}`);
  const result = mapper.map<any, RestorationTypeModel>("RestorationType", data, "dto_to_model");
  return result;
}

export async function create(model: RestorationTypeModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.post<any>(`${departmentApiPath()}/restoration_type`, model);
}

export async function update(model: RestorationTypeModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.put<any>(`${departmentApiPath()}/restoration_type/${model.id}`, model);
}

export async function unlink(id: number): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.delete<any>(`${departmentApiPath()}/restoration_type/${id}`);
}

export async function importExcel(file: File): Promise<RestorationTypeImportResult> {
  const { departmentApiPath } = useAuthStore.getState();
  const formData = new FormData();
  formData.append("file", file, file.name);
  const { data } = await apiClient.post<any>(`${departmentApiPath()}/restoration_type/import-excel`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data as RestorationTypeImportResult;
}
