import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import { mapper } from "@core/mapper/auto-mapper";
import type { FetchTableOpts } from "@root/core/table/table.types";
import type { ListResult } from "@root/core/types/list-result";
import type { OrderItemMaterialModel } from "../model/order-item-material.model";

export async function getOrderLoanerMaterials(tableOpts: FetchTableOpts): Promise<ListResult<OrderItemMaterialModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/order/item/material/loaner/list`, tableOpts);
  const result = mapper.map<any[], ListResult<OrderItemMaterialModel>>("OrderItemMaterial", data, "dto_to_model");
  return result;
}
