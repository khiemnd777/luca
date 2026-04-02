import type { FetchTableOpts } from "@core/table/table.types";
import type { ListResult } from "@core/types/list-result";
import type { DentistModel } from "@features/dentist/model/dentist.model";
import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import { mapper } from "@core/mapper/auto-mapper";
import type { SearchOpts, SearchResult } from "@core/types/search.types";

export async function tableByClinicId(clinicId: number | undefined, tableOpts: FetchTableOpts): Promise<ListResult<DentistModel>> {
  clinicId = clinicId === undefined ? - 1 : clinicId;
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/clinic/${clinicId}/dentists`, tableOpts);
  const result = mapper.map<any[], ListResult<DentistModel>>("Dentist", data, "dto_to_model");
  return result;
}

// common api
export async function table(tableOpts: FetchTableOpts): Promise<ListResult<DentistModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/dentist/list`, tableOpts);
  const result = mapper.map<any[], ListResult<DentistModel>>("Dentist", data, "dto_to_model");
  return result;
}

export async function search(opts: SearchOpts): Promise<SearchResult<DentistModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.search<any[]>(`${departmentApiPath()}/dentist/search`, opts);
  const result = mapper.map<any[], SearchResult<DentistModel>>("Dentist", data, "dto_to_model");
  return result;
}

export async function id(id: number): Promise<DentistModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/dentist/${id}`);
  const result = mapper.map<any, DentistModel>("Dentist", data, "dto_to_model");
  return result;
}

export async function create(model: DentistModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.post<any>(`${departmentApiPath()}/dentist`, model);
}

export async function update(model: DentistModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.put<any>(`${departmentApiPath()}/dentist/${model.id}`, model);
}

export async function unlink(id: number): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.delete<any>(`${departmentApiPath()}/dentist/${id}`);
}
