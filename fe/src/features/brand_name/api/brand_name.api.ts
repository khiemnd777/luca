import type { FetchTableOpts } from "@core/table/table.types";
import type { ListResult } from "@core/types/list-result";
import type { BrandNameImportResult, BrandNameModel } from "@features/brand_name/model/brand_name.model";
import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import { mapper } from "@core/mapper/auto-mapper";
import type { SearchOpts, SearchResult } from "@core/types/search.types";

export async function table(tableOpts: FetchTableOpts, categoryId?: number | null): Promise<ListResult<BrandNameModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const opts = categoryId ? { ...tableOpts, categoryId } : tableOpts;
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/brand/list`, opts as FetchTableOpts);
  const result = mapper.map<any[], ListResult<BrandNameModel>>("BrandName", data, "dto_to_model");
  return result;
}

export async function search(opts: SearchOpts, categoryId?: number | null): Promise<SearchResult<BrandNameModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const params = categoryId ? { ...opts, categoryId } : opts;
  const { data } = await apiClient.search<any[]>(`${departmentApiPath()}/brand/search`, params as SearchOpts);
  const result = mapper.map<any[], SearchResult<BrandNameModel>>("BrandName", data, "dto_to_model");
  return result;
}

export async function id(id: number): Promise<BrandNameModel> {
  const { departmentApiPath } = useAuthStore.getState();
  id = id === undefined ? -1 : id;
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/brand/${id}`);
  const result = mapper.map<any, BrandNameModel>("BrandName", data, "dto_to_model");
  return result;
}

export async function create(model: BrandNameModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.post<any>(`${departmentApiPath()}/brand`, model);
}

export async function update(model: BrandNameModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.put<any>(`${departmentApiPath()}/brand/${model.id}`, model);
}

export async function unlink(id: number): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.delete<any>(`${departmentApiPath()}/brand/${id}`);
}

export async function importExcel(file: File): Promise<BrandNameImportResult> {
  const { departmentApiPath } = useAuthStore.getState();
  const formData = new FormData();
  formData.append("file", file, file.name);
  const { data } = await apiClient.post<any>(`${departmentApiPath()}/brand/import-excel`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data as BrandNameImportResult;
}
