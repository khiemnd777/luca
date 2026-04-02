import type { DepartmentDto } from "@features/settings/model/department.dto";
import { apiClient } from "@core/network/api-client";
import { mapper } from "@core/mapper/auto-mapper";
import type { MyDepartmentDto } from "@root/core/network/my-department.dto";
import { useAuthStore } from "@store/auth-store";

export async function updateDepartment(payload: Partial<MyDepartmentDto>): Promise<DepartmentDto> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.put<any>(departmentApiPath(), payload);
  const result = mapper.map<any, DepartmentDto>("Department", data, "dto_to_model");
  return result;
}