import * as React from "react";
import { Stack } from "@mui/material";
import toast from "react-hot-toast";

import { AutoFormFieldsGrouped } from "@core/form/auto-form-fields";
import { useAutoForm, validateOneSync } from "@core/form/use-auto-form";

import type {
  AutoFormRef,
  AutoFormProps,
  FormSchema,
  FormMode,
  ModeText,
  SubmitButton,
} from "@core/form/form.types";

import type { FieldDef, FieldKind, FormContext } from "@core/form/types";
import type {
  FieldModel,
  CollectionWithFieldsModel,
} from "@core/metadata/data/metadata.model";

import { getFormSchema } from "@core/form/form-registry";
import {
  getAvailableCollection,
  listCollectionsByGroup,
} from "@core/metadata/data/metadata.api";

import { snakeToCamel } from "@root/shared/utils/string.utils";
import { isJSON, parseJSON } from "@root/shared/utils/json.utils";
import { parseShowIfDependencies } from "@root/shared/metadata/utils";
import { rel1, relM2m, search } from "../relation/relation.api";
import { openFormDialog } from "./form-dialog.service";
import { extractVars } from "@root/shared/utils/equation.utils";
import { parseIntSafe } from "@root/shared/utils/number.utils";
import { packageData } from "./auto-form-package";
import { resolveSubmitButtons } from "./auto-form.helper";
import { emit, off, on } from "../module/event-bus";
import { getUserFriendlyErrorMessage } from "@core/network/api-error";

function mapMetadataFieldTypeToFieldKind(type: string): FieldKind {
  switch (type) {
    case "text": return "text";
    case "textarea": case "richtext": return "textarea";
    case "email": return "email";
    case "number": return "number";
    case "currency": return "currency";
    case "currency_equation": return "currency-equation";
    case "date": return "date";
    case "datetime": return "datetime";
    case "boolean": return "switch";
    case "select": return "select";
    case "multiselect": return "multiselect";
    case "image": return "imageupload";
    case "relation": return "relation";
    default: return "text";
  }
}

const metadataGroupCache = new Map<string, Promise<CollectionWithFieldsModel[]>>();

async function fetchMetadataGroupCollections(
  group: string,
  tag?: string | null,
): Promise<CollectionWithFieldsModel[]> {
  if (!group) return [];

  let promise = metadataGroupCache.get(group);
  if (!promise) {
    promise = listCollectionsByGroup(group, {
      limit: 1000,
      offset: 0,
      withFields: false,
      tag,
      table: false,
      form: false,
    }).then((res) => res.data)
      .catch((err) => {
        metadataGroupCache.delete(group);
        throw err;
      });
    metadataGroupCache.set(group, promise);
  }

  return promise;
}

function resolveMetadataCollection(metaField: FieldDef, ctx?: FormContext | null) {
  const metadata = metaField.metadata;
  if (!metadata) return null;
  if (metadata.collectionFn && ctx) {
    return metadata.collectionFn(ctx) || metadata.collection || null;
  }
  return metadata.collection ?? null;
}

async function expandMetadataBlock(
  metaField: FieldDef,
  values: any,
  changedDeps: string[],
  ctx?: FormContext | null,
): Promise<{ fields: FieldDef[]; deps: string[]; collections: string[] }> {
  const metadata = metaField.metadata;
  if (!metadata?.group) {
    const derivedMeta = metadata?.collectionFn
      ? {
        ...metaField,
        metadata: {
          ...metadata,
          collection: resolveMetadataCollection(metaField, ctx) ?? undefined,
        },
      }
      : metaField;
    return expandOneMetadataBlock(derivedMeta, values, changedDeps, ctx);
  }

  try {
    const collections = await fetchMetadataGroupCollections(metadata.group, metadata.tag);
    if (!collections.length) return { fields: [], deps: [], collections: [] };

    const { group: _omit, ...restMeta } = metadata;
    const results = await Promise.all(
      collections.map((collection) => {
        const derivedMeta: FieldDef = {
          ...metaField,
          metadata: {
            ...restMeta,
            collection: collection.slug,
          },
        };
        return expandOneMetadataBlock(derivedMeta, values, changedDeps, ctx);
      })
    );

    const fields = results.flatMap((res) => res.fields);
    const deps = Array.from(new Set(results.flatMap((res) => res.deps)));
    const participatedCollections = Array.from(
      new Set(results.flatMap((res) => res.collections))
    );
    return { fields, deps, collections: participatedCollections };
  } catch (err) {
    console.error("Failed to load metadata group", metadata.group, err);
    return { fields: [], deps: [], collections: [] };
  }
}

async function expandOneMetadataBlock(
  metaField: FieldDef,
  values: any,
  changedDeps: string[],
  ctx?: FormContext | null,
): Promise<{ fields: FieldDef[]; deps: string[]; collections: string[] }> {
  const metadata = metaField.metadata!;
  const collection = resolveMetadataCollection(metaField, ctx);
  const { mode = "whole", fields, tag, ignoreFields } = metadata;
  if (!collection) {
    return { fields: [], deps: [], collections: [] };
  }
  const params = changedDeps.map((dep) => ({
    field: dep,
    value: values[dep],
  }));

  const coll = await getAvailableCollection(
    collection,
    true,
    tag,
    false,
    true,
    values,
    params,
  );

  if (!coll) return { fields: [], deps: [], collections: [] };

  // parse showIf deps
  let deps: string[] = [];
  if (coll.showIf && isJSON(coll.showIf)) {
    deps = parseShowIfDependencies(coll.showIf);
    if (deps.length > 0) {
      const prop = metaField.prop;
      const cfPrefix = prop ? `${prop}.` : "";
      deps = deps.map((d) => {
        const camel = snakeToCamel(d);
        if (!camel.startsWith(cfPrefix)) {
          return `${cfPrefix}${camel}`;
        }
        return camel;
      });
    }
  }

  let fieldsToUse: FieldModel[] | undefined = coll.fields;
  fieldsToUse = fieldsToUse?.map((mf) => ({
    ...mf,
    name: snakeToCamel(mf.name),
  }));

  const camelIgnores = ignoreFields?.map(snakeToCamel);

  if (mode === "partial" && fields?.length) {
    fieldsToUse = fieldsToUse?.filter((mf) => fields.includes(mf.name));
  }

  if (mode === "whole" && camelIgnores?.length) {
    fieldsToUse = fieldsToUse?.filter((mf) => !camelIgnores.includes(mf.name));
  }

  const out: FieldDef[] = [];

  for (const mf of fieldsToUse ?? []) {
    const kind = mapMetadataFieldTypeToFieldKind(mf.type);
    const group = resolveMetadataFieldGroup(metaField, mf.name);

    if (kind === "currency-equation") {
      const prop = metaField.prop;
      const cfPrefix = prop ? `${prop}.customFields` : `customFields`;
      const override = metaField.metadata?.def?.find(d => d.name === mf.name);
      const fd: FieldDef = {
        prop,
        kind: "currency-equation",
        name: `${cfPrefix}.${mf.name}`,
        label: mf.label ?? mf.name,
        currencyEquation: snakeToCamel(mf.defaultValue ?? ""),
        fullWidth: true,
        group,
        rules: mergeMetadataRules(mf.required, override?.rules),
      };
      if (override) {
        const { name: _omit, ...rest } = override;
        Object.assign(fd, rest);
      }
      out.push(fd);
      continue;
    }

    if (kind === "select") {
      const prop = metaField.prop;
      const cfPrefix = prop ? `${prop}.customFields` : `customFields`;
      const opts = isJSON(mf.options ?? "") ? parseJSON(mf.options ?? "[]") : [];
      const override = metaField.metadata?.def?.find(d => d.name === mf.name);
      const fd: FieldDef = {
        prop,
        kind: "select",
        name: `${cfPrefix}.${mf.name}`,
        label: mf.label ?? mf.name,
        options: opts,
        fullWidth: true,
        group,
        rules: mergeMetadataRules(mf.required, override?.rules),
      };
      if (override) {
        const { name: _omit, ...rest } = override;
        Object.assign(fd, rest);
      }
      out.push(fd);
      continue;
    }

    if (kind === "relation") {
      const prop = metaField.prop;
      const relPrefix = prop ? `${prop}.relationFields` : `relationFields`;
      const altPrefix = prop ? `${prop}.customFields` : `customFields`;
      const relation = isJSON(mf.relation ?? "") ? parseJSON(mf.relation ?? "{}") : {};
      const singleChoice = relation.type && relation.type === '1';
      const frmDlgKey = relation.form ?? relation.ref;
      const override = metaField.metadata?.def?.find(d => d.name === mf.name);

      if (singleChoice) {
        const requiredRule = override?.rules?.required;
        const requiredMsg =
          requiredRule !== undefined
            ? (requiredRule ? (typeof requiredRule === "string" ? requiredRule : "This field is required") : null)
            : (mf.required ? "This field is required" : null);
        const staticWhere =
          relation.where != null
            ? (Array.isArray(relation.where) ? relation.where : [relation.where])
            : [];
        const fd: FieldDef = {
          prop,
          kind: "searchsingle",
          name: `${relPrefix}.${mf.name}`,
          altName: `${altPrefix}.${mf.name}`,
          label: mf.label ?? mf.name,
          group,
          placeholder: relation.placeholer ?? "",
          fullWidth: true,
          onSelect: metaField.onSelect,

          getOptionLabel: (d: any) => d?.name,
          getOptionValue: (d: any) => d?.id,

          async searchPage(kw: string, page, limit, ctx) {
            const dynamicWhere = fd.where?.(ctx?.values ?? {}, ctx) ?? [];
            const extendWhere = dynamicWhere.length > 0
              ? [...staticWhere, ...dynamicWhere]
              : (staticWhere.length > 0 ? staticWhere : undefined);
            const searched = await search(relation.target, {
              keyword: kw,
              page: page,
              limit: limit,
              orderBy: "name",
              extendWhere,
            });
            return searched.items;
          },

          pageLimit: 20,

          async hydrateById(id: number | string, _: Record<string, any>) {
            if (!id) return null;
            const found = await rel1(relation.target, id as number);
            return found ?? null;
          },

          async fetchOne(values: Record<string, any>) {
            const refName = `${relPrefix}.${mf.name}`;
            const refId = parseIntSafe(values[refName]);
            if (!refId) return null;
            return await rel1(relation.target, refId);
          },

          // renderItem: (d: any) => (<>{d?.name}</>),
          // disableDelete: (d: any) => d?.locked === true,
          autoLoadAllOnMount: true,
        };
        if (relation.form) {
          fd.onOpenCreate = () => openFormDialog(frmDlgKey);
        }
        if (override) {
          const { name: _omit, rules: _omitRules, ...rest } = override;
          Object.assign(fd, rest);
        }
        if (requiredMsg) {
          const baseValidate = fd.validate;
          const allowUnmatched = fd.allowUnmatched ?? false;
          fd.validate = (input, matched, ctx) => {
            if (allowUnmatched) {
              if (!input || !input.trim()) return requiredMsg;
            } else if (!matched) {
              return requiredMsg;
            }
            return baseValidate ? baseValidate(input, matched, ctx) ?? null : null;
          };
        }
        out.push(fd);
      } else {
        const override = metaField.metadata?.def?.find(d => d.name === mf.name);
        const staticWhere =
          relation.where != null
            ? (Array.isArray(relation.where) ? relation.where : [relation.where])
            : [];
        let fd: FieldDef = {
          prop,
          kind: "searchlist",
          name: `${relPrefix}.${mf.name}`,
          label: mf.label ?? mf.name,
          group,
          placeholder: relation.placeholer ?? "",
          fullWidth: true,
          onSelect: metaField.onSelect,

          getOptionLabel: override?.getOptionLabel ?? ((d: any) => d?.name),
          getOptionValue: (d: any) => d?.id,

          async searchPage(kw: string, page, limit, ctx) {
            const dynamicWhere = fd.where?.(ctx?.values ?? {}, ctx) ?? [];
            const extendWhere = dynamicWhere.length > 0
              ? [...staticWhere, ...dynamicWhere]
              : (staticWhere.length > 0 ? staticWhere : undefined);
            const searched = await search(relation.target, {
              keyword: kw,
              page: page,
              limit: limit,
              orderBy: "name",
              extendWhere,
            });
            return searched.items;
          },

          pageLimit: 20,

          async hydrateByIds(ids: Array<number | string>, values: Record<string, any>) {
            if (!ids || ids.length === 0) return [];
            const table = await relM2m(relation.target, values.id, {
              limit: 10000,
              page: 1,
              orderBy: fd.hydrateOrderField ?? "name",
            });
            const set = new Set(ids.map(String));
            return (table.items ?? []).filter((d: any) => set.has(String(d.id)));
          },

          async fetchList(values: Record<string, any>) {
            const table = await relM2m(relation.target, values.id, {
              limit: 10000,
              page: 1,
              orderBy: fd.hydrateOrderField ?? "name",
            });
            return table.items;
          },

          renderItem: override?.renderItem ?? ((d: any) => (<>{d?.name}</>)),
          disableDelete: (d: any) => d?.locked === true,
          autoLoadAllOnMount: true,
        };
        if (relation.form) {
          fd.onOpenCreate = () => openFormDialog(frmDlgKey);
        }
        if (override) {
          const { name: _omit, renderItem: _omitRenderItem, rules: _omitRules, ...rest } = override;
          Object.assign(fd, rest);
        }
        out.push(fd);
      }

      continue;
    }

    const prop = metaField.prop;
    const cfPrefix = prop ? `${prop}.customFields` : `customFields`;
    const override = metaField.metadata?.def?.find(d => d.name === mf.name);
    let fd: FieldDef = {
      prop,
      kind,
      name: `${cfPrefix}.${mf.name}`,
      label: mf.label ?? mf.name,
      fullWidth: true,
      rules: mergeMetadataRules(mf.required, override?.rules),
      group,
    };
    if (override) {
      const { name: _omit, ...rest } = override;
      Object.assign(fd, rest);
    }
    out.push(fd);
  }

  return {
    fields: out,
    deps,
    collections: out.length > 0 ? [collection] : [],
  };
}

/* ========================================================================
   HELPERS
   ======================================================================== */
// const defaultFetcher = (input: string, init: RequestInit) => fetch(input, init);

function resolveMetadataFieldGroup(
  metaField: FieldDef,
  fieldName: string
): string {
  const groups = metaField.metadata?.groups;
  if (!groups || groups.length === 0) {
    return metaField.group ?? "general";
  }

  let fallbackGroup: string | null = null;

  for (const g of groups) {
    if (Array.isArray(g.fields) && g.fields.length > 0) {
      if (g.fields.includes(`customFields.${fieldName}`) || g.fields.includes(fieldName)) {
        return g.group;
      }
    }

    if (!g.fields || g.fields.length === 0) {
      fallbackGroup = g.group;
    }
  }

  if (fallbackGroup) return fallbackGroup;

  return metaField.group ?? "general";
}

function mergeMetadataRules(
  required: boolean,
  override?: FieldDef["rules"]
): FieldDef["rules"] | undefined {
  const base = required ? { required: true } : undefined;
  if (!override) return base;
  return { ...(base ?? {}), ...override };
}

function flattenInitialRecursive(obj: any, prefix: string, out: any) {
  if (!obj || typeof obj !== "object") return;

  // flatten custom_fields → prefix.customFields.*
  if (obj.custom_fields && typeof obj.custom_fields === "object") {
    for (const [k, v] of Object.entries(obj.custom_fields)) {
      const camel = snakeToCamel(k);
      out[`${prefix}.customFields.${camel}`] = v;
    }
  }

  // flatten customFields → prefix.customFields.*
  if (obj.customFields && typeof obj.customFields === "object") {
    for (const [k, v] of Object.entries(obj.customFields)) {
      out[`${prefix}.customFields.${k}`] = v;
    }
  }

  // flatten relation_fields → prefix.relationFields.*
  if (obj.relation_fields && typeof obj.relation_fields === "object") {
    for (const [k, v] of Object.entries(obj.relation_fields)) {
      const camel = snakeToCamel(k);
      const relKey = `${prefix}.relationFields.${camel}`;
      const rootKey = prefix ? `${prefix}.${camel}` : camel;
      const cfKey = prefix ? `${prefix}.customFields.${camel}` : `customFields.${camel}`;

      out[relKey] = v;
      out[rootKey] = v;
      out[cfKey] = v;
    }
  }

  if (obj.relationFields && typeof obj.relationFields === "object") {
    for (const [k, v] of Object.entries(obj.relationFields)) {
      const relKey = `${prefix}.relationFields.${k}`;
      const rootKey = prefix ? `${prefix}.${k}` : k;
      const cfKey = prefix ? `${prefix}.customFields.${k}` : `customFields.${k}`;

      out[relKey] = v;
      out[rootKey] = v;
      out[cfKey] = v;
    }
  }

  // flatten NORMAL FIELDS
  for (const [k, v] of Object.entries(obj)) {
    if (
      k === "custom_fields" ||
      k === "customFields" ||
      k === "relation_fields" ||
      k === "relationFields"
    ) {
      continue;
    }

    const camel = snakeToCamel(k);
    const key = `${prefix}.${camel}`;

    // 1️⃣ primitive → flatten
    if (typeof v !== "object" || v === null) {
      out[key] = v;
      continue;
    }

    // 2️⃣ array → keep as-is
    if (Array.isArray(v)) {
      out[key] = v;
      continue;
    }

    // 3️⃣ plain object → recurse
    flattenInitialRecursive(v, key, out);
  }
}

// deprecated
export function flattenInitialRecursive2(obj: any, prefix: string, out: any) {
  if (!obj || typeof obj !== "object") return;

  // flatten custom_fields → prefix.customFields.*
  if (obj.custom_fields && typeof obj.custom_fields === "object") {
    for (const [k, v] of Object.entries(obj.custom_fields)) {
      const camel = snakeToCamel(k);
      out[`${prefix}.customFields.${camel}`] = v;
    }
  }

  // flatten customFields → prefix.customFields.*
  if (obj.customFields && typeof obj.customFields === "object") {
    for (const [k, v] of Object.entries(obj.customFields)) {
      out[`${prefix}.customFields.${k}`] = v;
    }
  }

  // flatten relation_fields → prefix.relationFields.*
  if (obj.relation_fields && typeof obj.relation_fields === "object") {
    for (const [k, v] of Object.entries(obj.relation_fields)) {
      const camel = snakeToCamel(k);
      const relKey = `${prefix}.relationFields.${camel}`;
      const rootKey = prefix ? `${prefix}.${camel}` : camel;
      const cfKey = prefix ? `${prefix}.customFields.${camel}` : `customFields.${camel}`;

      out[relKey] = v;   // relationFields.xxx
      out[rootKey] = v;  // xxx
      out[cfKey] = v;    // customFields.xxx
    }
  }

  if (obj.relationFields && typeof obj.relationFields === "object") {
    for (const [k, v] of Object.entries(obj.relationFields)) {
      const relKey = `${prefix}.relationFields.${k}`;
      const rootKey = prefix ? `${prefix}.${k}` : k;
      const cfKey = prefix ? `${prefix}.customFields.${k}` : `customFields.${k}`;

      out[relKey] = v;
      out[rootKey] = v;
      out[cfKey] = v;
    }
  }

  // flatten NORMAL FIELDS: id, code, createdAt, updatedAt, ...
  for (const [k, v] of Object.entries(obj)) {
    // ignore nested groups already handled
    if (k === "custom_fields" || k === "customFields" || k === "relation_fields" || k === "relationFields") continue;

    const camel = snakeToCamel(k);

    // primitive values → flatten to prefix.camel
    if (typeof v !== "object" || v === null) {
      out[`${prefix}.${camel}`] = v;
      continue;
    }

    // nested object → recurse
    flattenInitialRecursive(v, `${prefix}.${camel}`, out);
  }
}

function resolveMode(schema: FormSchema, initialVals: any): FormMode {
  const idField = schema.idField ?? "id";
  if (schema.modeResolver) return schema.modeResolver(initialVals ?? {});
  const id = initialVals?.[idField];
  return id ? "update" : "create";
}

// function pickSubmit(schema: FormSchema, mode: FormMode): SubmitDef {
//   const s = schema.submit as any;
//   if (s?.create && s?.update) return mode === "create" ? s.create : s.update;
//   return schema.submit as SubmitDef;
// }

function renderModeText(
  t?: ModeText,
  ctx?: { mode: FormMode; values: any; result?: any }
): string | undefined {
  if (!t) return undefined;
  if (typeof t === "string") return t;
  if (typeof t === "function") return t(ctx!);
  return t[ctx!.mode];
}

// async function runSubmit(def: SubmitDef, dto: any, meta?: { meta: FieldDef; fields: FieldDef[]; deps: string[] }[]) {
//   if (def.type === "fn") return def.run(dto, meta);

//   const method = def.method ?? "PATCH";
//   const fetcher = def.fetcher ?? defaultFetcher;

//   let payload = def.transform ? def.transform(dto) : dto;

//   const res = await fetcher(def.url, {
//     method,
//     headers: {
//       "Content-Type": "application/json",
//       ...(def.headers ?? {}),
//     },
//     body: JSON.stringify(payload),
//   });

//   if (!res.ok) {
//     let msg = `HTTP ${res.status}`;
//     try {
//       const json = await res.json();
//       msg = json?.message || msg;
//     } catch { }
//     throw new Error(msg);
//   }

//   return res.json().catch(() => null);
// }

function flattenForInitial(obj: any): any {
  const out: any = { ...obj };

  for (const [k, v] of Object.entries(obj ?? {})) {
    if (typeof v === "object" && v !== null) {
      flattenInitialRecursive(v, snakeToCamel(k), out);
    }
  }

  return out;
}

/* ========================================================================
   AUTOFORM FINAL
   ======================================================================== */
type Props = AutoFormProps & {
  name?: string;
  notifier?: typeof toast;
};

export const AutoForm = React.forwardRef<AutoFormRef, Props>(
  ({ name, schema: schemaProp, initial, onSaved, notifier }, ref) => {
    const toasts = notifier ?? toast;

    /* LOAD SCHEMA */
    const schema = React.useMemo(() => {
      if (schemaProp) return schemaProp;
      if (name) return getFormSchema(name);
      return null;
    }, [schemaProp, name]);

    if (!schema) return <div>Schema {name} chưa đăng ký.</div>;

    /* RESOLVE INITIAL */
    const [resolvedInitial, setResolvedInitial] = React.useState(initial ?? {});
    const [resolvingInitial, setResolvingInitial] = React.useState(false);

    const formSessionIdRef = React.useRef<string | null>(null);

    if (formSessionIdRef.current === null) {
      formSessionIdRef.current = crypto.randomUUID();
    }

    React.useEffect(() => {
      let cancelled = false;

      (async () => {
        setResolvingInitial(true);
        try {
          const resolved = schema.initialResolver
            ? await schema.initialResolver(initial)
            : initial;

          const finalInitial =
            initial && resolved && typeof initial === "object" && typeof resolved === "object"
              ? { ...initial, ...resolved }
              : resolved ?? initial ?? {};

          // ==========================================
          // FLATTEN ALL NESTED PROPS (custom_fields + relation_fields)
          // ==========================================
          const flattenOut: any = { ...finalInitial };

          for (const [k, v] of Object.entries(finalInitial)) {
            if (typeof v === "object" && v !== null) {
              flattenInitialRecursive(v, snakeToCamel(k), flattenOut)
            }
          }

          if (!cancelled) {
            setResolvedInitial(flattenOut);
            setAllValues(flattenOut);
          }

        } finally {
          if (!cancelled) setResolvingInitial(false);
        }
      })();

      return () => { cancelled = true; };
    }, [initial, schema]);

    const initialValues = resolvedInitial ?? {};

    React.useEffect(() => {
      if (resolvingInitial) return;
      setAllValues(initialValues);
    }, [resolvingInitial, initialValues]);

    /* METADATA BLOCKS – PERSISTENT */
    const metadataBlocksRef = React.useRef<
      { meta: FieldDef; fields: FieldDef[]; deps: string[]; collections: string[] }[]
    >([]);

    if (metadataBlocksRef.current.length === 0) {
      metadataBlocksRef.current = schema.fields
        .filter((f) => f.kind === "metadata")
        .map((meta) => ({
          meta,
          fields: [],
          deps: [],
          collections: [],
        }));
    }

    const metadataBlocks = metadataBlocksRef.current;

    /* FINAL FIELDS*/
    const [metadataVersion, setMetadataVersion] = React.useState(0);

    const finalFields = React.useMemo(() => {
      const arr: FieldDef[] = [];
      const metadataMap = new Map<FieldDef, FieldDef[]>();
      metadataBlocksRef.current.forEach((b) => {
        metadataMap.set(b.meta, b.fields);
      });

      for (const f of schema.fields) {
        if (f.kind === "metadata") {
          const fields = metadataMap.get(f) ?? [];
          arr.push(...fields);
        } else {
          if (f.prop) {
            arr.push({
              ...f,
              name: `${f.prop}.${f.name}`
            })
          } else {
            arr.push(f);
          }
        }
      }
      return arr;
    }, [metadataVersion, schema.fields]);

    // ========================================
    // GROUP ENGINE
    // ========================================
    const groupsConfig = schema.groups ?? [{ name: "general", col: 1 }];

    // gom field theo group
    const groupMap = React.useMemo(() => {
      const map = new Map<string, FieldDef[]>();

      // init map theo groupsConfig
      for (const g of groupsConfig) map.set(g.name, []);

      // fallback cho field.group không nằm trong config
      const ensureGroup = (name: string) => {
        if (!map.has(name)) map.set(name, []);
      };

      for (const f of finalFields) {
        const gname = f.group ?? "general";
        ensureGroup(gname);
        map.get(gname)!.push(f);
      }

      return map;
    }, [finalFields, groupsConfig]);


    /* NON-METADATA FIELDS */
    const baseFields = React.useMemo(
      () => schema.fields.filter((f) => f.kind !== "metadata"),
      [schema.fields]
    );

    /* MAIN FORM STATE */
    const {
      values,
      setValue,
      setAllValues,
      errors,
      // setErrors,
      setFieldError,
      validateAll,
    } = useAutoForm(baseFields, initialValues, {
      asyncValidate: schema.hooks?.asyncValidate,
    });

    const ctxRef = React.useRef<FormContext>(null);

    // ----------------------------------------------------
    // WRAPPED SETTERS WITH changeSource
    // ----------------------------------------------------
    const setValueUser = (name: string, v: any) => {
      setValue(name, v);

      if (errors[name]) {
        setFieldError(name, null);
      }

      schema.onChange?.(name, v, ctxRef.current!, "user");
      ctxRef.current?.emit("form:change", {
        name,
        value: v,
        values: ctxRef.current?.values,
        source: "user",
      });
    };

    const setValueProg = (name: string, v: any) => {
      setValue(name, v);  // original
      schema.onChange?.(name, v, ctxRef.current!, "programmatic");

      ctxRef.current?.emit("form:change", {
        name,
        value: v,
        values: ctxRef.current?.values,
        source: "programmatic",
      });
    };

    const setAllValuesProg = (obj: Record<string, any>) => {
      setAllValues(obj);  // original setAllValues
      schema.onChange?.("*", obj, ctxRef.current!, "programmatic");

      ctxRef.current?.emit("form:change:all", {
        values: ctxRef.current?.values,
        source: "programmatic",
      });
    };

    // ----------------------------------------------------
    // CTX FOR onChange
    // ----------------------------------------------------
    ctxRef.current = {
      formSessionId: formSessionIdRef.current,
      metadataBlocks,
      values,
      setValue: setValueProg,
      setAllValues: setAllValuesProg,
      setFieldError,
      reset: () => setAllValuesProg(initialValues),
      setInitial: (obj: Record<string, any>) => {
        const flat = flattenForInitial(obj);
        setAllValuesProg(flat);
      },
      clear: () => {
        setAllValuesProg({});
      },
      emit,
      off,
      on,
    };

    /* SHOW-IF HASH */
    const allDepsRef = React.useRef<string[]>([]);
    const lastDepValuesRef = React.useRef<Record<string, any>>({});

    const showIfHash = React.useMemo(() => {
      const o: any = {};
      for (const d of allDepsRef.current) o[d] = values[d];
      return JSON.stringify(o);
    }, [values]);

    const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

    /* INITIAL EXPAND */
    React.useEffect(() => {
      if (resolvingInitial) return;
      let cancelled = false;

      (async () => {
        const runtimeValues = ctxRef.current!.values;
        const results = await Promise.all(
          metadataBlocks.map((b) => expandMetadataBlock(b.meta, runtimeValues, [], ctxRef.current))
        );

        if (cancelled) return;

        results.forEach((res, i) => {
          metadataBlocks[i].fields = res.fields;
          metadataBlocks[i].deps = res.deps;
          metadataBlocks[i].collections = res.collections;
        });
        setMetadataVersion(v => v + 1);

        allDepsRef.current = metadataBlocks.flatMap((b) => b.deps);

        forceUpdate();
      })();

      return () => { cancelled = true; };
    }, [resolvingInitial]);

    // ------------------------------------------------------
    // FORCE INITIAL CHANGED DEPS (very important)
    // ------------------------------------------------------
    const forceInitDoneRef = React.useRef(false);

    React.useEffect(() => {
      if (resolvingInitial) return;
      if (forceInitDoneRef.current) return;

      if (allDepsRef.current.length === 0) return;

      forceInitDoneRef.current = true;

      const initialChanged = [...allDepsRef.current];

      for (const dep of allDepsRef.current) {
        lastDepValuesRef.current[dep] = values[dep];
      }

      (async () => {
        const reloadList = metadataBlocks
          .map((b, i) => ({ b, i }))
          .filter(({ b }) =>
            b.deps.some((d) => initialChanged.includes(d))
          );

        const runtimeValues = ctxRef.current!.values;
        const results = await Promise.all(
          reloadList.map(({ b }) =>
            expandMetadataBlock(b.meta, runtimeValues, initialChanged, ctxRef.current)
          )
        );

        results.forEach((res, idx) => {
          const actual = reloadList[idx].i;
          metadataBlocks[actual].fields = res.fields;
          metadataBlocks[actual].deps = res.deps;
          metadataBlocks[actual].collections = res.collections;
        });

        allDepsRef.current = metadataBlocks.flatMap((b) => b.deps);
        setMetadataVersion((x) => x + 1);
        forceUpdate();
      })();

    }, [metadataVersion, resolvingInitial]);


    /* HARD ISOLATE RELOAD */
    React.useEffect(() => {
      if (resolvingInitial) return;

      const changedDeps: string[] = [];

      // detect which field changed
      for (const dep of allDepsRef.current) {
        const prev = lastDepValuesRef.current[dep];
        const now = values[dep];
        if (prev !== now) changedDeps.push(dep);
      }

      // update snapshot
      for (const dep of allDepsRef.current) {
        lastDepValuesRef.current[dep] = values[dep];
      }

      if (changedDeps.length === 0) return;

      // find blocks impacted by changedDeps
      const reloadList = metadataBlocks
        .map((b, i) => ({ b, i }))
        .filter(({ b }) => b.deps.some((d) => changedDeps.includes(d)));

      if (reloadList.length === 0) return;

      let cancelled = false;

      (async () => {
        const results = await Promise.all(
          reloadList.map(({ b }) =>
            expandMetadataBlock(b.meta, values, changedDeps, ctxRef.current)
          )
        );

        if (cancelled) return;

        results.forEach((res, idx) => {
          const actual = reloadList[idx].i;
          metadataBlocks[actual].fields = res.fields;
          metadataBlocks[actual].deps = res.deps;
          metadataBlocks[actual].collections = res.collections;
        });
        setMetadataVersion(v => v + 1);

        allDepsRef.current = metadataBlocks.flatMap((b) => b.deps);

        forceUpdate();
      })();

      return () => {
        cancelled = true;
      };
    }, [showIfHash]);

    // ==========================================
    // EQUATION ENGINE
    // ==========================================
    React.useEffect(() => {
      const eqFields = finalFields.filter(
        (f) => f.kind === "currency-equation" && f.currencyEquation
      );
      if (eqFields.length === 0) return;

      const runtime = ctxRef.current?.values;
      if (!runtime) return;

      for (const f of eqFields) {
        const expr = f.currencyEquation!;
        try {
          const vars = extractVars(expr);

          const argValues = vars.map((name) => {
            let path = `customFields.${name}`;
            if (f.prop) {
              path = `${f.prop}.${path}`;
            }

            if (path in runtime) return runtime[path];
            if (name in runtime) return runtime[name];

            return undefined;
          });

          const fn = new Function(...vars, `return (${expr});`);
          let result = fn(...argValues);

          if (!Number.isFinite(result)) result = 0;

          if (runtime[f.name] !== result) {
            setValueProg(f.name, result);
          }

        } catch (e) {
          console.error("EQ ERROR:", e);
        }
      }
    }, [
      finalFields,
      // values
    ]);


    /* SUBMIT */
    const [, setSaving] = React.useState(false);

    function resolveSearchSinglePair(field: FieldDef, values: Record<string, any>) {
      const primaryIdKey = field.name;
      const fallbackIdKey = field.altName;
      const hasPrimary = values[primaryIdKey] !== undefined && values[primaryIdKey] !== null;
      const idKey = hasPrimary ? primaryIdKey : (fallbackIdKey ?? primaryIdKey);

      if (!idKey.endsWith("Id")) {
        return null;
      }

      const nameKey = idKey.replace(/Id$/, "Name");

      const id = values[idKey] ?? null;
      const name = typeof values[nameKey] === "string" ? values[nameKey] : "";

      return {
        idKey,
        nameKey,
        id,
        name,
        matched: id != null && name.trim() ? { id, name } : null,
      };
    }

    async function validateMetadataFields(): Promise<boolean> {
      let valid = true;

      for (const block of metadataBlocks) {
        for (const f of block.fields) {
          let msg: string | null = null;

          if (f.kind === "searchsingle" && f.validate) {
            const pair = resolveSearchSinglePair(f, values);

            const msg = f.validate(
              pair?.name ?? "",
              pair?.matched ?? null,
              ctxRef.current
            );

            if (msg) {
              setFieldError(f.name, msg);
              valid = false;
            } else {
              setFieldError(f.name, null);
            }
            continue;
          }

          const value = values[f.name];
          // ===== sync rules =====
          msg = validateOneSync(value, f.rules, f.label, f.kind);
          if (msg) {
            setFieldError(f.name, msg);
            valid = false;
            continue;
          }

          // ===== async rules =====
          if (f.rules?.async) {
            try {
              const asyncMsg = await f.rules.async(value, values);
              if (asyncMsg) {
                setFieldError(f.name, asyncMsg);
                valid = false;
              }
            } catch (e: any) {
              setFieldError(
                f.name,
                e?.message ?? "Validation failed"
              );
              valid = false;
            }
          }

          setFieldError(f.name, null);
        }
      }

      return valid;
    }

    async function handleSubmitButton(btn: SubmitButton, mode: FormMode) {
      const okBase = await validateAll();
      if (!okBase) return false;

      const okMeta = await validateMetadataFields();
      if (!okMeta) return false;

      setSaving(true);

      const latestValues = ctxRef.current!.values;
      const packaged = packageData(metadataBlocks, latestValues);
      const dto = schema!.hooks?.mapToDto ? schema!.hooks.mapToDto(packaged) : packaged;

      const ctx = {
        values: dto,
        mode,
        meta: metadataBlocks,
      };

      try {
        const result = await btn.submit(ctx);
        if (schema!.hooks?.mapFromDto) {
          const uiVals = schema!.hooks.mapFromDto(result);
          if (uiVals && typeof uiVals === "object") setAllValues(uiVals);
        }

        if (btn.toasts?.saved !== "") {
          toasts.success(
            renderModeText(
              btn.toasts?.saved ?? schema!.toasts?.saved,
              { mode, values, result }
            ) ?? "Đã lưu"
          );
        }

        if (btn.afterSaved) await btn.afterSaved(result);
        if (schema!.afterSaved) await schema!.afterSaved(result, ctx);
        if (onSaved) await onSaved(result);

        return true;
      } catch (err: any) {
        const friendlyMessage = getUserFriendlyErrorMessage(err);
        const failedToast = renderModeText(
          btn.toasts?.failed ?? schema!.toasts?.failed,
          { mode, values }
        );

        toasts.error(
          friendlyMessage ?? failedToast ?? "Lỗi"
        );
        return false;
      } finally {
        setSaving(false);
      }
    }


    /* REF OUTPUT */
    React.useImperativeHandle(ref, () => ({
      submit: () => {
        const mode = resolveMode(schema, initialValues);
        const buttons = resolveSubmitButtons(schema, mode);
        const primary = buttons[0];
        return handleSubmitButton(primary, mode);
      },
      runSubmitButton: handleSubmitButton,
      getSubmitButtons: () => {
        const mode = resolveMode(schema, initialValues);
        return resolveSubmitButtons(schema, mode);
      },
      schema,
      values,
      reset: () => setAllValuesProg(initialValues),
      setValue: setValueProg,
      setAllValues: setAllValuesProg,
    }));

    /* RENDER SUBMIT BUTTONS */
    // const mode = resolveMode(schema, stableInitial);
    // const submitButtons = resolveSubmitButtons(schema, mode);

    /* RENDER */
    return (
      <Stack spacing={2}>
        {resolvingInitial ? (
          <div>Đang tải…</div>
        ) : (
          <AutoFormFieldsGrouped
            groupMap={groupMap}
            groupsConfig={groupsConfig}
            values={values}
            setValue={setValueUser}
            errors={errors}
            ctx={ctxRef.current}
          />
        )}

        {/* ======= SUBMIT BUTTONS ======= */}
        {/* <Stack direction="row" spacing={1} justifyContent="flex-end">
          {submitButtons.map((btn) => {
            if (btn.visible && !btn.visible({ values, mode })) return null;
            return (
              <SafeButton
                key={btn.name}
                variant="contained"
                color={btn.color ?? "primary"}
                onClick={() => handleSubmitButton(btn, mode)}
                startIcon={btn.icon}
              >
                {btn.label ?? btn.name}
              </SafeButton>
            );
          })}
        </Stack> */}
      </Stack>
    );
  }
);
