import { apiClient } from "@core/network/api-client";
import { useAuthStore } from "@store/auth-store";
import type { OrderPrescriptionFileModel } from "../model/order-prescription-file.model";

function mapFileDto(input: any): OrderPrescriptionFileModel {
  return {
    id: Number(input?.id ?? 0),
    orderId: Number(input?.order_id ?? 0),
    orderItemId: Number(input?.order_item_id ?? 0),
    fileName: String(input?.file_name ?? ""),
    fileUrl: String(input?.file_url ?? ""),
    fileType: String(input?.file_type ?? ""),
    format: String(input?.format ?? ""),
    mimeType: String(input?.mime_type ?? ""),
    sizeBytes: Number(input?.size_bytes ?? 0),
    createdAt: String(input?.created_at ?? ""),
  };
}

export async function listPrescriptionFiles(orderId: number): Promise<OrderPrescriptionFileModel[]> {
  const { departmentApiPath } = useAuthStore.getState();
  const { data } = await apiClient.get<any[]>(
    `${departmentApiPath()}/order/${orderId}/prescription-files`
  );
  return Array.isArray(data) ? data.map(mapFileDto) : [];
}

export async function uploadPrescriptionFile(orderId: number, file: File): Promise<OrderPrescriptionFileModel> {
  const { departmentApiPath } = useAuthStore.getState();
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<any>(
    `${departmentApiPath()}/order/${orderId}/prescription-files`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return mapFileDto(data);
}

export async function deletePrescriptionFile(orderId: number, fileId: number): Promise<void> {
  const { departmentApiPath } = useAuthStore.getState();
  await apiClient.delete(`${departmentApiPath()}/order/${orderId}/prescription-files/${fileId}`);
}

export function getPrescriptionFileContentUrl(orderId: number, fileId: number): string {
  const { departmentApiPath } = useAuthStore.getState();
  return `${departmentApiPath()}/order/${orderId}/prescription-files/${fileId}/content`;
}
