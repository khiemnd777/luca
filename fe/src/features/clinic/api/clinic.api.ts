import type { FetchTableOpts } from "@core/table/table.types";
import type { ListResult } from "@core/types/list-result";
import type { ClinicModel } from "@features/clinic/model/clinic.model";
import type { ClinicCatalogOverviewModel } from "@features/clinic/model/clinic-catalog-overview.model";
import type { ClinicOverviewModel } from "@features/clinic/model/clinic-overview.model";
import type { OrderModel } from "@features/order/model/order.model";
import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import { mapper } from "@core/mapper/auto-mapper";
import type { SearchOpts, SearchResult } from "@core/types/search.types";

export async function tableByDentistId(dentistId: number, tableOpts: FetchTableOpts): Promise<ListResult<ClinicModel>> {
  dentistId = dentistId === undefined ? -1 : dentistId;
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/dentist/${dentistId}/clinics`, tableOpts);
  const result = mapper.map<any[], ListResult<ClinicModel>>("Clinic", data, "dto_to_model");
  return result;
}

export async function tableByPatientId(patientId: number, tableOpts: FetchTableOpts): Promise<ListResult<ClinicModel>> {
  patientId = patientId === undefined ? -1 : patientId;
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/patient/${patientId}/clinics`, tableOpts);
  const result = mapper.map<any[], ListResult<ClinicModel>>("Clinic", data, "dto_to_model");
  return result;
}

export async function orderTableByClinicId(clinicId: number, tableOpts: FetchTableOpts): Promise<ListResult<OrderModel>> {
  clinicId = clinicId === undefined ? -1 : clinicId;
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/clinic/${clinicId}/orders`, tableOpts);
  return mapper.map<any[], ListResult<OrderModel>>("Order", data, "dto_to_model");
}

// common api

export async function table(tableOpts: FetchTableOpts): Promise<ListResult<ClinicModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/clinic/list`, tableOpts);
  const result = mapper.map<any[], ListResult<ClinicModel>>("Clinic", data, "dto_to_model");
  return result;
}

export async function search(opts: SearchOpts): Promise<SearchResult<ClinicModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.search<any[]>(`${departmentApiPath()}/clinic/search`, opts);
  const result = mapper.map<any[], SearchResult<ClinicModel>>("Clinic", data, "dto_to_model");
  return result;
}

export async function id(id: number): Promise<ClinicModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/clinic/${id}`);
  const result = mapper.map<any, ClinicModel>("Clinic", data, "dto_to_model");
  return result;
}

export async function overview(clinicId: number): Promise<ClinicOverviewModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/order/clinic-overview/${clinicId}`);
  return mapper.map<any, ClinicOverviewModel>("ClinicOverview", data, "dto_to_model");
}

export async function catalogOverview(): Promise<ClinicCatalogOverviewModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/order/clinic-overview`);
  return mapper.map<any, ClinicCatalogOverviewModel>("ClinicCatalogOverview", data, "dto_to_model");
}

export async function create(model: ClinicModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.post<any>(`${departmentApiPath()}/clinic`, model);
}

export async function update(model: ClinicModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.put<any>(`${departmentApiPath()}/clinic/${model.id}`, model);
}

export async function unlink(id: number): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.delete<any>(`${departmentApiPath()}/clinic/${id}`);
}
