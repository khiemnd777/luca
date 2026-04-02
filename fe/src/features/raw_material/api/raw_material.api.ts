import type { FetchTableOpts } from "@core/table/table.types";
import type { ListResult } from "@core/types/list-result";
import type { RawMaterialImportResult, RawMaterialModel } from "@features/raw_material/model/raw_material.model";
import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import { mapper } from "@core/mapper/auto-mapper";
import type { SearchOpts, SearchResult } from "@core/types/search.types";

export async function table(tableOpts: FetchTableOpts, categoryId?: number | null): Promise<ListResult<RawMaterialModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const opts = categoryId ? { ...tableOpts, categoryId } : tableOpts;
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/raw_material/list`, opts as FetchTableOpts);
  const result = mapper.map<any[], ListResult<RawMaterialModel>>("RawMaterial", data, "dto_to_model");
  return result;
}

export async function search(opts: SearchOpts, categoryId?: number | null): Promise<SearchResult<RawMaterialModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const params = categoryId ? { ...opts, categoryId } : opts;
  const { data } = await apiClient.search<any[]>(`${departmentApiPath()}/raw_material/search`, params as SearchOpts);
  const result = mapper.map<any[], SearchResult<RawMaterialModel>>("RawMaterial", data, "dto_to_model");
  return result;
}

export async function id(id: number): Promise<RawMaterialModel> {
  const { departmentApiPath } = useAuthStore.getState();
  id = id === undefined ? -1 : id;
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/raw_material/${id}`);
  const result = mapper.map<any, RawMaterialModel>("RawMaterial", data, "dto_to_model");
  return result;
}

export async function create(model: RawMaterialModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.post<any>(`${departmentApiPath()}/raw_material`, model);
}

export async function update(model: RawMaterialModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.put<any>(`${departmentApiPath()}/raw_material/${model.id}`, model);
}

export async function unlink(id: number): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.delete<any>(`${departmentApiPath()}/raw_material/${id}`);
}

export async function importExcel(file: File): Promise<RawMaterialImportResult> {
  const { departmentApiPath } = useAuthStore.getState();
  const formData = new FormData();
  formData.append("file", file, file.name);
  const { data } = await apiClient.post<any>(`${departmentApiPath()}/raw_material/import-excel`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data as RawMaterialImportResult;
}
