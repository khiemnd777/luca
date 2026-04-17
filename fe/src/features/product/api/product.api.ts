import type { FetchTableOpts } from "@core/table/table.types";
import type { ListResult } from "@core/types/list-result";
import type {
  ProductImportResult,
  ProductModel,
  ProductUpsertModel,
} from "@features/product/model/product.model";
import type { ProductOverviewModel as ProductOverviewDataModel } from "@features/product/model/product-overview.model";
import { apiClient, invalidateApiCache } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import { mapper } from "@core/mapper/auto-mapper";
import type { SearchOpts, SearchResult } from "@core/types/search.types";

export async function table(tableOpts: FetchTableOpts): Promise<ListResult<ProductModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/product/list`, tableOpts);
  const result = mapper.map<any[], ListResult<ProductModel>>("Product", data, "dto_to_model");
  return result;
}

export async function variantTable(productId: number, tableOpts: FetchTableOpts): Promise<ListResult<ProductModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/product/${productId}/variant`, tableOpts);
  const result = mapper.map<any[], ListResult<ProductModel>>("Product", data, "dto_to_model");
  return result;
}

export async function search(opts: SearchOpts): Promise<SearchResult<ProductModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.search<any[]>(`${departmentApiPath()}/product/search`, opts);
  const result = mapper.map<any[], SearchResult<ProductModel>>("Product", data, "dto_to_model");
  return result;
}

export async function id(id: number): Promise<ProductModel> {
  const { departmentApiPath } = useAuthStore.getState();
  id = id === undefined ? -1 : id;
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/product/${id}`, {
    cacheMode: "cache-first",
    cacheKey: `product:id${id}`,
    cacheTags: [`product:id${id}`],
  });
  const result = mapper.map<any, ProductModel>("Product", data, "dto_to_model");
  return result;
}

export async function overview(productId: number): Promise<ProductOverviewDataModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/order/product-overview/${productId}`);
  return mapper.map<any, ProductOverviewDataModel>("ProductOverview", data, "dto_to_model");
}

export async function create(model: ProductUpsertModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.post<any>(`${departmentApiPath()}/product`, model);
}

export async function update(model: ProductUpsertModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.put<any>(`${departmentApiPath()}/product/${model.dto.id}`, model);
  invalidateApiCache([`product:id${model.dto.id}`]);
}

export async function unlink(id: number): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.delete<any>(`${departmentApiPath()}/product/${id}`);
  invalidateApiCache([`product:id${id}`]);
}

export async function importExcel(file: File): Promise<ProductImportResult> {
  const { departmentApiPath } = useAuthStore.getState();
  const formData = new FormData();
  formData.append("file", file, file.name);
  const { data } = await apiClient.post<any>(`${departmentApiPath()}/product/import-excel`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data as ProductImportResult;
}
