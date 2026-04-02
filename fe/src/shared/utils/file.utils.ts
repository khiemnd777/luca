function toArrayBufferPart(bytes: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (bytes instanceof Uint8Array) {
    const copy = bytes.slice(); // Uint8Array copy
    return copy.buffer;         // <- ArrayBuffer
  }
  return bytes;
}

export function bytesToBlob(
  bytes: Uint8Array | ArrayBuffer,
  mime = "application/octet-stream"
): Blob {
  const part = toArrayBufferPart(bytes);
  return new Blob([part], { type: mime });
}

export function bytesToBlobUrl(bytes: Uint8Array | ArrayBuffer, mime = "application/octet-stream"): string {
  const buf = bytes instanceof Uint8Array ? bytes.slice().buffer : bytes; // tránh SharedArrayBuffer
  const blob = new Blob([buf], { type: mime });
  return URL.createObjectURL(blob);
}