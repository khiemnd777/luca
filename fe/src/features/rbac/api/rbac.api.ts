import type { RoleModel } from "@root/features/rbac/model/role.model";
import { env } from "@core/config/env";
import { mapper } from "@core/mapper/auto-mapper";
import { apiClient } from "@core/network/api-client";
import type { ListResult } from "@core/types/list-result";
import type { FetchTableOpts } from "@core/table/table.types";
import type { MatrixPermission } from "@core/network/rbac.types";
import type { SearchOpts, SearchResult } from "@core/types/search.types";

export async function fetchRolesByUserId(userId: number | undefined, tableOpts: FetchTableOpts): Promise<ListResult<RoleModel>> {
  userId = userId === undefined ? -1 : userId;
  const { data } = await apiClient.getTable<any[]>(`${env.apiBasePath}/rbac/user/${userId}/roles`, tableOpts);
  const result = mapper.map<any[], ListResult<RoleModel>>("Role", data, "dto_to_model");
  return result;
}

export async function fetchRoles(tableOpts: FetchTableOpts): Promise<ListResult<RoleModel>> {
  const { data } = await apiClient.getTable<any[]>(`${env.apiBasePath}/rbac/roles`, tableOpts);
  const result = mapper.map<any[], ListResult<RoleModel>>("Role", data, "dto_to_model");
  return result;
}

export async function fetchRoleByID(id: number): Promise<RoleModel> {
  const { data } = await apiClient.get<any>(`${env.apiBasePath}/rbac/roles/${id}`);
  const result = mapper.map<any, RoleModel>("Role", data, "dto_to_model");
  return result;
}

export async function search(opts: SearchOpts): Promise<SearchResult<RoleModel>> {
  const { data } = await apiClient.search<any[]>(`${env.apiBasePath}/rbac/roles/search`, opts);
  const result = mapper.map<any[], SearchResult<RoleModel>>("Role", data, "dto_to_model");
  return result;
}

export async function createRole(model: RoleModel): Promise<void> {
  await apiClient.post<any>(`${env.apiBasePath}/rbac/roles`, model);
}

export async function updateRole(model: RoleModel): Promise<void> {
  await apiClient.put<any>(`${env.apiBasePath}/rbac/roles/${model.id}`, model);
}

export async function fetchRBACMatrix(signal?: AbortSignal): Promise<MatrixPermission | null> {
  const { data } = await apiClient.get<any>(`${env.apiBasePath}/rbac/matrix`, {
    signal,
  });
  if (!data) {
    return null;
  }
  const result = mapper.map<any, MatrixPermission>("MatrixPermission", data, "dto_to_model");
  return result;
}

export async function replaceRBAC({ roleId, permIds }: { roleId: number; permIds: number[]; }): Promise<void> {
  const data = mapper.map<any, any>("Common", { roleId, permIds }, "model_to_dto");
  await apiClient.post<any>(`${env.apiBasePath}/rbac/matrix/replace`, data);
}