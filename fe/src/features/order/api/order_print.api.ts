import { apiClient } from "@core/network/api-client";
import axios from "axios";
import { useAuthStore } from "@store/auth-store";

/**
 * TODO: Replace loose field maps with strict fields once backend contract is finalized.
 */
export interface DeliveryNoteCompany {
  [key: string]: unknown;
}

export interface DeliveryNoteAttachments {
  [key: string]: unknown;
}

export interface DeliveryNoteImplantAccessories {
  [key: string]: unknown;
}

export interface DeliveryNotePaymentMethod {
  [key: string]: unknown;
}

export interface DeliveryNotePrintRequest {
  order_id: number;
  company?: DeliveryNoteCompany;
  attachments?: DeliveryNoteAttachments;
  implant_accessories?: DeliveryNoteImplantAccessories;
  payment_method?: DeliveryNotePaymentMethod;
}

type PrintPdfBlob = Blob & {
  __contentDisposition?: string;
};

function getHeader(
  headers: Record<string, unknown> | undefined,
  headerName: string,
): string | undefined {
  if (!headers) return undefined;

  const direct = headers[headerName] ?? headers[headerName.toLowerCase()];
  if (typeof direct === "string") return direct;

  const foundKey = Object.keys(headers).find(
    (key) => key.toLowerCase() === headerName.toLowerCase(),
  );
  if (!foundKey) return undefined;

  const value = headers[foundKey];
  return typeof value === "string" ? value : undefined;
}

function pickErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;

  const rec = payload as Record<string, unknown>;
  const candidates = [
    rec.message,
    rec.error,
    rec.detail,
    rec.title,
    rec.msg,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return undefined;
}

function fallbackByStatus(status?: number): string {
  switch (status) {
    case 400:
      return "Thông tin yêu cầu in phiếu giao hàng không hợp lệ.";
    case 403:
      return "Bạn không có quyền thực hiện thao tác in phiếu giao hàng.";
    case 500:
      return "Hệ thống gặp lỗi khi tạo file PDF. Vui lòng thử lại sau.";
    default:
      return "Không thể in phiếu giao hàng vào lúc này.";
  }
}

async function parseAxiosErrorMessage(error: unknown): Promise<string> {
  if (!axios.isAxiosError(error)) {
    return "Không thể in phiếu giao hàng.";
    
  }

  const status = error.response?.status;
  const headers = error.response?.headers as Record<string, unknown> | undefined;
  const contentType = getHeader(headers, "content-type")?.toLowerCase() ?? "";
  const responseData = error.response?.data;

  if (contentType.includes("application/json") && responseData !== undefined) {
    try {
      if (responseData instanceof Blob) {
        const text = await responseData.text();
        const parsed = JSON.parse(text);
        return pickErrorMessage(parsed) ?? fallbackByStatus(status);
      }

      if (typeof responseData === "string") {
        const parsed = JSON.parse(responseData);
        return pickErrorMessage(parsed) ?? fallbackByStatus(status);
      }

      return pickErrorMessage(responseData) ?? fallbackByStatus(status);
    } catch {
      return fallbackByStatus(status);
    }
  }

  return fallbackByStatus(status);
}

/**
 * Call backend printing endpoint and return PDF blob.
 *
 * Notes:
 * - We force `responseType: "blob"` to safely handle large PDF payloads.
 * - If backend responds with JSON error (400/403/500), we parse and throw
 *   a readable Error message for upper layers.
 */
export async function printDeliveryNote(
  payload: DeliveryNotePrintRequest,
): Promise<Blob> {
  const { departmentApiPath } = useAuthStore.getState();

  try {
    const response = await apiClient.post<Blob>(`${departmentApiPath()}/order/print`, payload, {
      responseType: "blob",
      headers: {
        Accept: "application/pdf",
      },
      dedupKey: false,
      timeout: 60_000,
    });

    const contentType = getHeader(response.headers as Record<string, unknown>, "content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("application/pdf")) {
      throw new Error("Phan hoi khong phai file PDF hop le.");
    }

    const blob = response.data as PrintPdfBlob;
    blob.__contentDisposition = getHeader(
      response.headers as Record<string, unknown>,
      "content-disposition",
    );

    return blob;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = await parseAxiosErrorMessage(error);
      throw new Error(message);
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Không thể in phiếu giao hàng.");
  }
}

export type { PrintPdfBlob };
