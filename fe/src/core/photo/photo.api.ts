import { apiClient } from "@core/network/api-client";
import type { PhotoModel } from "@core/photo/photo.types";
import { env } from "@core/config/env";
import { mapper } from "@core/mapper/auto-mapper";
import type { AxiosRequestConfig } from "axios";
import { useAuthStore } from "@store/auth-store";

export async function uploadImage(file: File, config?: AxiosRequestConfig<unknown> | undefined): Promise<PhotoModel> {
  const { user } = useAuthStore.getState();
  const ext = file.name.split(".").pop() || "jpg";
  const randomName = `${crypto.randomUUID()}.${ext}`;

  const formData = new FormData();
  formData.append("photo", file, randomName);
  formData.append("user_id", String(user?.id));

  const { data } = await apiClient.post<unknown>(`${env.apiBasePath}/photo`, formData, {
    timeout: 30_000,
    headers: { "Content-Type": "multipart/form-data" },
    ...config,
  });

  const result = mapper.map<unknown, PhotoModel>("Photo", data, "dto_to_model");
  return result;
}

export async function getPhotoByFileName(filename: string): Promise<PhotoModel> {
  const { data } = await apiClient.get<unknown>(`${env.apiBasePath}/photo/name/${encodeURIComponent(filename)}`);
  return mapper.map<unknown, PhotoModel>("Photo", data, "dto_to_model");
}

export async function deletePhoto(id: number): Promise<void> {
  await apiClient.delete(`${env.apiBasePath}/photo/${id}`);
}
