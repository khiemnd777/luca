import { apiClient } from "@core/network/api-client";
import type {
  ImportFieldProfileModel,
  ImportFieldMappingModel,
} from "./import.model";
import { env } from "@core/config/env";
import { mapper } from "@core/mapper/auto-mapper";

// -------- Import Profiles --------

export type ListImportProfilesParams = {
  scope?: string;
};

export async function listImportProfiles(
  params: ListImportProfilesParams = {}
): Promise<ImportFieldProfileModel[]> {
  const { data } = await apiClient.get<{ data: ImportFieldProfileModel[] }>(
    `${env.apiBasePath}/metadata/import-profiles`,
    { params }
  );
  const result = mapper.map<any[], ImportFieldProfileModel[]>("Common", data.data, "dto_to_model");
  return result;
}

export async function getImportProfile(
  id: number,
): Promise<ImportFieldProfileModel> {
  const { data } = await apiClient.get<any>(`${env.apiBasePath}/metadata/import-profiles/${id}`);
  const result = mapper.map<any, ImportFieldProfileModel>("Common", data, "dto_to_model");
  return result;
}

export type CreateImportProfileInput = {
  scope: string;
  code: string;
  name: string;
  description?: string | null;
  isDefault?: boolean;
};

export type UpdateImportProfileInput = Partial<CreateImportProfileInput>;

export async function createImportProfile(
  input: CreateImportProfileInput
): Promise<ImportFieldProfileModel> {
  const { data } = await apiClient.post<any>(
    `${env.apiBasePath}/metadata/import-profiles`,
    input
  );
  const result = mapper.map<any, ImportFieldProfileModel>("Common", data, "dto_to_model");
  return result;
}

export async function updateImportProfile(
  id: number,
  input: UpdateImportProfileInput
): Promise<ImportFieldProfileModel> {
  const { data } = await apiClient.put<any>(
    `${env.apiBasePath}/metadata/import-profiles/${id}`,
    input
  );
  const result = mapper.map<any, ImportFieldProfileModel>("Common", data, "dto_to_model");
  return result;
}

export async function deleteImportProfile(id: number): Promise<void> {
  await apiClient.delete(`${env.apiBasePath}/metadata/import-profiles/${id}`);
}


// -------- Import Field Mappings --------

export type ListImportMappingsParams = {
  profileId: number;
};

export async function listImportFieldMappings(
  params: ListImportMappingsParams
): Promise<ImportFieldMappingModel[]> {
  const { profileId } = params;
  const { data } = await apiClient.get<{ data: any[] }>(
    `${env.apiBasePath}/metadata/import-mappings`,
    {
      params: { profile_id: profileId },
    }
  );
  const result = mapper.map<any[], ImportFieldMappingModel[]>("Common", data.data, "dto_to_model");
  return result;
}

export type CreateImportFieldMappingInput = {
  profileId: number;

  internalKind: string;
  internalPath: string;
  internalLabel: string;

  metadataCollectionSlug?: string | null;
  metadataFieldName?: string | null;

  dataType?: string | null;
  excelHeader?: string | null;
  excelColumn?: number | string | null;

  required?: boolean;
  unique?: boolean;

  transformHint?: string | null;
};

export type UpdateImportFieldMappingInput = Partial<CreateImportFieldMappingInput>;

export async function createImportFieldMapping(
  input: CreateImportFieldMappingInput
): Promise<ImportFieldMappingModel> {
  const { data } = await apiClient.post<any>(
    `${env.apiBasePath}/metadata/import-mappings`,
    input
  );
  const result = mapper.map<any, ImportFieldMappingModel>("Common", data, "dto_to_model");
  return result;
}

export async function updateImportFieldMapping(
  id: number,
  input: UpdateImportFieldMappingInput
): Promise<ImportFieldMappingModel> {
  const { data } = await apiClient.put<ImportFieldMappingModel>(
    `${env.apiBasePath}/metadata/import-mappings/${id}`,
    input
  );
  const result = mapper.map<any, ImportFieldMappingModel>("Common", data, "dto_to_model");
  return result;
}

export async function deleteImportFieldMapping(id: number): Promise<void> {
  await apiClient.delete(`${env.apiBasePath}/metadata/import-mappings/${id}`);
}
