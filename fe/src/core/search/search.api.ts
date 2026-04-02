import { apiClient } from "@core/network/api-client";
import { env } from "@core/config/env";
import { mapper } from "@core/mapper/auto-mapper";
import type { SearchModel } from "@core/search/search.model";
import type { ListResult } from "@core/types/list-result";

export async function search(query: string, entityType?: string): Promise<ListResult<SearchModel>> {
  const { data } = await apiClient.get<any>(`${env.apiBasePath}/search`, {
    params: {
      q: query,
      entityType,
    }
  });
  const result = mapper.map<any, ListResult<SearchModel>>("Search", data, "dto_to_model");
  return result;
}
