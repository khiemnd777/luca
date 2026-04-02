import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import { mapper } from "@core/mapper/auto-mapper";
import type { CalculateTotalPricePayload, OrderItemHistoricalModel } from "../model/order-item.model";

type TotalPriceResponseDto = {
  total_price: number;
};

export async function syncPrice(orderId: number, orderItemId: number): Promise<number> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<TotalPriceResponseDto>(`${departmentApiPath()}/order/${orderId}/historical/${orderItemId}/sync-price`);
  return data.total_price;
}

export async function calculateTotalPrice(payload: CalculateTotalPricePayload): Promise<number> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.post<TotalPriceResponseDto>(`${departmentApiPath()}/order/item/calculate-total-price`, payload);
  return data.total_price;
}

export async function historical(orderId: number, orderItemId?: number): Promise<OrderItemHistoricalModel[]> {
  const { departmentApiPath } = useAuthStore.getState();
  orderItemId = orderItemId ?? 0;
  const { data } = await apiClient.get<any[]>(`${departmentApiPath()}/order/${orderId}/historical/${orderItemId}/list`);
  const result = mapper.map<any[], OrderItemHistoricalModel[]>("Common", data, "dto_to_model");
  return result;
}

type OrderIdsResponseDto =
  | [number, number]
  | { order_id: number; order_item_id: number }
  | { orderId: number; orderItemId: number };

export async function getOrderIdAndOrderItemIdByCode(code: string): Promise<[number, number]> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<OrderIdsResponseDto>(`${departmentApiPath()}/order/item/ids-by-code`, {
    params: {
      code,
    },
  });

  if (Array.isArray(data)) {
    return [data[0], data[1]];
  }

  if ("order_id" in data) {
    return [data.order_id, data.order_item_id];
  }

  return [data.orderId, data.orderItemId];
}

type LatestOrderItemIdResponseDto = { order_item_id: number };

export async function getLatestOrderItemIdByOrderId(orderId: number): Promise<number> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<LatestOrderItemIdResponseDto>(`${departmentApiPath()}/order/${orderId}/latest-order-item-id`);
  return data.order_item_id;
}

export async function unlink(orderId: number, orderItemId?: number): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.delete<any>(`${departmentApiPath()}/order/${orderId}/historical/${orderItemId}`);
}
