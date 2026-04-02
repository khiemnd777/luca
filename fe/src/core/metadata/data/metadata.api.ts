import { apiClient, invalidateApiCache } from "@core/network/api-client";
import type {
  CollectionModel,
  CollectionWithFieldsModel,
  FieldDto,
  FieldModel,
} from "./metadata.model";
import { env } from "@core/config/env";
import { mapper } from "@root/core/mapper/auto-mapper";

export type ListCollectionsParams = {
  query?: string;
  limit?: number;
  offset?: number;
  withFields?: boolean;
  tag?: string | null;
  table?: boolean;
  form?: boolean;
};

export async function listCollections(
  params: ListCollectionsParams = {}
): Promise<{ data: CollectionWithFieldsModel[]; total: number }> {
  const { query = "", limit = 20, offset = 0, withFields = true, tag, table = true, form = true } = params;
  const { data } = await apiClient.get<{
    data: CollectionWithFieldsModel[];
    total: number;
  }>(`${env.apiBasePath}/metadata/collections`, {
    params: {
      query,
      limit,
      offset,
      with_fields: withFields,
      tag,
      table,
      form
    },
  });
  const result = mapper.map<any[], CollectionWithFieldsModel[]>("Common", data.data, "dto_to_model");
  return { data: result, total: data.total };
}

export async function listCollectionsByGroup(
  group: string,
  params: ListCollectionsParams = {}
): Promise<{ data: CollectionWithFieldsModel[]; total: number }> {
  const { query = "", limit = 20, offset = 0, withFields = true, tag, table = true, form = true } = params;
  const { data } = await apiClient.get<{
    data: CollectionWithFieldsModel[];
    total: number;
  }>(`${env.apiBasePath}/metadata/collections/integration/${group}`, {
    params: {
      query,
      limit,
      offset,
      with_fields: withFields,
      tag,
      table,
      form
    },
  });
  const result = mapper.map<any[], CollectionWithFieldsModel[]>("Common", data.data, "dto_to_model");
  return { data: result, total: data.total };
}

export async function getCollection(
  idOrSlug: string | number,
  withFields = true,
  tag?: string | null,
  table = false,
  form = false,
): Promise<CollectionWithFieldsModel> {
  const res = await apiClient.get<CollectionWithFieldsModel>(
    `${env.apiBasePath}/metadata/collections/${idOrSlug}`,
    {
      params: { withFields, tag, table, form },
    }
  );

  const result = mapper.map<any, CollectionWithFieldsModel>("Common", res.data, "dto_to_model");

  return result;
}

function buildCacheSuffixFromEntityData(entityData: any): string {
  if (!entityData || typeof entityData !== "object") return "";

  const flat: Record<string, any> = {};

  const walk = (obj: any, prefix = "") => {
    if (obj == null) return;

    Object.entries(obj).forEach(([key, val]) => {
      const path = prefix ? `${prefix}.${key}` : key;

      if (val && typeof val === "object" && !Array.isArray(val)) {
        walk(val, path);
      } else {
        flat[path] = val;
      }
    });
  };

  walk(entityData);

  const keys = Object.keys(flat).sort();

  return keys
    .map(k => `${k}=${String(flat[k])}`)
    .join("&");
}

export async function getAvailableCollection(
  idOrSlug: string | number,
  withFields = true,
  tag?: string | null,
  table = false,
  form = false,
  entityData?: any,
  _changedParams?: {
    field: string;
    value: any;
  }[],
): Promise<CollectionWithFieldsModel> {
  let cacheKey = `metadata:collection:${idOrSlug}:wf${withFields}:t${tag ?? 'null'}:tbl${table}:frm${form}`;

  const suffix = buildCacheSuffixFromEntityData(entityData);
  if (suffix) {
    cacheKey += `:ed:${suffix}`;
  }

  const res = await apiClient.getAsPost<CollectionWithFieldsModel>(
    `${env.apiBasePath}/metadata/collections/available/${idOrSlug}`, {
    ...entityData
  },
    {
      params: { withFields, tag, table, form },
      cacheMode: "off",
      cacheTTL: 300000, // ~5m
      cacheKey,
      cacheTags: [`metadata:collection:${idOrSlug}`],
      dedupKey: false,
    }
  );
  const result = mapper.map<any, CollectionWithFieldsModel>("Common", res.data, "dto_to_model");
  return result;
}

export type CreateCollectionInput = {
  slug: string;
  name: string;
};

export async function createCollection(
  input: CreateCollectionInput
): Promise<CollectionModel> {
  const res = await apiClient.post<CollectionModel>(`${env.apiBasePath}/metadata/collections`, input);
  return res.data;
}

export type UpdateCollectionInput = Partial<CreateCollectionInput>;

export async function updateCollection(
  id: number,
  input: UpdateCollectionInput
): Promise<CollectionModel> {
  const { data } = await apiClient.put<CollectionModel>(
    `${env.apiBasePath}/metadata/collections/${id}`,
    input
  );
  invalidateApiCache([`metadata:collection:${data.slug}`]);
  return data;
}

export async function deleteCollection(id: number): Promise<void> {
  await apiClient.delete(`${env.apiBasePath}/metadata/collections/${id}`);
}

// -------- Fields --------

export async function listFieldsByCollection(
  collectionId: number
): Promise<FieldModel[]> {
  const { data } = await apiClient.get<{ data: FieldDto[] }>(`${env.apiBasePath}/metadata/fields`, {
    params: { collection_id: collectionId },
  });
  const result = mapper.map<FieldDto[], FieldModel[]>("Common", data.data, "dto_to_model")
  return result;
}

export async function createField(input: FieldDto): Promise<FieldModel> {
  const { data } = await apiClient.post<FieldDto>(`${env.apiBasePath}/metadata/fields`, input);
  const result = mapper.map<FieldDto, FieldModel>("Common", data, "dto_to_model")
  invalidateApiCache([`metadata:collection:${result.collectionSlug}`]);
  return result;
}

export async function updateField(
  id: number,
  input: FieldDto
): Promise<FieldModel> {
  const { data } = await apiClient.put<FieldDto>(`${env.apiBasePath}/metadata/fields/${id}`, input);
  const result = mapper.map<FieldDto, FieldModel>("Common", data, "dto_to_model")
  invalidateApiCache([`metadata:collection:${result.collectionSlug}`]);
  return result;
}

export async function sort(
  collectionId: number,
  ids: number[],
): Promise<void> {
  const { data } = await apiClient.put<string>(`${env.apiBasePath}/metadata/fields/sort`, {
    'collection_id': collectionId,
    ids,
  });
  invalidateApiCache([`metadata:collection:${data}`]);
}

export async function deleteField(id: number): Promise<void> {
  await apiClient.delete(`${env.apiBasePath}/metadata/fields/${id}`);
}
