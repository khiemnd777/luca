import { apiClient } from "@core/network/api-client";
import type { MeModel } from "@root/core/auth/auth.types";
import { env } from "@core/config/env";
import { mapper } from "@core/mapper/auto-mapper";

export async function fetchMe(): Promise<MeModel> {
  const { data } = await apiClient.get<any>(`${env.apiBasePath}/profile/me`);
  const result = mapper.map<any, MeModel>("Me", data, "dto_to_model");
  return result;
}

export async function updateMe(me: MeModel): Promise<MeModel> {
  const { data } = await apiClient.put<any>(`${env.apiBasePath}/profile/me`, me);
  const result = mapper.map<any, MeModel>("Me", data, "dto_to_model");
  return result;
}

export async function changeMyPassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.put<any>(`${env.apiBasePath}/profile/me/change-password`, {
    "current_password": currentPassword,
    "new_password": newPassword
  });
}

export async function existsEmail(email: string): Promise<boolean> {
  const { data } = await apiClient.post<boolean>(`${env.apiBasePath}/profile/me/exists-email`, {
    email
  });
  return data;
}

export async function existsPhone(phone: string): Promise<boolean> {
  const { data } = await apiClient.post<boolean>(`${env.apiBasePath}/profile/me/exists-phone`, {
    phone
  });
  return data;
}
