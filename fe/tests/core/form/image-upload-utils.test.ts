import { describe, expect, test } from "bun:test";
import type { FieldDef } from "../../../src/core/form/types";

const storage = new Map<string, string>();
globalThis.localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
  get length() {
    return storage.size;
  },
} as Storage;

async function loadUploadHelper() {
  const mod = await import("../../../src/core/form/image-upload-utils");
  return mod.uploadImageFieldsForSubmit;
}

function imageField(overrides: Partial<FieldDef> = {}): FieldDef {
  return {
    name: "avatar",
    label: "Avatar",
    kind: "imageupload",
    uploader: async () => [],
    ...overrides,
  } as FieldDef;
}

function testFile(name: string) {
  return new File(["image"], name, { type: "image/png" });
}

describe("deferred image uploads", () => {
  test("uploads File values during submit preparation and replaces them with URLs", async () => {
    const file = testFile("avatar.png");
    const uploaded: File[][] = [];
    const field = imageField({
      uploader: async (files) => {
        uploaded.push(files);
        return ["uploaded-avatar.png"];
      },
    });

    const uploadImageFieldsForSubmit = await loadUploadHelper();
    const result = await uploadImageFieldsForSubmit([field], { avatar: file, name: "Alice" });

    expect(uploaded).toHaveLength(1);
    expect(uploaded[0]).toEqual([file]);
    expect(result.values).toEqual({
      avatar: "uploaded-avatar.png",
      name: "Alice",
    });
    expect(result.uploadedUrls).toEqual(["uploaded-avatar.png"]);
  });

  test("keeps existing URL values and uploads only new File entries", async () => {
    const file = testFile("new-logo.png");
    const field = imageField({
      name: "logos",
      uploader: async (files) => {
        expect(files).toEqual([file]);
        return ["new-logo-url.png"];
      },
    });

    const uploadImageFieldsForSubmit = await loadUploadHelper();
    const result = await uploadImageFieldsForSubmit([field], {
      logos: ["existing-logo.png", file],
    });

    expect(result.values.logos).toEqual(["existing-logo.png", "new-logo-url.png"]);
    expect(result.uploadedUrls).toEqual(["new-logo-url.png"]);
  });

  test("does not call uploader when the image field has no File values", async () => {
    let called = false;
    const field = imageField({
      uploader: async () => {
        called = true;
        return [];
      },
    });

    const uploadImageFieldsForSubmit = await loadUploadHelper();
    const result = await uploadImageFieldsForSubmit([field], { avatar: "existing-avatar.png" });

    expect(called).toBe(false);
    expect(result.values.avatar).toBe("existing-avatar.png");
    expect(result.uploadedUrls).toEqual([]);
  });

  test("records uploaded URLs for cleanup when a later submit-preparation upload fails", async () => {
    const uploadedUrlSink: string[] = [];
    const firstFile = testFile("first.png");
    const secondFile = testFile("second.png");
    const fields = [
      imageField({
        name: "first",
        uploader: async () => ["first-url.png"],
      }),
      imageField({
        name: "second",
        uploader: async () => [],
      }),
    ];

    const uploadImageFieldsForSubmit = await loadUploadHelper();
    await expect(
      uploadImageFieldsForSubmit(fields, { first: firstFile, second: secondFile }, uploadedUrlSink),
    ).rejects.toThrow("Image upload returned 0 URL(s) for 1 file(s).");

    expect(uploadedUrlSink).toEqual(["first-url.png"]);
  });
});
