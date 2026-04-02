import { apiClient } from "@core/network/api-client";
import { env } from "@core/config/env";
import { mapper } from "@core/mapper/auto-mapper";
import type { MyDepartmentDto } from "@core/network/my-department.dto";

export async function fetchMyDepartment(): Promise<MyDepartmentDto> {
  const { data } = await apiClient.get<any>(`${env.apiBasePath}/department/me`);
  const result = mapper.map<any, MyDepartmentDto>("MyDepartment", data, "dto_to_model");
  return result;
}
