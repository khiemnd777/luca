import toast from "react-hot-toast";
import {
  printDeliveryNote,
  printQRSlipA5,
  type DeliveryNotePaperSize,
  type DeliveryNotePrintRequest,
  type PrintPdfBlob,
} from "./order_print.api";

const FALLBACK_FILE_NAME = "delivery-note.pdf";

/**
 * Extract a safe filename from Content-Disposition.
 * Supports both filename= and RFC5987 filename*=.
 */
export function extractFileNameFromDisposition(header?: string): string {
  if (!header || !header.trim()) {
    return FALLBACK_FILE_NAME;
  }

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      const decoded = decodeURIComponent(utf8Match[1].trim());
      return sanitizeFileName(decoded) || FALLBACK_FILE_NAME;
    } catch {
      // Continue to fallback parsing.
    }
  }

  const asciiMatch = header.match(/filename\s*=\s*"?([^";]+)"?/i);
  if (asciiMatch?.[1]) {
    return sanitizeFileName(asciiMatch[1].trim()) || FALLBACK_FILE_NAME;
  }

  return FALLBACK_FILE_NAME;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, "_").trim();
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    // Release memory quickly for large PDF blobs.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
}

/**
 * Print delivery note then download returned PDF as an attachment.
 * This does not open a new tab.
 */
export async function downloadDeliveryNote(
  payload: DeliveryNotePrintRequest,
): Promise<void> {
  try {
    const blob = (await printDeliveryNote(payload)) as PrintPdfBlob;
    const filename = extractFileNameFromDisposition(blob.__contentDisposition);

    triggerBrowserDownload(blob, filename);
    toast.success("Đã tải phiếu giao hàng.");
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Không thể in phiếu giao hàng.";

    toast.error(message);
    throw error;
  }
}

export async function downloadQRSlipA5(
  payload: Pick<DeliveryNotePrintRequest, "order_id">,
): Promise<void> {
  try {
    const blob = (await printQRSlipA5(payload)) as PrintPdfBlob;
    const filename = extractFileNameFromDisposition(blob.__contentDisposition);

    triggerBrowserDownload(blob, filename);
    toast.success("Đã tải phiếu QR.");
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Không thể in phiếu QR.";

    toast.error(message);
    throw error;
  }
}

export type { DeliveryNotePrintRequest };
export type { DeliveryNotePaperSize };
