import { camelToSnake, snakeToCamel } from "@shared/utils/string.utils";

export type ConvertFn<S = any, T = any> = (value: any, source: S) => T;

export type FieldRule =
  | { kind: "map"; from: string; to: string }
  | { kind: "ignore"; prop: string }
  | { kind: "convert"; from: string; to: string; convert: ConvertFn }
  | { kind: "const"; to: string; value: any };

export type NamingStrategy = "snake_to_camel" | "camel_to_snake" | "none";

export interface Profile<TModel = any, TDto = any> {
  name: string;

  // naming strategies
  dtoToModelNaming?: NamingStrategy; // used when direction === "dto_to_model"
  modelToDtoNaming?: NamingStrategy; // used when direction === "model_to_dto"

  // field rules
  rules?: FieldRule[];

  // typed default factories (shape/template of destination)
  defaultModel?: () => Partial<TModel>; // for dto_to_model
  defaultDto?: () => Partial<TDto>;     // for model_to_dto

  // prune unknown keys based on template
  pruneToModel?: boolean; // default true
  pruneToDto?: boolean;   // default false

  // Container options — when root is { items: T[], ... }
  itemsKey?: string;      // default "items"
  pruneRoot?: boolean;    // default false (keep other root fields like 'total')
}

export function applyNaming(key: string, strategy: NamingStrategy) {
  switch (strategy) {
    case "snake_to_camel": return snakeToCamel(key);
    case "camel_to_snake": return camelToSnake(key);
    default: return key;
  }
}

type Profiles = Record<string, Profile<any, any>>;
const __profiles__: Profiles = {};

export const mapper = {
  register<TModel = any, TDto = any>(profile: Profile<TModel, TDto>) {
    if (!profile?.name) throw new Error("Profile must have a name");
    __profiles__[profile.name] = profile as Profile<any, any>;
    return mapper;
  },

  map<S, TDest>(
    profileName: string,
    src: S,
    direction: "dto_to_model" | "model_to_dto" = "dto_to_model"
  ): TDest {
    const profile = __profiles__[profileName];
    if (!profile) throw new Error(`Profile '${profileName}' not found`);

    const naming: NamingStrategy =
      direction === "dto_to_model"
        ? profile.dtoToModelNaming ?? "none"
        : profile.modelToDtoNaming ?? "none";

    const rules = profile.rules ?? [];
    const itemsKey = profile.itemsKey ?? "items";

    const mapOne = (obj: any): any => {
      if (obj == null) return obj;
      if (Array.isArray(obj)) return obj.map(mapOne);
      if (typeof obj !== "object") return obj;

      const out: any = {};

      // 1) const rules
      for (const r of rules) {
        if (r.kind === "const") out[r.to] = (r as any).value;
      }

      // 2) explicit map / convert
      for (const r of rules) {
        if (r.kind === "map") {
          const v = (obj as any)[r.from];
          out[r.to] = mapOne(v);
        } else if (r.kind === "convert") {
          const v = (obj as any)[r.from];
          out[r.to] = r.convert(mapOne(v), obj);
        }
      }

      // 3) implicit mapping via naming strategy (respect ignore + explicit)
      const ignored = new Set(
        rules.filter((r): r is Extract<FieldRule, { kind: "ignore" }> => r.kind === "ignore").map((r) => r.prop)
      );

      for (const k of Object.keys(obj)) {
        if (ignored.has(k)) continue;
        const handledExplicit = rules.some(
          (r) => (r.kind === "map" || r.kind === "convert") && r.from === k
        );
        if (handledExplicit) continue;

        const destKey = applyNaming(k, naming);
        out[destKey] = mapOne((obj as any)[k]);
      }

      return out;
    };

    // 1) raw mapping
    const mapped = mapOne(src);

    // 2) choose template per direction
    const template =
      direction === "dto_to_model" ? profile.defaultModel?.() : profile.defaultDto?.();

    const shouldPruneItems =
      direction === "dto_to_model"
        ? profile.pruneToModel ?? true
        : profile.pruneToDto ?? false;

    const pruneRoot = profile.pruneRoot ?? false;

    // 3) apply defaults + prune with container awareness
    const result = applyTemplateAndPruneContainerAware(
      mapped,
      template,
      shouldPruneItems,
      pruneRoot,
      itemsKey
    );

    return result as TDest;
  },
};

////////////////////
// Helpers
////////////////////
function isPlainObject(v: any): v is Record<string, any> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function cloneDeep<T>(v: T): T {
  if (v == null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(cloneDeep) as any;
  const o: any = {};
  for (const k of Object.keys(v as any)) o[k] = cloneDeep((v as any)[k]);
  return o;
}

/** Fill missing keys from template into target (deep), without overwriting existing values. */
function fillFromTemplate<T extends Record<string, any>>(target: T, template: Record<string, any>): T {
  if (!isPlainObject(target)) return cloneDeep(template) as any;
  for (const key of Object.keys(template)) {
    const dv = (template as any)[key];
    const tv = (target as any)[key];

    if (tv === undefined) {
      (target as any)[key] = cloneDeep(dv);
    } else if (isPlainObject(tv) && isPlainObject(dv)) {
      (target as any)[key] = fillFromTemplate(tv, dv);
    }
  }
  return target;
}

/** Remove keys from target that do not exist in template (deep for plain objects). */
function pruneAgainstTemplate<T extends Record<string, any>>(target: T, template: Record<string, any>): T {
  if (!isPlainObject(target)) return target;
  for (const key of Object.keys(target)) {
    if (!(key in template)) {
      delete (target as any)[key];
      continue;
    }
    const tv = (target as any)[key];
    const dv = (template as any)[key];
    if (isPlainObject(tv) && isPlainObject(dv)) {
      pruneAgainstTemplate(tv, dv);
    }
  }
  return target;
}

function applyTemplateAndPruneContainerAware<T>(
  value: T,
  template: any,
  shouldPruneItems: boolean,
  pruneRoot: boolean,
  itemsKey: string
): T {
  if (template == null) return value;

  // 1) Array root
  if (Array.isArray(value)) {
    const itemTemplate =
      Array.isArray(template) ? (template.length > 0 ? template[0] : undefined) : template;

    if (itemTemplate == null) return value as T;

    const filled = (value as any[]).map((item) => {
      if (item == null) return cloneDeep(itemTemplate);
      if (isPlainObject(item)) {
        const t = fillFromTemplate(item, itemTemplate);
        return shouldPruneItems ? pruneAgainstTemplate(t, itemTemplate) : t;
      }
      return item;
    });

    return filled as unknown as T;
  }

  // 2) Object root
  if (isPlainObject(value)) {
    const root: any = value;

    // 2a) Container mode: root has itemsKey array and template is item template
    if (Array.isArray(root[itemsKey]) && !(itemsKey in (template || {}))) {
      const itemTemplate = template;

      const processedItems = (root[itemsKey] as any[]).map((item) => {
        if (item == null) return cloneDeep(itemTemplate);
        if (isPlainObject(item)) {
          const t = fillFromTemplate(item, itemTemplate);
          return shouldPruneItems ? pruneAgainstTemplate(t, itemTemplate) : t;
        }
        return item;
      });

      const out = { ...root, [itemsKey]: processedItems };

      // If root template exists (with itemsKey) and pruneRoot requested, we could prune root.
      if (pruneRoot && isPlainObject(template) && itemsKey in template) {
        return pruneAgainstTemplate(out, template) as unknown as T;
      }
      return out as T;
    }

    // 2b) Object root with ITEM template (no itemsKey in template) → treat as item
    if (!(itemsKey in (template || {}))) {
      const filled = fillFromTemplate(root, template);
      return (shouldPruneItems ? pruneAgainstTemplate(filled, template) : filled) as unknown as T;
    }

    // 2c) Root template (has itemsKey) → apply at root, prune via pruneRoot
    const filled = fillFromTemplate(root, template);
    return (pruneRoot ? pruneAgainstTemplate(filled, template) : filled) as unknown as T;
  }

  // 3) Primitive — ignore template
  return value;
}

/////////////////////////////
// Convenience rule builders
/////////////////////////////
export const map = (from: string, to: string): FieldRule => ({ kind: "map", from, to });
export const ignore = (prop: string): FieldRule => ({ kind: "ignore", prop });
export const convert = (from: string, to: string, fn: ConvertFn): FieldRule => ({ kind: "convert", from, to, convert: fn });
export const konst = (to: string, value: any): FieldRule => ({ kind: "const", to, value });

/* =========================
 * Example
 * =========================
type RoleModel = { id: number; roleName: string; displayName: string; brief: string };

mapper.register<RoleModel>({
  name: "role",
  dtoToModelNaming: "snake_to_camel",
  defaultModel: () => ({ id: 0, roleName: "", displayName: "", brief: "" }),
  pruneToModel: true,
  // itemsKey: "items",
});

const a1 = {"id":1,"role_name":"admin","edges":{}};
const o1 = mapper.map<typeof a1, RoleModel>("role", a1, "dto_to_model");
// => {"id":1,"roleName":"admin","displayName":"","brief":""}

const a2 = {"items":[{"id":1,"role_name":"admin","edges":{}}],"total":1};
const o2 = mapper.map<typeof a2, { items: RoleModel[]; total: number }>("role", a2, "dto_to_model");
// => {"items":[{"id":1,"roleName":"admin","displayName":"","brief":""}],"total":1}
*/
