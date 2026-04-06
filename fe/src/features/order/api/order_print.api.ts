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

export type DeliveryNotePaperSize = "A4" | "A5";

export interface DeliveryNotePrintRequest {
  order_id: number;
  paper_size?: DeliveryNotePaperSize;
  show_amounts?: boolean;
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

type PrintEndpointMessages = {
  badRequest: string;
  forbidden: string;
  serverError: string;
  fallback: string;
};

const deliveryNoteMessages: PrintEndpointMessages = {
  badRequest: "Thông tin yêu cầu in phiếu giao hàng không hợp lệ.",
  forbidden: "Bạn không có quyền thực hiện thao tác in phiếu giao hàng.",
  serverError: "Hệ thống gặp lỗi khi tạo file PDF. Vui lòng thử lại sau.",
  fallback: "Không thể in phiếu giao hàng vào lúc này.",
};

const qrSlipMessages: PrintEndpointMessages = {
  badRequest: "Thông tin yêu cầu in phiếu QR không hợp lệ.",
  forbidden: "Bạn không có quyền thực hiện thao tác in phiếu QR.",
  serverError: "Hệ thống gặp lỗi khi tạo phiếu QR. Vui lòng thử lại sau.",
  fallback: "Không thể in phiếu QR vào lúc này.",
};

function fallbackByStatus(status: number | undefined, messages: PrintEndpointMessages): string {
  switch (status) {
    case 400:
      return messages.badRequest;
    case 403:
      return messages.forbidden;
    case 500:
      return messages.serverError;
    default:
      return messages.fallback;
  }
}

async function parseAxiosErrorMessage(
  error: unknown,
  messages: PrintEndpointMessages,
): Promise<string> {
  if (!axios.isAxiosError(error)) {
    return messages.fallback;
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
        return pickErrorMessage(parsed) ?? fallbackByStatus(status, messages);
      }

      if (typeof responseData === "string") {
        const parsed = JSON.parse(responseData);
        return pickErrorMessage(parsed) ?? fallbackByStatus(status, messages);
      }

      return pickErrorMessage(responseData) ?? fallbackByStatus(status, messages);
    } catch {
      return fallbackByStatus(status, messages);
    }
  }

  return fallbackByStatus(status, messages);
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
      const message = await parseAxiosErrorMessage(error, deliveryNoteMessages);
      throw new Error(message);
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Không thể in phiếu giao hàng.");
  }
}

export async function printQRSlipA5(
  payload: Pick<DeliveryNotePrintRequest, "order_id">,
): Promise<Blob> {
  const { departmentApiPath } = useAuthStore.getState();

  try {
    const response = await apiClient.post<Blob>(`${departmentApiPath()}/order/print-qr-slip`, payload, {
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
      const message = await parseAxiosErrorMessage(error, qrSlipMessages);
      throw new Error(message);
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Không thể in phiếu QR.");
  }
}

export type { PrintPdfBlob };
