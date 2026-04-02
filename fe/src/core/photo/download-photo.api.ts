// photo-download.ts
import { apiClient } from "@core/network/api-client";
import { env } from "@core/config/env";
import { bytesToBlob } from "@shared/utils/file.utils";
import type { PhotoSize } from "@core/photo/photo.types";

/**
 * Tải bytes của ảnh theo filename + size.
 * Trả về Uint8Array (tương đương Uint8List bên Flutter).
 */
export async function downloadPhoto(
  filename: string,
  size: PhotoSize = "original",
  timeout = 30_000
): Promise<Uint8Array> {
  const url = `${env.apiBasePath}/photo/file/${encodeURIComponent(filename)}`;

  const res = await apiClient.get<ArrayBuffer>(url, {
    params: { size },
    responseType: "arraybuffer",
    timeout,
  });

  if (res.status === 200) {
    return new Uint8Array(res.data);
  }
  throw new Error(`❌ Failed to load photo: ${res.status}`);
}

export function saveBytesAsFile(
  bytes: Uint8Array,
  filename: string,
  mime = "image/jpeg"
) {
  const blob = bytesToBlob(bytes, mime);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** (Tuỳ chọn) Nếu bạn muốn lấy luôn content-type từ header */
export async function downloadPhotoWithMeta(
  filename: string,
  size: PhotoSize = "original",
  timeout = 30_000
): Promise<{ bytes: Uint8Array; contentType?: string }> {
  const url = `${env.apiBasePath}/photo/file/${encodeURIComponent(filename)}`;

  const res = await apiClient.get<ArrayBuffer>(url, {
    params: { size },
    responseType: "arraybuffer",
    timeout,
  });

  if (res.status !== 200) {
    throw new Error(`❌ Failed to load photo: ${res.status}`);
  }

  const contentType =
    (res.headers["content-type"] as string | undefined) ??
    (res.headers["Content-Type"] as string | undefined);

  return { bytes: new Uint8Array(res.data), contentType };
}
