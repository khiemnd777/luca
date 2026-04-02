import type { FetchTableOpts } from "@core/table/table.types";
import type { ListResult } from "@core/types/list-result";
import type { CreatePromotionInputModel, PromotionCodeModel, UpdatePromotionInputModel } from "@features/promotion/model/promotion.model";
import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import { mapper } from "@core/mapper/auto-mapper";

export async function list(tableOpts: FetchTableOpts): Promise<ListResult<PromotionCodeModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/promotion/list`, tableOpts);
  const result = mapper.map<any[], ListResult<PromotionCodeModel>>("PromotionCode", data, "dto_to_model");
  return result;
}

export async function id(id: number): Promise<PromotionCodeModel> {
  const { departmentApiPath } = useAuthStore.getState();
  id = id === undefined ? -1 : id;
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/promotion/${id}`);
  const result = mapper.map<any, PromotionCodeModel>("PromotionCode", data, "dto_to_model");
  return result;
}

export async function create(input: CreatePromotionInputModel): Promise<PromotionCodeModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.post<any>(`${departmentApiPath()}/promotion`, input);
  const result = mapper.map<any, PromotionCodeModel>("PromotionCode", data, "dto_to_model");
  return result;
}

export async function update(id: number, input: UpdatePromotionInputModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.put<any>(`${departmentApiPath()}/promotion/${id}`, input);
}

export async function remove(id: number): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.delete<any>(`${departmentApiPath()}/promotion/${id}`);
}
