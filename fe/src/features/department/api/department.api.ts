import type { FetchTableOpts } from "@core/table/table.types";
import type { ListResult } from "@core/types/list-result";
import { mapper } from "@core/mapper/auto-mapper";
import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import type { DeparmentModel } from "@root/features/department/model/department.model";

function deptPath(deptId?: number): string {
  const { departmentApiPath } = useAuthStore.getState();
  const current = departmentApiPath();
  if (!deptId || deptId <= 0) return current;
  return current.replace(/\/\d+$/, `/${deptId}`);
}

export async function list(tableOpts: FetchTableOpts): Promise<ListResult<DeparmentModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(departmentApiPath(), tableOpts);
  const result = mapper.map<any[], ListResult<DeparmentModel>>("Department", data, "dto_to_model");
  return result;
}

export async function getById(deptId?: number): Promise<DeparmentModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/child/${deptId}`);
  return mapper.map<any, DeparmentModel>("Department", data, "dto_to_model");
}

export async function childrenList(tableOpts: FetchTableOpts): Promise<ListResult<DeparmentModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/children`, tableOpts);
  const result = mapper.map<any[], ListResult<DeparmentModel>>("Department", data, "dto_to_model");
  return result;
}

export async function create(deptId: number, model: DeparmentModel): Promise<DeparmentModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.post<any>(`${departmentApiPath()}/child/${deptId}`, model);
  const result = mapper.map<any, DeparmentModel>("Department", data, "dto_to_model");
  return result;
}

export async function update(deptId: number, model: DeparmentModel): Promise<DeparmentModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.put<any>(`${departmentApiPath()}/child/${deptId}`, model);
  const result = mapper.map<any, DeparmentModel>("Department", data, "dto_to_model");
  return result;
}

export async function unlink(deptId: number): Promise<{ success: boolean }> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.delete<{ success: boolean }>(`${departmentApiPath()}/child/${deptId}`);
  return data;
}

export async function myFirstDepartment(): Promise<DeparmentModel> {
  const { data } = await apiClient.get<any>(`${deptPath().replace(/\/\d+$/, "")}/me`);
  return mapper.map<any, DeparmentModel>("Department", data, "dto_to_model");
}
