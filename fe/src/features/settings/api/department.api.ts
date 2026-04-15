import type { DepartmentDto } from "@features/settings/model/department.dto";
import { apiClient } from "@core/network/api-client";
import { mapper } from "@core/mapper/auto-mapper";
import type { MyDepartmentDto } from "@root/core/network/my-department.dto";
import { useAuthStore } from "@store/auth-store";

export async function updateDepartment(payload: Partial<MyDepartmentDto>): Promise<DepartmentDto> {
  const { departmentApiPath, department } = useAuthStore.getState();
  const deptId = department?.id;
  if (!deptId || deptId <= 0) {
    throw new Error("Department id is missing");
  }

  const endpoint = `${departmentApiPath()}/child/${deptId}`;
  const { data } = await apiClient.put<unknown>(endpoint, payload);
  const result = mapper.map<unknown, DepartmentDto>("Department", data, "dto_to_model");
  return result;
}
