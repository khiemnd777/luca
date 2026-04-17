import type { FetchTableOpts } from "@core/table/table.types";
import type { ListResult } from "@core/types/list-result";
import type { ProcessCatalogOverviewModel } from "@features/process/model/process-catalog-overview.model";
import type { ProcessImportResult, ProcessModel } from "@features/process/model/process.model";
import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import { mapper } from "@core/mapper/auto-mapper";
import type { SearchOpts, SearchResult } from "@core/types/search.types";

export async function listBySectionID(sectionId: number, tableOpts: FetchTableOpts): Promise<ListResult<ProcessModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/section/${sectionId}/processes`, tableOpts);
  const result = mapper.map<any[], ListResult<ProcessModel>>("Process", data, "dto_to_model");
  return result;
}

export async function table(tableOpts: FetchTableOpts): Promise<ListResult<ProcessModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/process/list`, tableOpts);
  const result = mapper.map<any[], ListResult<ProcessModel>>("Process", data, "dto_to_model");
  return result;
}

export async function search(opts: SearchOpts): Promise<SearchResult<ProcessModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.search<any[]>(`${departmentApiPath()}/process/search`, opts);
  const result = mapper.map<any[], SearchResult<ProcessModel>>("Process", data, "dto_to_model");
  return result;
}

export async function id(id: number): Promise<ProcessModel> {
  const { departmentApiPath } = useAuthStore.getState();
  id = id === undefined ? -1 : id;
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/process/${id}`);
  const result = mapper.map<any, ProcessModel>("Process", data, "dto_to_model");
  return result;
}

export async function catalogOverview(): Promise<ProcessCatalogOverviewModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/order/process-overview`);
  return mapper.map<any, ProcessCatalogOverviewModel>("ProcessCatalogOverview", data, "dto_to_model");
}

export async function create(model: ProcessModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.post<any>(`${departmentApiPath()}/process`, model);
}

export async function update(model: ProcessModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.put<any>(`${departmentApiPath()}/process/${model.id}`, model);
}

export async function unlink(id: number): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.delete<any>(`${departmentApiPath()}/process/${id}`);
}

export async function importExcel(file: File): Promise<ProcessImportResult> {
  const { departmentApiPath } = useAuthStore.getState();
  const formData = new FormData();
  formData.append("file", file, file.name);
  const { data } = await apiClient.post<any>(`${departmentApiPath()}/process/import-excel`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data as ProcessImportResult;
}
