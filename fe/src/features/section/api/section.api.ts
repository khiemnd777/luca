import type { FetchTableOpts } from "@core/table/table.types";
import type { ListResult } from "@core/types/list-result";
import type { SectionImportResult, SectionModel } from "@features/section/model/section.model";
import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import { mapper } from "@core/mapper/auto-mapper";
import type { SearchOpts, SearchResult } from "@root/core/types/search.types";

export async function tableByStaffId(staffId: number, tableOpts: FetchTableOpts): Promise<ListResult<SectionModel>> {
  staffId = staffId === undefined ? - 1 : staffId;
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/staff/${staffId}/sections`, tableOpts);
  const result = mapper.map<any[], ListResult<SectionModel>>("Section", data, "dto_to_model");
  return result;
}

// common api

export async function table(tableOpts: FetchTableOpts): Promise<ListResult<SectionModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/section/list`, tableOpts);
  const result = mapper.map<any[], ListResult<SectionModel>>("Section", data, "dto_to_model");
  return result;
}

export async function search(opts: SearchOpts): Promise<SearchResult<SectionModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.search<any[]>(`${departmentApiPath()}/section/search`, opts);
  const result = mapper.map<any[], SearchResult<SectionModel>>("Section", data, "dto_to_model");
  return result;
}

export async function id(id: number): Promise<SectionModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/section/${id}`);
  const result = mapper.map<any, SectionModel>("Section", data, "dto_to_model");
  return result;
}

export async function create(model: SectionModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.post<any>(`${departmentApiPath()}/section`, model);
}

export async function update(model: SectionModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.put<any>(`${departmentApiPath()}/section/${model.id}`, model);
}

export async function unlink(id: number): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.delete<any>(`${departmentApiPath()}/section/${id}`);
}

export async function importExcel(file: File): Promise<SectionImportResult> {
  const { departmentApiPath } = useAuthStore.getState();
  const formData = new FormData();
  formData.append("file", file, file.name);
  const { data } = await apiClient.post<any>(`${departmentApiPath()}/section/import-excel`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data as SectionImportResult;
}
