import type { FetchTableOpts } from "@core/table/table.types";
import type { ListResult } from "@core/types/list-result";
import type { SearchOpts, SearchResult } from "@core/types/search.types";
import { mapper } from "@core/mapper/auto-mapper";
import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import type { DeparmentModel } from "@root/features/department/model/department.model";
import type {
  DepartmentSyncApplyResultModel,
  DepartmentSyncPreviewModel,
} from "@features/department/model/department-sync.model";
import { buildDepartmentMutationWirePayload } from "@features/department/utils/department-phone.utils";

function deptPath(deptId?: number): string {
  const { departmentApiPath } = useAuthStore.getState();
  const current = departmentApiPath();
  if (!deptId || deptId <= 0) return current;
  return current.replace(/\/\d+$/, `/${deptId}`);
}

export async function list(tableOpts: FetchTableOpts): Promise<ListResult<DeparmentModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<unknown[]>(departmentApiPath(), tableOpts);
  const result = mapper.map<unknown[], ListResult<DeparmentModel>>("Department", data, "dto_to_model");
  return result;
}

export async function getById(deptId?: number): Promise<DeparmentModel> {
  const { data } = await apiClient.get<unknown>(`${deptPath(deptId)}/detail`);
  return mapper.map<unknown, DeparmentModel>("Department", data, "dto_to_model");
}

export async function childrenList(tableOpts: FetchTableOpts & { deptId?: number }): Promise<ListResult<DeparmentModel>> {
  const { data } = await apiClient.getTable<unknown[]>(`${deptPath(tableOpts.deptId)}/children`, tableOpts);
  const result = mapper.map<unknown[], ListResult<DeparmentModel>>("Department", data, "dto_to_model");
  return result;
}

export async function search(opts: SearchOpts): Promise<SearchResult<DeparmentModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.search<unknown[]>(`${departmentApiPath()}/search`, opts);
  const result = mapper.map<unknown[], SearchResult<DeparmentModel>>("Department", data, "dto_to_model");
  return result;
}

export async function create(deptId: number, model: DeparmentModel): Promise<DeparmentModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.post<unknown>(
    `${departmentApiPath()}/child/${deptId}`,
    buildDepartmentMutationWirePayload(model as unknown as Record<string, unknown>),
  );
  const result = mapper.map<unknown, DeparmentModel>("Department", data, "dto_to_model");
  return result;
}

export async function update(deptId: number, model: DeparmentModel): Promise<DeparmentModel> {
  const parentId = Number(model.parentId ?? 0);
  const path = parentId > 0 ? `${deptPath(parentId)}/child/${deptId}` : `${deptPath(deptId)}/detail`;
  const { data } = await apiClient.put<unknown>(
    path,
    buildDepartmentMutationWirePayload(model as unknown as Record<string, unknown>),
  );
  const result = mapper.map<unknown, DeparmentModel>("Department", data, "dto_to_model");
  return result;
}

export async function unlink(deptId: number): Promise<{ success: boolean }> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.delete<{ success: boolean }>(`${departmentApiPath()}/child/${deptId}`);
  return data;
}

export async function myFirstDepartment(): Promise<DeparmentModel> {
  const { data } = await apiClient.get<unknown>(`${deptPath().replace(/\/\d+$/, "")}/me`);
  return mapper.map<unknown, DeparmentModel>("Department", data, "dto_to_model");
}

export async function previewSyncFromParent(deptId: number): Promise<DepartmentSyncPreviewModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.post<DepartmentSyncPreviewModel>(
    `${departmentApiPath()}/child/${deptId}/sync-from-parent/preview`,
    {},
  );
  return data;
}

export async function applySyncFromParent(
  deptId: number,
  previewToken: string,
): Promise<DepartmentSyncApplyResultModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.post<DepartmentSyncApplyResultModel>(
    `${departmentApiPath()}/child/${deptId}/sync-from-parent/apply`,
    { previewToken },
  );
  return data;
}
