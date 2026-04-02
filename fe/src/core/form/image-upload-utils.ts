import type { UploadProgress } from "@core/form/image-upload-field";
import { uploadImage } from "@core/photo/photo.api";

export async function uploadImages(files: File[], onProgress?: (p: UploadProgress) => void): Promise<string[]> {
  const results: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const photo = await uploadImage(f, {
      onUploadProgress: (ev) => {
        if (!onProgress || !ev.total) return;
        const percent = Math.round((ev.loaded / ev.total) * 100);
        onProgress({ index: i, progress: percent });
      },
    });
    if (photo.url) {
      results.push(photo.url);
    }
  }
  return results;
}
