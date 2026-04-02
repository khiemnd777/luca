import type { FetchTableOpts } from "@core/table/table.types";
import type { ListResult } from "@core/types/list-result";
import type { SupplierModel } from "@features/supplier/model/supplier.model";
import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import { mapper } from "@core/mapper/auto-mapper";
import type { SearchOpts, SearchResult } from "@core/types/search.types";

export async function tableByMaterialId(materialId: number | undefined, tableOpts: FetchTableOpts): Promise<ListResult<SupplierModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  materialId = materialId === undefined ? -1 : materialId;
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/material/${materialId}/suppliers`, tableOpts);
  const result = mapper.map<any[], ListResult<SupplierModel>>("Supplier", data, "dto_to_model");
  return result;
}

export async function table(tableOpts: FetchTableOpts): Promise<ListResult<SupplierModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/supplier/list`, tableOpts);
  const result = mapper.map<any[], ListResult<SupplierModel>>("Supplier", data, "dto_to_model");
  return result;
}

export async function search(opts: SearchOpts): Promise<SearchResult<SupplierModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.search<any[]>(`${departmentApiPath()}/supplier/search`, opts);
  const result = mapper.map<any[], SearchResult<SupplierModel>>("Supplier", data, "dto_to_model");
  return result;
}

export async function id(id: number): Promise<SupplierModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/supplier/${id}`);
  const result = mapper.map<any, SupplierModel>("Supplier", data, "dto_to_model");
  return result;
}

export async function create(model: SupplierModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.post<any>(`${departmentApiPath()}/supplier`, model);
}

export async function update(model: SupplierModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.put<any>(`${departmentApiPath()}/supplier/${model.id}`, model);
}

export async function unlink(id: number): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.delete<any>(`${departmentApiPath()}/supplier/${id}`);
}
