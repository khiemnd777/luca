import type { FetchTableOpts } from "@core/table/table.types";
import type { ListResult } from "@core/types/list-result";
import type { MaterialModel } from "@features/material/model/material.model";
import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import { mapper } from "@core/mapper/auto-mapper";
import type { SearchOpts, SearchResult } from "@core/types/search.types";

export async function table(tableOpts: FetchTableOpts): Promise<ListResult<MaterialModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/material/list`, tableOpts);
  const result = mapper.map<any[], ListResult<MaterialModel>>("Material", data, "dto_to_model");
  return result;
}

export async function search(opts: SearchOpts, type?: string): Promise<SearchResult<MaterialModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.search<any[]>(`${departmentApiPath()}/material/search`, {
    ...opts,
    type,
  });
  const result = mapper.map<any[], SearchResult<MaterialModel>>("Material", data, "dto_to_model");
  return result;
}

export async function id(id: number): Promise<MaterialModel> {
  const { departmentApiPath } = useAuthStore.getState();
  id = id === undefined ? -1 : id;
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/material/${id}`);
  const result = mapper.map<any, MaterialModel>("Material", data, "dto_to_model");
  return result;
}

export async function create(model: MaterialModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.post<any>(`${departmentApiPath()}/material`, model);
}

export async function update(model: MaterialModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.put<any>(`${departmentApiPath()}/material/${model.id}`, model);
}

export async function unlink(id: number): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.delete<any>(`${departmentApiPath()}/material/${id}`);
}
