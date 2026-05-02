import type { FetchTableOpts } from "@core/table/table.types";
import type { ListResult } from "@core/types/list-result";
import type { StaffModel } from "@features/staff/model/staff.model";
import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import { mapper } from "@core/mapper/auto-mapper";
import type { SearchOpts, SearchResult } from "@core/types/search.types";

function staffDeptPath(departmentId?: number): string {
  const { departmentApiPath } = useAuthStore.getState();
  const current = departmentApiPath();
  if (!departmentId || departmentId <= 0) return current;
  return current.replace(/\/\d+$/, `/${departmentId}`);
}

export async function getBySectionId(sectionId: number | undefined, tableOpts: FetchTableOpts): Promise<ListResult<StaffModel>> {
  sectionId = sectionId === undefined ? - 1 : sectionId;
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<unknown[]>(`${departmentApiPath()}/section/${sectionId}/staffs`, tableOpts);
  const result = mapper.map<unknown[], ListResult<StaffModel>>("Staff", data, "dto_to_model");
  return result;
}

export async function getByRoleName(roleName: string, tableOpts: FetchTableOpts): Promise<ListResult<StaffModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<unknown[]>(`${departmentApiPath()}/role/${roleName}/staffs`, tableOpts);
  const result = mapper.map<unknown[], ListResult<StaffModel>>("Staff", data, "dto_to_model");
  return result;
}

export async function existsPhone({ id, phone }: { id: number | undefined, phone: string }): Promise<boolean> {
  id = id === undefined ? -1 : id;
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.post<boolean>(`${departmentApiPath()}/staff/${id}/exists-phone`, { phone });
  return data;
}

export async function existsEmail({ id, email }: { id: number | undefined, email: string }): Promise<boolean> {
  id = id === undefined ? -1 : id;
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.post<boolean>(`${departmentApiPath()}/staff/${id}/exists-email`, { email });
  return data;
}

export async function searchWithRoleName(roleName: string, opts: SearchOpts): Promise<SearchResult<StaffModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.search<unknown[]>(`${departmentApiPath()}/staff/role/${roleName}/search`, opts);
  const result = mapper.map<unknown[], SearchResult<StaffModel>>("Staff", data, "dto_to_model");
  return result;
}

// general api
export async function table(tableOpts: FetchTableOpts): Promise<ListResult<StaffModel>> {
  return tableByDepartment(undefined, tableOpts);
}

export async function tableByDepartment(departmentId: number | undefined, tableOpts: FetchTableOpts): Promise<ListResult<StaffModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const basePath = departmentId && departmentId > 0 ? staffDeptPath(departmentId) : departmentApiPath();
  const { data } = await apiClient.getTable<unknown[]>(`${basePath}/staff/list`, tableOpts);
  const result = mapper.map<unknown[], ListResult<StaffModel>>("Staff", data, "dto_to_model");
  return result;
}

export async function search(opts: SearchOpts): Promise<SearchResult<StaffModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.search<unknown[]>(`${departmentApiPath()}/staff/search`, opts);
  const result = mapper.map<unknown[], SearchResult<StaffModel>>("Staff", data, "dto_to_model");
  return result;
}

export async function id(id: number): Promise<StaffModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<unknown>(`${departmentApiPath()}/staff/${id}`);
  const result = mapper.map<unknown, StaffModel>("Staff", data, "dto_to_model");
  return result;
}

export async function create(model: StaffModel): Promise<void> {
  return createForDepartment(undefined, model);
}

export async function createForDepartment(departmentId: number | undefined, model: StaffModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  const basePath = departmentId && departmentId > 0 ? staffDeptPath(departmentId) : departmentApiPath();
  await apiClient.post<unknown>(`${basePath}/staff`, model);
}

export async function update(model: StaffModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.put<unknown>(`${departmentApiPath()}/staff/${model.id}`, model);
}

export async function assignDepartment(staffId: number, departmentId: number): Promise<StaffModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.post<unknown>(`${departmentApiPath()}/staff/${staffId}/assign-department`, {
    department_id: departmentId,
  });
  const result = mapper.map<unknown, StaffModel>("Staff", data, "dto_to_model");
  return result;
}

export async function assignCorporateAdminToDepartment(userId: number, departmentId: number): Promise<void> {
  const basePath = staffDeptPath(departmentId);
  await apiClient.post<unknown>(`${basePath}/staff/${userId}/assign-corporate-admin-department`, {
    department_id: departmentId,
  });
}

export async function unassignCorporateAdminFromDepartment(userId: number, departmentId: number): Promise<void> {
  const basePath = staffDeptPath(departmentId);
  await apiClient.post<unknown>(`${basePath}/staff/${userId}/unassign-corporate-admin-department`, {
    department_id: departmentId,
  });
}

export async function unlink(id: number): Promise<void> {
  return unlinkFromDepartment(undefined, id);
}

export async function unlinkFromDepartment(departmentId: number | undefined, id: number): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  const basePath = departmentId && departmentId > 0 ? staffDeptPath(departmentId) : departmentApiPath();
  await apiClient.delete<unknown>(`${basePath}/staff/${id}`);
}
