import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import { mapper } from "@core/mapper/auto-mapper";
import type { OrderItemProcessInProgressModel } from "../model/order-item-process-inprogress.model";
import type { OrderItemProcessInProgressProcessModel } from "../model/order-item-process-inprogress-process.model";
import type { OrderItemProcessModel, OrderItemProcessUpsertModel } from "../model/order-item-process.model";
import type { FetchTableOpts } from "@root/core/table/table.types";
import type { ListResult } from "@root/core/types/list-result";

export async function processes(orderId: number, orderItemId: number): Promise<OrderItemProcessModel[]> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any[]>(`${departmentApiPath()}/order/${orderId}/historical/${orderItemId}/processes`);
  const result = mapper.map<any[], OrderItemProcessModel[]>("OrderItemProcess", data, "dto_to_model");
  return result;
}

export async function processesForStaff(staffId: number): Promise<OrderItemProcessModel[]> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any[]>(`${departmentApiPath()}/staff/${staffId}/order/processes`);
  const result = mapper.map<any[], OrderItemProcessModel[]>("OrderItemProcess", data, "dto_to_model");
  return result;
}

export async function getInProgressesForStaffTimeline(
  staffId: number,
  fromDate: string,
  toDate: string,
): Promise<OrderItemProcessInProgressProcessModel[]> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any[]>(
    `${departmentApiPath()}/staff/${staffId}/order/processes/in-progresses/timeline`,
    {
      params: {
        from_date: fromDate,
        to_date: toDate,
      },
    },
  );
  const result = mapper.map<any[], OrderItemProcessInProgressProcessModel[]>(
    "OrderItemProcessInProgressProcess",
    data,
    "dto_to_model",
  );
  return result;
}

export async function getInProgressesForStaff(staffId: number, tableOpts: FetchTableOpts): Promise<ListResult<OrderItemProcessInProgressProcessModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/staff/${staffId}/order/processes/in-progresses`, tableOpts);
  const result = mapper.map<any[], ListResult<OrderItemProcessInProgressProcessModel>>("OrderItemProcessInProgressProcess", data, "dto_to_model");
  return result;
}

export async function update(orderId: number, orderItemId: number, orderItemProcessId: number, payload: OrderItemProcessUpsertModel): Promise<OrderItemProcessModel[]> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.put<any[]>(`${departmentApiPath()}/order/${orderId}/historical/${orderItemId}/processes/${orderItemProcessId}`, payload);
  const result = mapper.map<any[], OrderItemProcessModel[]>("OrderItemProcess", data, "dto_to_model");
  return result;
}

export async function prepareCheckInOrOut(orderId: number, orderItemId: number): Promise<OrderItemProcessInProgressModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/order/${orderId}/historical/${orderItemId}/processes/check-in-out/prepare`);
  const result = mapper.map<any, OrderItemProcessInProgressModel>("OrderItemProcessInProgress", data, "dto_to_model");
  return result;
}

export async function prepareCheckInOrOutByCode(code: string): Promise<OrderItemProcessInProgressModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/order/processes/check-in-out/prepare-by-code`, {
    params: {
      code,
    }
  });
  const result = mapper.map<any, OrderItemProcessInProgressModel>("OrderItemProcessInProgress", data, "dto_to_model");
  return result;
}

export async function checkInOrOut(payload: OrderItemProcessModel): Promise<OrderItemProcessInProgressModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const orderId = (payload as any).order_id;
  const orderItemId = (payload as any).order_item_id;
  const { data } = await apiClient.post<any>(`${departmentApiPath()}/order/${orderId}/historical/${orderItemId}/processes/check-in-out`, payload);
  const result = mapper.map<any, OrderItemProcessInProgressModel>("OrderItemProcessInProgress", data, "dto_to_model");
  return result;
}

export async function assign(inprogressId: number, assignedId: number, assignedName: string, note: string): Promise<OrderItemProcessInProgressModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.post<any>(`${departmentApiPath()}/order/processes/in-progress/${inprogressId}/assign`, {
    'in_progress_id': inprogressId,
    'assigned_id': assignedId,
    'assigned_name': assignedName,
    note,
  });
  const result = mapper.map<any, OrderItemProcessInProgressModel>("OrderItemProcessInProgress", data, "dto_to_model");
  return result;
}

export async function getInProgressById(inProgressId: number): Promise<OrderItemProcessInProgressProcessModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/order/processes/in-progress/${inProgressId}`);
  const result = mapper.map<any, OrderItemProcessInProgressProcessModel>("OrderItemProcessInProgressProcess", data, "dto_to_model");
  return result;
}

export async function getInProgressesByProcessId(processId: number): Promise<OrderItemProcessInProgressProcessModel[]> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any[]>(`${departmentApiPath()}/order/processes/${processId}/in-progresses`);
  const result = mapper.map<any[], OrderItemProcessInProgressProcessModel[]>("OrderItemProcessInProgressProcess", data, "dto_to_model");
  return result;
}

export async function getInProgressesByOrderItemId(orderId: number, orderItemId: number): Promise<OrderItemProcessInProgressProcessModel[]> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any[]>(`${departmentApiPath()}/order/${orderId}/historical/${orderItemId}/processes/in-progresses`);
  const result = mapper.map<any[], OrderItemProcessInProgressProcessModel[]>("OrderItemProcessInProgressProcess", data, "dto_to_model");
  return result;
}

export async function getCheckoutLatest(orderId: number, orderItemId: number): Promise<OrderItemProcessInProgressProcessModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/order/${orderId}/historical/${orderItemId}/processes/check-out/latest`);
  const result = mapper.map<any, OrderItemProcessInProgressProcessModel>("OrderItemProcessInProgressProcess", data, "dto_to_model");
  return result;
}
