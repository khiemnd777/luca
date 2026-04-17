import type { FetchTableOpts } from "@core/table/table.types";
import type { ListResult } from "@core/types/list-result";
import type { OrderModel, OrderUpsertModel } from "@features/order/model/order.model";
import type { InProgressOrderModel } from "@features/order/model/inprogress-order.model";
import type { NewestOrderModel } from "@features/order/model/newest-order.model";
import type { CompletedOrderModel } from "@features/order/model/completed-order.model";
import type { StaffOverviewModel } from "@features/order/model/staff-overview.model";
import type { StaffCatalogOverviewModel } from "@features/order/model/staff-catalog-overview.model";
import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import { mapper } from "@core/mapper/auto-mapper";
import type { SearchOpts, SearchResult } from "@core/types/search.types";
import type {
  OrderAdvancedSearchFilters,
  OrderAdvancedSearchReportBreakdownModel,
  OrderAdvancedSearchReportModel,
  OrderAdvancedSearchReportSummaryModel,
} from "@features/order/model/order-advanced-search.model";
import type { OrderItemProductModel } from "../model/order-item-product.model";
import type { OrderItemMaterialModel } from "../model/order-item-material.model";
import { serverTimeToClientDate } from "@root/shared/utils/datetime.utils";

type ReserveCacheEntry = {
  promise: Promise<{ orderCode: string; expiresAt: string }>;
  timeoutId: ReturnType<typeof setTimeout> | null;
};

const reserveCache = new Map<string, ReserveCacheEntry>();

export async function getOrReserveOrderCode(
  formSessionId: string
): Promise<{ orderCode: string; expiresAt: string }> {

  const cached = reserveCache.get(formSessionId);
  if (cached) {
    return cached.promise;
  }

  let resolveFn!: (v: { orderCode: string; expiresAt: string }) => void;
  let rejectFn!: (e: any) => void;

  const promise = new Promise<{ orderCode: string; expiresAt: string }>(
    (resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    }
  );

  reserveCache.set(formSessionId, {
    promise,
    timeoutId: null,
  });

  try {
    const result = await reserveOrderCode();

    const expiresDate = serverTimeToClientDate(result.expiresAt);
    if (!expiresDate) {
      reserveCache.delete(formSessionId);
      resolveFn(result);
      return result;
    }

    const ttlMs = expiresDate.getTime() - Date.now();
    if (ttlMs <= 0) {
      reserveCache.delete(formSessionId);
      resolveFn(result);
      return result;
    }

    const timeoutId = setTimeout(() => {
      reserveCache.delete(formSessionId);
    }, ttlMs);

    reserveCache.set(formSessionId, {
      promise,
      timeoutId,
    });

    resolveFn(result);
    return result;

  } catch (err) {
    reserveCache.delete(formSessionId);
    rejectFn(err);
    throw err;
  }
}

export function clearReservedOrderCode(formSessionId: string) {
  const entry = reserveCache.get(formSessionId);
  if (entry?.timeoutId) {
    clearTimeout(entry.timeoutId);
  }
  reserveCache.delete(formSessionId);
}

export async function reserveOrderCode(): Promise<{ orderCode: string; expiresAt: string }> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.post<{ reserved_code: string }>(`${departmentApiPath()}/order/code/reserve`);
  const result = mapper.map<any, { orderCode: string; expiresAt: string }>("Common", data, "dto_to_model");
  return result;
}

export async function prepareForRemakeByOrderID(orderId: number): Promise<OrderModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/order/${orderId}/remake/prepare`);
  const result = mapper.map<any, OrderModel>("Order", data, "dto_to_model");
  return result;
}

export async function completedList(tableOpts: FetchTableOpts): Promise<ListResult<CompletedOrderModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/order/completed/list`, tableOpts);
  const result = mapper.map<any[], ListResult<CompletedOrderModel>>("CompletedOrder", data, "dto_to_model");
  return result;
}

export async function newestList(tableOpts: FetchTableOpts): Promise<ListResult<NewestOrderModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/order/newest/list`, tableOpts);
  const result = mapper.map<any[], ListResult<NewestOrderModel>>("NewestOrder", data, "dto_to_model");
  return result;
}

export async function inProgressList(tableOpts: FetchTableOpts): Promise<ListResult<InProgressOrderModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/order/in-progress/list`, tableOpts);
  const result = mapper.map<any[], ListResult<InProgressOrderModel>>("InProgressOrder", data, "dto_to_model");
  return result;
}

export async function listBySectionID(sectionId: number, tableOpts: FetchTableOpts): Promise<ListResult<OrderModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/section/${sectionId}/orders`, tableOpts);
  const result = mapper.map<any[], ListResult<OrderModel>>("Order", data, "dto_to_model");
  return result;
}

export async function listByPromotionCodeID(
  promotionCodeId: number,
  tableOpts: FetchTableOpts
): Promise<ListResult<OrderModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(
    `${departmentApiPath()}/order/promotion/${promotionCodeId}/list`,
    tableOpts
  );
  const result = mapper.map<any[], ListResult<OrderModel>>("Order", data, "dto_to_model");
  return result;
}

export async function list(tableOpts: FetchTableOpts): Promise<ListResult<OrderModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/order/list`, tableOpts);
  const result = mapper.map<any[], ListResult<OrderModel>>("Order", data, "dto_to_model");
  return result;
}

export async function search(opts: SearchOpts): Promise<SearchResult<OrderModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.search<any[]>(`${departmentApiPath()}/order/search`, opts);
  const result = mapper.map<any[], SearchResult<OrderModel>>("Order", data, "dto_to_model");
  return result;
}

function parseOptionalNumber(value?: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function buildAdvancedSearchParams(filters: OrderAdvancedSearchFilters) {
  const createdYear = parseOptionalNumber(filters.createdYear);
  const createdMonth = parseOptionalNumber(filters.createdMonth);
  const deliveryYear = parseOptionalNumber(filters.deliveryYear);
  const deliveryMonth = parseOptionalNumber(filters.deliveryMonth);

  return {
    department_id: filters.department?.id,
    category_ids: filters.categories.map((item) => item.id),
    product_ids: filters.products.map((item) => item.id),
    order_code: filters.orderCode.trim() || undefined,
    clinic_name: filters.clinicName.trim() || undefined,
    dentist_name: filters.dentistName.trim() || undefined,
    patient_name: filters.patientName.trim() || undefined,
    created_year: createdYear,
    created_month: createdMonth,
    delivery_year: deliveryYear,
    delivery_month: deliveryMonth,
  };
}

export async function advancedSearchList(
  filters: OrderAdvancedSearchFilters,
  tableOpts: FetchTableOpts
): Promise<ListResult<OrderModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const params = {
    ...buildAdvancedSearchParams(filters),
    limit: tableOpts.limit,
    page: tableOpts.page,
    order_by: tableOpts.orderBy ?? undefined,
    direction: tableOpts.direction ?? "desc",
  };
  const { data } = await apiClient.get<any[]>(`${departmentApiPath()}/order/advanced-search`, { params });
  return mapper.map<any[], ListResult<OrderModel>>("Order", data, "dto_to_model");
}

export async function advancedSearchReport(filters: OrderAdvancedSearchFilters): Promise<OrderAdvancedSearchReportModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const params = buildAdvancedSearchParams(filters);
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/order/advanced-search/report`, { params });
  return mapper.map<any, OrderAdvancedSearchReportModel>("OrderAdvancedSearchReport", data, "dto_to_model");
}

export async function advancedSearchReportSummary(
  filters: OrderAdvancedSearchFilters
): Promise<OrderAdvancedSearchReportSummaryModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const params = buildAdvancedSearchParams(filters);
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/order/advanced-search/report/summary`, { params });
  return mapper.map<any, OrderAdvancedSearchReportSummaryModel>("OrderAdvancedSearchReportSummary", data, "dto_to_model");
}

export async function advancedSearchReportBreakdown(
  filters: OrderAdvancedSearchFilters
): Promise<OrderAdvancedSearchReportBreakdownModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const params = buildAdvancedSearchParams(filters);
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/order/advanced-search/report/breakdown`, { params });
  return mapper.map<any, OrderAdvancedSearchReportBreakdownModel>("OrderAdvancedSearchReportBreakdown", data, "dto_to_model");
}

export async function id(id: number): Promise<OrderModel> {
  const { departmentApiPath } = useAuthStore.getState();
  id = id === undefined ? -1 : id;
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/order/${id}`);
  const result = mapper.map<any, OrderModel>("Order", data, "dto_to_model");
  return result;
}

export async function getByOrderIdAndOrderItemId(orderId: number, orderItemId: number): Promise<OrderModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/order/${orderId}/historical/${orderItemId}`);
  const result = mapper.map<any, OrderModel>("Order", data, "dto_to_model");
  return result;
}

export async function getAllOrderProducts(orderId: number): Promise<OrderItemProductModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/order/${orderId}/products`);
  const result = mapper.map<any, OrderItemProductModel>("OrderItemProduct", data, "dto_to_model");
  return result;
}

export async function getAllOrderMaterials(orderId: number): Promise<OrderItemMaterialModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/order/${orderId}/materials`);
  const result = mapper.map<any, OrderItemMaterialModel>("OrderItemMaterial", data, "dto_to_model");
  return result;
}

type TotalPriceResponseDto = {
  total_price: number;
};

export async function syncPrice(orderId: number): Promise<number> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<TotalPriceResponseDto>(`${departmentApiPath()}/order/${orderId}/sync-price`);
  return data.total_price;
}

export async function getStaffOverview(staffId: number): Promise<StaffOverviewModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/order/staff-overview/${staffId}`);
  return mapper.map<any, StaffOverviewModel>("StaffOverview", data, "dto_to_model");
}

export async function getStaffCatalogOverview(): Promise<StaffCatalogOverviewModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/order/staff-overview`);
  return mapper.map<any, StaffCatalogOverviewModel>("StaffCatalogOverview", data, "dto_to_model");
}

export async function create(model: OrderUpsertModel): Promise<OrderModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.post<any>(`${departmentApiPath()}/order`, model);
  const result = mapper.map<any, OrderModel>("Order", data, "dto_to_model");
  return result;
}

export async function update(model: OrderUpsertModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.put<any>(`${departmentApiPath()}/order/${model.dto.id}`, model);
}

export async function updateStatus(orderId: number, orderItemProcessId: number, status: string): Promise<OrderModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.put<any>(`${departmentApiPath()}/order/${orderId}/process/${orderItemProcessId}/change-status/${status}`);
  const result = mapper.map<any, OrderModel>("Order", data, "dto_to_model");
  return result;
}

export async function updateDeliveryStatus(orderId: number, orderItemId: number, status: string): Promise<OrderModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.put<any>(`${departmentApiPath()}/order/${orderId}/item/${orderItemId}/change-delivery-status/${status}`);
  const result = mapper.map<any, OrderModel>("Order", data, "dto_to_model");
  return result;
}

type DeliveryStatusResponseDto = {
  delivery_status: string;
};

export async function getDeliveryStatusByOrderItemId(orderId: number, orderItemId: number): Promise<string> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<DeliveryStatusResponseDto>(
    `${departmentApiPath()}/order/${orderId}/item/${orderItemId}/delivery-status`
  );
  return data.delivery_status;
}

export function getDeliveryProofPhotoUrl(orderItemId: number): string {
  const { departmentApiPath } = useAuthStore.getState();
  return `${departmentApiPath()}/orders/delivery/proofs/${orderItemId}`;
}

export async function unlink(id: number): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.delete<any>(`${departmentApiPath()}/order/${id}`);
}
