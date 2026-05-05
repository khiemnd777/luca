import type { UploadProgress } from "@core/form/image-upload-field";
import type { FieldDef } from "@core/form/types";
import { deletePhoto, getPhotoByFileName, uploadImage } from "@core/photo/photo.api";

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

export type DeferredImageUploadResult = {
  values: Record<string, unknown>;
  uploadedUrls: string[];
};

export async function uploadImageFieldsForSubmit(
  fields: FieldDef[],
  values: Record<string, unknown>,
  uploadedUrlSink?: string[],
): Promise<DeferredImageUploadResult> {
  const nextValues = { ...values };
  const uploadedUrls: string[] = [];

  for (const field of fields) {
    if (field.kind !== "imageupload" || !field.uploader) continue;

    const currentValue = nextValues[field.name];
    const currentList = Array.isArray(currentValue) ? currentValue : [currentValue];
    const files = currentList.filter((item): item is File => item instanceof File);

    if (files.length === 0) continue;

    const urls = await field.uploader(files);
    uploadedUrls.push(...urls);
    uploadedUrlSink?.push(...urls);

    if (urls.length !== files.length) {
      throw new Error(`Image upload returned ${urls.length} URL(s) for ${files.length} file(s).`);
    }

    let fileIndex = 0;
    const mappedValue = currentList.map((item) => {
      if (item instanceof File) {
        const uploadedUrl = urls[fileIndex];
        fileIndex += 1;
        return uploadedUrl;
      }
      return item;
    });

    nextValues[field.name] = Array.isArray(currentValue) ? mappedValue : (mappedValue[0] ?? "");
  }

  return {
    values: nextValues,
    uploadedUrls,
  };
}

export async function cleanupUploadedImageUrls(urls: string[]): Promise<void> {
  const filenames = Array.from(new Set(urls.map(extractPhotoFilename).filter(Boolean)));

  await Promise.allSettled(
    filenames.map(async (filename) => {
      const photo = await getPhotoByFileName(filename);
      if (photo.id == null) return;
      await deletePhoto(photo.id);
    }),
  );
}

function extractPhotoFilename(url: string): string {
  const withoutQuery = url.split(/[?#]/)[0] ?? "";
  const parts = withoutQuery.split(/[\\/]/);
  return parts[parts.length - 1] ?? "";
}
