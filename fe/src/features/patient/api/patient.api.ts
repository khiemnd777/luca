import type { FetchTableOpts } from "@core/table/table.types";
import type { ListResult } from "@core/types/list-result";
import type { PatientModel } from "@features/patient/model/patient.model";
import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import { mapper } from "@core/mapper/auto-mapper";
import type { SearchOpts, SearchResult } from "@core/types/search.types";

export async function tableByClinicId(clinicId: number | undefined, tableOpts: FetchTableOpts): Promise<ListResult<PatientModel>> {
  clinicId = clinicId === undefined ? - 1 : clinicId;
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/clinic/${clinicId}/patients`, tableOpts);
  const result = mapper.map<any[], ListResult<PatientModel>>("Patient", data, "dto_to_model");
  return result;
}

// common api
export async function table(tableOpts: FetchTableOpts): Promise<ListResult<PatientModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/patient/list`, tableOpts);
  const result = mapper.map<any[], ListResult<PatientModel>>("Patient", data, "dto_to_model");
  return result;
}

export async function search(opts: SearchOpts): Promise<SearchResult<PatientModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.search<any[]>(`${departmentApiPath()}/patient/search`, opts);
  const result = mapper.map<any[], SearchResult<PatientModel>>("Patient", data, "dto_to_model");
  return result;
}

export async function id(id: number): Promise<PatientModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/patient/${id}`);
  const result = mapper.map<any, PatientModel>("Patient", data, "dto_to_model");
  return result;
}

export async function create(model: PatientModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.post<any>(`${departmentApiPath()}/patient`, model);
}

export async function update(model: PatientModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.put<any>(`${departmentApiPath()}/patient/${model.id}`, model);
}

export async function unlink(id: number): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.delete<any>(`${departmentApiPath()}/patient/${id}`);
}
