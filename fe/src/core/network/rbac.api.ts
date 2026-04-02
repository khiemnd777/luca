import { apiClient } from "@core/network/api-client";
import type { MatrixPermission, MyRoleDto } from "@root/core/network/rbac.types";
import { env } from "@core/config/env";
import { mapper } from "@core/mapper/auto-mapper";

export async function fetchMyRoles(): Promise<MyRoleDto[]> {
  const { data } = await apiClient.get<any[]>(`${env.apiBasePath}/rbac/roles/me`);
  const result = mapper.map<any[], MyRoleDto[]>("MyRole", data, "dto_to_model");
  return result;
}

export async function fetchMyMatrixPermissions(): Promise<MatrixPermission | null> {
  const { data } = await apiClient.get<any>(`${env.apiBasePath}/rbac/matrix/me`);
  if (!data) {
    return null;
  }
  const result = mapper.map<any, MatrixPermission>("MatrixPermission", data, "dto_to_model");
  return result;
}