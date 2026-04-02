import { camelToSnake } from "@root/shared/utils/string.utils";

export type MetaBlock = {
  meta: {
    prop?: string;
    metadata?: { collection?: string; group?: string };
  };
  fields: { name: string }[];
  collections?: string[];
};

/* ======================================================
   PACKAGE DATA — FULL & FINAL
   ====================================================== */
export function packageData(metaBlocks: MetaBlock[], values: any) {
  // -----------------------------------------------------
  // BUILD dto (root + nested)
  // -----------------------------------------------------
  const flat: Record<string, any> = { ...values };
  const nested = buildNestedPayload(flat);
  const dto: any = { ...extractRoot(flat), ...nested };

  // normalize toàn bộ
  normalizeObject(dto);

  // -----------------------------------------------------
  // PREPARE OUTPUT
  // -----------------------------------------------------
  const output: {
    dto: Record<string, any>;
    collections: string[];
  } = {
    dto: {},
    collections: [],
  };

  const nestedOut: Record<
    string,
    { dto: Record<string, any>; collections: string[] }
  > = {};

  // collect root / nested collections
  for (const b of metaBlocks) {
    const collSource =
      b.collections && b.collections.length > 0
        ? b.collections
        : b.meta.metadata?.collection
        ? [b.meta.metadata.collection]
        : [];
    const usedCollections = Array.from(new Set(collSource));
    if (usedCollections.length === 0) continue;

    if (!b.meta.prop) {
      output.collections.push(...usedCollections);
    } else {
      if (!nestedOut[b.meta.prop]) {
        nestedOut[b.meta.prop] = { dto: {}, collections: [] };
      }
      nestedOut[b.meta.prop].collections.push(...usedCollections);
    }
  }

  // -----------------------------------------------------
  // ROOT DTO (snake keys)
  // -----------------------------------------------------
  for (const [k, v] of Object.entries(dto)) {
    const isNestedProp = metaBlocks.some((b) => b.meta.prop === k);
    if (!isNestedProp) {
      output.dto[camelToSnake(k)] = v;
    }
  }

  // -----------------------------------------------------
  // ATTACH NESTED DTOs (snake prop)
  // -----------------------------------------------------
  for (const [prop, obj] of Object.entries(nestedOut)) {
    obj.dto = dto[prop] ?? {};

    const upsertProp = camelToSnake(prop + "Upsert");
    output.dto[upsertProp] = {
      dto: obj.dto,
      collections: obj.collections,
    };

  }

  return output;
}

/* ======================================================
   HELPERS — EXACT SERVER NORMALIZATION
   ====================================================== */

function extractRoot(flat: Record<string, any>) {
  const out: any = {};
  for (const [k, v] of Object.entries(flat)) {
    if (!k.includes(".")) out[k] = v;
  }
  return out;
}

function buildNestedPayload(flat: Record<string, any>) {
  const out: any = {};
  for (const [k, v] of Object.entries(flat)) {
    if (!k.includes(".")) continue;

    const idx = k.lastIndexOf(".");
    const last = k.slice(idx + 1);
    if (/^\d+$/.test(last)) {
      continue;
    }

    const parts = k.split(".");
    let cur = out;

    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!(p in cur)) cur[p] = {};
      cur = cur[p];
    }

    cur[parts[parts.length - 1]] = v;
  }
  return out;
}

function normalizeObject(obj: any) {
  if (!obj || typeof obj !== "object") return;

  // ---------------------------------------------
  // Convert objects with numeric keys → arrays
  // ---------------------------------------------
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const rec = v as Record<string, any>;
      const keys = Object.keys(rec);
      const allNumeric = keys.every((x) => /^\d+$/.test(x));

      if (allNumeric) {
        // sort numeric keys and build array
        const arr: any[] = [];
        keys.sort((a, b) => Number(a) - Number(b));
        for (const key of keys) {
          arr.push(rec[key]);
        }
        obj[k] = arr;
      }
    }
  }

  // -------------------------------------------------
  // customFields → custom_fields (snake keys)
  // -------------------------------------------------
  if (obj.customFields && typeof obj.customFields === "object") {
    obj.custom_fields = {};
    for (const [k, v] of Object.entries(obj.customFields)) {
      obj.custom_fields[camelToSnake(k)] = v;
    }
    delete obj.customFields;
  }

  // -------------------------------------------------
  // relationFields → core + custom_fields
  // -------------------------------------------------
  const rel = obj.relationFields ?? obj.relation_fields;
  if (rel && typeof rel === "object") {
    for (const [k, v] of Object.entries(rel)) {
      const sk = camelToSnake(k);
      obj[sk] = v;
      if (!obj.custom_fields) obj.custom_fields = {};
      obj.custom_fields[sk] = v;
    }
    delete obj.relationFields;
    delete obj.relation_fields;
  }

  // -------------------------------------------------
  // recursion
  // -------------------------------------------------
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") normalizeObject(v);
  }
}
