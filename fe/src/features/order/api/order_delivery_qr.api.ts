import axios from "axios";
import type {
  DeliveryQRConfirmResponse,
  DeliveryQRFlowError,
  DeliveryQRFlowErrorKind,
  DeliveryQRSessionStartResponse,
} from "@features/order/model/order-delivery-qr.model";

const deliveryQRClient = axios.create({
  baseURL: "",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

type StartSessionCacheEntry = {
  promise: Promise<DeliveryQRSessionStartResponse>;
  data?: DeliveryQRSessionStartResponse;
  cachedAt: number;
};

const startSessionCache = new Map<string, StartSessionCacheEntry>();
const START_SESSION_CACHE_MS = 10_000;

type ErrorPayload = {
  message?: string;
  error?: string;
  detail?: string;
  title?: string;
  msg?: string;
  statusMessage?: string;
  errorCode?: string;
  statusCode?: number;
  proof_image_url?: string;
};

function pickMessage(payload?: ErrorPayload): string | undefined {
  const candidates = [
    payload?.message,
    payload?.statusMessage,
    payload?.error,
    payload?.detail,
    payload?.title,
    payload?.msg,
  ];

  return candidates.find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0,
  );
}

function inferErrorKind(
  text: string,
  statusCode?: number,
): DeliveryQRFlowErrorKind {
  const normalized = text.toLowerCase();

  if (
    normalized.includes("already delivered") ||
    normalized.includes("đã được giao") ||
    normalized.includes("already_delivery") ||
    normalized.includes("already-delivered")
  ) {
    return "alreadyDelivered";
  }

  if (
    normalized.includes("too large") ||
    normalized.includes("file too large") ||
    normalized.includes("size") ||
    normalized.includes("dung lượng")
  ) {
    return "fileTooLarge";
  }

  if (
    normalized.includes("mime") ||
    normalized.includes("photo") ||
    normalized.includes("image") ||
    normalized.includes("file")
  ) {
    return "fileInvalid";
  }

  if (
    normalized.includes("expired") ||
    normalized.includes("hết hạn") ||
    normalized.includes("session not found") ||
    normalized.includes("session_not_found") ||
    normalized.includes("not found") ||
    statusCode === 410
  ) {
    return "expired";
  }

  if (
    normalized.includes("invalid") ||
    normalized.includes("không hợp lệ") ||
    normalized.includes("used token") ||
    normalized.includes("already used") ||
    normalized.includes("token")
  ) {
    return "invalid";
  }

  return "error";
}

function fallbackMessage(kind: DeliveryQRFlowErrorKind): string {
  switch (kind) {
    case "alreadyDelivered":
      return "Đơn hàng đã được giao trước đó.";
    case "expired":
      return "Phiên xác nhận đã hết hạn. Vui lòng quét lại QR.";
    case "invalid":
      return "QR không hợp lệ hoặc đã được sử dụng. Vui lòng quét lại QR mới.";
    case "fileInvalid":
      return "Ảnh xác nhận không hợp lệ. Vui lòng chọn ảnh JPG, PNG hoặc WEBP.";
    case "fileTooLarge":
      return "Ảnh xác nhận vượt quá dung lượng cho phép. Vui lòng chọn ảnh nhỏ hơn 5MB.";
    default:
      return "Không thể xử lý yêu cầu xác nhận giao hàng lúc này.";
  }
}

function toDeliveryQRFlowError(error: unknown): DeliveryQRFlowError {
  if (!axios.isAxiosError(error)) {
    return {
      kind: "error",
      message: error instanceof Error
        ? error.message
        : "Không thể xử lý yêu cầu xác nhận giao hàng lúc này.",
    };
  }

  const payload = (error.response?.data ?? {}) as ErrorPayload;
  const statusCode =
    typeof payload.statusCode === "number"
      ? payload.statusCode
      : error.response?.status;
  const errorCode = payload.errorCode;
  const rawText = [pickMessage(payload), errorCode].filter(Boolean).join(" ");
  const kind = inferErrorKind(rawText, statusCode);

  return {
    kind,
    statusCode,
    errorCode,
    message: pickMessage(payload) ?? fallbackMessage(kind),
    proofImageUrl:
      typeof payload.proof_image_url === "string" && payload.proof_image_url.trim().length > 0
        ? payload.proof_image_url
        : undefined,
  };
}

export async function startDeliveryQRSession(
  token: string,
): Promise<DeliveryQRSessionStartResponse> {
  const cacheKey = token.trim();
  const cached = startSessionCache.get(cacheKey);
  const now = Date.now();

  if (cached) {
    if (cached.data && now - cached.cachedAt < START_SESSION_CACHE_MS) {
      return cached.data;
    }

    if (!cached.data) {
      return cached.promise;
    }

    startSessionCache.delete(cacheKey);
  }

  const request = deliveryQRClient.get<DeliveryQRSessionStartResponse>(
    `/api/department/orders/delivery/qr/${encodeURIComponent(token)}/start`,
  )
    .then(({ data }) => {
      startSessionCache.set(cacheKey, {
        promise: Promise.resolve(data),
        data,
        cachedAt: Date.now(),
      });
      return data;
    })
    .catch((error) => {
      startSessionCache.delete(cacheKey);
      throw toDeliveryQRFlowError(error);
    });

  startSessionCache.set(cacheKey, {
    promise: request,
    cachedAt: now,
  });

  try {
    return await request;
  } finally {
    const latest = startSessionCache.get(cacheKey);
    if (latest && !latest.data) {
      startSessionCache.delete(cacheKey);
    }
  }
}

export async function confirmDeliveredByQRSession(photo: File): Promise<DeliveryQRConfirmResponse> {
  try {
    const formData = new FormData();
    formData.append("photo", photo);

    const { data } = await deliveryQRClient.post<DeliveryQRConfirmResponse>(
      "/api/department/orders/delivery/confirm",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return data;
  } catch (error) {
    throw toDeliveryQRFlowError(error);
  }
}
