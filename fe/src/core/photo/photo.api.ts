import { apiClient } from "@core/network/api-client";
import type { PhotoModel } from "@core/photo/photo.types";
import { env } from "@core/config/env";
import { mapper } from "@core/mapper/auto-mapper";
import type { AxiosRequestConfig } from "axios";
import { useAuthStore } from "@store/auth-store";

export async function uploadImage(file: File, config?: AxiosRequestConfig<any> | undefined): Promise<PhotoModel> {
  const { user } = useAuthStore.getState();
  const ext = file.name.split(".").pop() || "jpg";
  const randomName = `${crypto.randomUUID()}.${ext}`;

  const formData = new FormData();
  formData.append("photo", file, randomName);
  formData.append("user_id", String(user?.id));

  const { data } = await apiClient.post<any>(`${env.apiBasePath}/photo`, formData, {
    timeout: 30_000,
    headers: { "Content-Type": "multipart/form-data" },
    ...config,
  });

  const result = mapper.map<any, PhotoModel>("Photo", data, "dto_to_model");
  return result;
}
