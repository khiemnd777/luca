import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import { mapper } from "@core/mapper/auto-mapper";
import type {
  OrderItemProcessDentistReviewModel,
  OrderItemProcessDentistReviewResult,
  OrderItemProcessInProgressModel,
  OrderItemProcessTargetModel,
} from "../model/order-item-process-inprogress.model";
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
  return mapPreparedInProgress(data);
}

export async function prepareCheckInOrOutByCode(code: string): Promise<OrderItemProcessInProgressModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/order/processes/check-in-out/prepare-by-code`, {
    params: {
      code,
    }
  });
  return mapPreparedInProgress(data);
}

export async function checkInOrOut(payload: OrderItemProcessInProgressModel): Promise<OrderItemProcessInProgressModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const orderId = payload.orderId ?? (payload as any).order_id;
  const orderItemId = payload.orderItemId ?? (payload as any).order_item_id;
  const dto = mapper.map<OrderItemProcessInProgressModel, Record<string, any>>(
    "OrderItemProcessInProgress",
    payload,
    "model_to_dto",
  );
  const body = sanitizeCheckInOutPayload(dto);
  const { data } = await apiClient.post<any>(`${departmentApiPath()}/order/${orderId}/historical/${orderItemId}/processes/check-in-out`, body);
  const result = mapper.map<any, OrderItemProcessInProgressModel>("OrderItemProcessInProgress", data, "dto_to_model");
  return result;
}

export type ResolveDentistReviewPayload = {
  result: OrderItemProcessDentistReviewResult;
  note?: string | null;
};

export async function resolveDentistReview(
  reviewId: number,
  payload: ResolveDentistReviewPayload,
): Promise<OrderItemProcessDentistReviewModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const body: { result: OrderItemProcessDentistReviewResult; note?: string | null } = {
    result: payload.result,
  };
  if (payload.note !== undefined) {
    body.note = payload.note;
  }

  const { data } = await apiClient.post<any>(`${departmentApiPath()}/order/processes/dentist-reviews/${reviewId}/resolve`, body);
  return mapDentistReview(data);
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

export async function getCheckoutLatest(orderId: number, orderItemId: number, productId?: number | null): Promise<OrderItemProcessInProgressProcessModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/order/${orderId}/historical/${orderItemId}/processes/check-out/latest`, {
    params: productId ? { product_id: productId } : undefined,
  });
  const result = mapper.map<any, OrderItemProcessInProgressProcessModel>("OrderItemProcessInProgressProcess", data, "dto_to_model");
  return result;
}

function mapPreparedInProgress(data: any): OrderItemProcessInProgressModel {
  const result = mapper.map<any, OrderItemProcessInProgressModel>("OrderItemProcessInProgress", data, "dto_to_model");
  const availableTargets = Array.isArray(data?.available_targets)
    ? data.available_targets.map((item: any) =>
        mapper.map<any, OrderItemProcessTargetModel>("OrderItemProcessInProgress", item, "dto_to_model"),
      )
    : null;

  return {
    ...result,
    availableTargets,
  };
}

function mapDentistReview(data: any): OrderItemProcessDentistReviewModel {
  return {
    id: data?.id ?? null,
    orderId: data?.order_id ?? null,
    orderItemId: data?.order_item_id ?? null,
    orderItemCode: data?.order_item_code ?? null,
    productId: data?.product_id ?? null,
    productCode: data?.product_code ?? null,
    productName: data?.product_name ?? null,
    processId: data?.process_id ?? null,
    processName: data?.process_name ?? null,
    inProgressId: data?.in_progress_id ?? null,
    status: data?.status ?? null,
    requestNote: data?.request_note ?? null,
    responseNote: data?.response_note ?? null,
    requestedBy: data?.requested_by ?? null,
    resolvedBy: data?.resolved_by ?? null,
    requestedAt: data?.requested_at ?? null,
    resolvedAt: data?.resolved_at ?? null,
    createdAt: data?.created_at ?? null,
    updatedAt: data?.updated_at ?? null,
  };
}

function sanitizeCheckInOutPayload(payload: Record<string, any>) {
  const body = { ...payload };

  delete body.availableTargets;
  delete body.available_targets;

  for (const key of ["updatedAt", "updated_at", "startedAt", "started_at", "completedAt", "completed_at"]) {
    if (body[key] === "" || body[key] == null) {
      delete body[key];
    }
  }

  return body;
}
