import type { FetchTableOpts } from "@core/table/table.types";
import type { ListResult } from "@core/types/list-result";
import type { CustomerModel } from "@features/customer/model/customer.model";
import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import { mapper } from "@core/mapper/auto-mapper";
import type { SearchOpts, SearchResult } from "@core/types/search.types";

export async function table(tableOpts: FetchTableOpts): Promise<ListResult<CustomerModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/customer/list`, tableOpts);
  const result = mapper.map<any[], ListResult<CustomerModel>>("Customer", data, "dto_to_model");
  return result;
}

export async function search(opts: SearchOpts): Promise<SearchResult<CustomerModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.search<any[]>(`${departmentApiPath()}/customer/search`, opts);
  const result = mapper.map<any[], SearchResult<CustomerModel>>("Customer", data, "dto_to_model");
  return result;
}

export async function id(id: number): Promise<CustomerModel> {
  const { departmentApiPath } = useAuthStore.getState();
  id = id === undefined ? -1 : id;
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/customer/${id}`);
  const result = mapper.map<any, CustomerModel>("Customer", data, "dto_to_model");
  return result;
}

export async function create(model: CustomerModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.post<any>(`${departmentApiPath()}/customer`, model);
}

export async function update(model: CustomerModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.put<any>(`${departmentApiPath()}/customer/${model.id}`, model);
}

export async function unlink(id: number): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.delete<any>(`${departmentApiPath()}/customer/${id}`);
}
