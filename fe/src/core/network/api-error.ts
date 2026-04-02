export type ApiErrorPayload = {
  statusCode?: number;
  errorCode?: string;
  statusMessage?: string;
};

export class ApiServiceError extends Error {
  readonly statusCode?: number;
  readonly errorCode?: string;
  readonly statusMessage?: string;

  constructor(payload: ApiErrorPayload) {
    super(payload.statusMessage || "Service message");
    this.name = "ApiServiceError";
    this.statusCode = payload.statusCode;
    this.errorCode = payload.errorCode;
    this.statusMessage = payload.statusMessage;
  }
}

function asRecord(input: unknown): Record<string, unknown> | null {
  return input && typeof input === "object" ? (input as Record<string, unknown>) : null;
}

function readPayloadFromRecord(record: Record<string, unknown>): ApiErrorPayload | null {
  const statusCode = typeof record.statusCode === "number" ? record.statusCode : undefined;
  const errorCode = typeof record.errorCode === "string" ? record.errorCode : undefined;
  const statusMessage = typeof record.statusMessage === "string" ? record.statusMessage : undefined;

  if (statusCode === undefined && !errorCode && !statusMessage) return null;
  return { statusCode, errorCode, statusMessage };
}

export function extractApiErrorPayload(err: unknown): ApiErrorPayload | null {
  if (err instanceof ApiServiceError) {
    return {
      statusCode: err.statusCode,
      errorCode: err.errorCode,
      statusMessage: err.statusMessage,
    };
  }

  const source = asRecord(err);
  if (!source) return null;

  const direct = readPayloadFromRecord(source);
  if (direct) return direct;

  const response = asRecord(source.response);
  const data = response ? asRecord(response.data) : null;
  if (!data) return null;

  return readPayloadFromRecord(data);
}

const ERROR_CODE_MESSAGES: Record<string, string> = {
  ErrInvalidOrExpiredOrderCode: "Mã đơn hàng không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại và thử lại.",
  ErrInvalidOrderCode: "Mã đơn hàng không hợp lệ. Vui lòng kiểm tra lại thông tin.",
  ErrExpiredOrderCode: "Mã đơn hàng đã hết hạn. Vui lòng tạo lại thao tác và thử lại.",
};

function inferMessageFromCode(errorCode?: string): string | null {
  if (!errorCode) return null;

  const exact = ERROR_CODE_MESSAGES[errorCode];
  if (exact) return exact;

  if (errorCode.includes("OrderCode") && errorCode.includes("Expired")) {
    return "Mã đơn hàng đã hết hạn. Vui lòng thử lại với mã mới.";
  }

  if (errorCode.includes("OrderCode") && errorCode.includes("Invalid")) {
    return "Mã đơn hàng không hợp lệ. Vui lòng kiểm tra lại và thử lại.";
  }

  if (errorCode.includes("OrderCode")) {
    return "Có lỗi với mã đơn hàng. Vui lòng kiểm tra lại và thử lại.";
  }

  return null;
}

export function getUserFriendlyErrorMessage(
  err: unknown
): string | null {
  const payload = extractApiErrorPayload(err);

  const byCode = inferMessageFromCode(payload?.errorCode);
  if (byCode) return byCode;

  if (payload?.statusMessage) return payload.statusMessage;

  return null;
}
