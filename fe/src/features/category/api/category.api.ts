import type { FetchTableOpts } from "@core/table/table.types";
import type { ListResult } from "@core/types/list-result";
import type {
  CategoryImportResult,
  CategoryModel,
  CategoryUpsertModel,
} from "@features/category/model/category.model";
import { apiClient, invalidateApiCache } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import { mapper } from "@core/mapper/auto-mapper";
import type { SearchOpts, SearchResult } from "@core/types/search.types";

export async function table(tableOpts: FetchTableOpts): Promise<ListResult<CategoryModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.getTable<any[]>(`${departmentApiPath()}/category/list`, tableOpts);
  const result = mapper.map<any[], ListResult<CategoryModel>>("Category", data, "dto_to_model");
  return result;
}

export async function search(opts: SearchOpts): Promise<SearchResult<CategoryModel>> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.search<any[]>(`${departmentApiPath()}/category/search`, opts);
  const result = mapper.map<any[], SearchResult<CategoryModel>>("Category", data, "dto_to_model");
  return result;
}

export async function id(id: number): Promise<CategoryModel> {
  const { departmentApiPath } = useAuthStore.getState();
  id = id === undefined ? -1 : id;
  const { data } = await apiClient.get<any>(`${departmentApiPath()}/category/${id}`);
  const result = mapper.map<any, CategoryModel>("Category", data, "dto_to_model");
  return result;
}

export async function create(model: CategoryUpsertModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.post<any>(`${departmentApiPath()}/category`, model);
}

export async function update(model: CategoryUpsertModel): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.put<any>(`${departmentApiPath()}/category/${model.dto.id}`, model);
  invalidateApiCache([`metadata:collection:category-${model.dto.id}`]);
}

export async function unlink(id: number): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.delete<any>(`${departmentApiPath()}/category/${id}`);
}

export async function importExcel(file: File): Promise<CategoryImportResult> {
  const { departmentApiPath } = useAuthStore.getState();
  const formData = new FormData();
  formData.append("file", file, file.name);
  const { data } = await apiClient.post<any>(`${departmentApiPath()}/categories/import-excel`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data as CategoryImportResult;
}
