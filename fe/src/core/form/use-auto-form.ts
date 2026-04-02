import * as React from "react";
import type { FieldDef, FieldRules, AutoFormOptions, PasswordRules } from "@core/form/types";
import { snakeToCamel } from "@shared/utils/string.utils";
import dayjs from "dayjs";

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function flattenNested(obj: any, prefix: string, out: any) {
  if (!obj || typeof obj !== "object") return;

  for (const [k, v] of Object.entries(obj)) {
    const camel = snakeToCamel(k);

    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      flattenNested(v, `${prefix}.${camel}`, out);
    } else {
      out[`${prefix}.${camel}`] = v;
    }
  }
}


function normalizeCustomInitial(raw?: Record<string, any>): Record<string, any> {
  if (!raw || typeof raw !== "object") return raw ?? {};

  const out: Record<string, any> = { ...raw };

  const cfSnake = raw["custom_fields"];
  if (cfSnake && typeof cfSnake === "object") {
    for (const [snakeName, value] of Object.entries(cfSnake as Record<string, any>)) {
      const camelName = snakeToCamel(snakeName);
      const flatKey = `customFields.${camelName}`;
      if (!(flatKey in out)) {
        out[flatKey] = value;
      }
    }
  }

  const cfCamel = raw["customFields"];
  if (cfCamel && typeof cfCamel === "object") {
    for (const [camelName, value] of Object.entries(cfCamel as Record<string, any>)) {
      const flatKey = `customFields.${camelName}`;
      if (!(flatKey in out)) {
        out[flatKey] = value;
      }
    }
  }

  for (const [k, v] of Object.entries(raw)) {
    const camelProp = snakeToCamel(k);
    // flatten nested custom_fields
    if (v && typeof v === "object" && v.custom_fields) {
      flattenNested({ customFields: v.custom_fields }, camelProp, out);
    }
    // flatten nested relation_fields
    if (v && typeof v === "object" && v.relation_fields) {
      flattenNested({ relationFields: v.relation_fields }, camelProp, out);
    }
  }

  return out;
}

function getReqMsg(r?: boolean | string) {
  if (!r) return null;
  return typeof r === "string" ? r : "This field is required";
}

type Errors = Record<string, string | null>;

function normalizeErrors(obj: Record<string, string | null | undefined>): Errors {
  const out: Errors = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v ?? null;
  return out;
}

function checkPasswordRules(pw: string, pr?: PasswordRules, allValues?: Record<string, any>): string | null {
  const r: Required<Omit<PasswordRules, "maxLength" | "custom" | "disallowReuseCurrent">> & Pick<PasswordRules, "maxLength" | "custom" | "disallowReuseCurrent"> = {
    minLength: 8,
    requireUpper: true,
    requireLower: true,
    requireDigit: true,
    requireSymbol: false,
    disallowSpaces: true,
    maxLength: pr?.maxLength,
    custom: pr?.custom,
    disallowReuseCurrent: pr?.disallowReuseCurrent,
  };

  if (!pw) return "Vui lòng nhập mật khẩu";

  if (r.disallowSpaces && /\s/.test(pw)) return "Mật khẩu không được chứa khoảng trắng";
  if (pw.length < (pr?.minLength ?? r.minLength)) return `Mật khẩu phải ≥ ${pr?.minLength ?? r.minLength} ký tự`;
  if (pr?.maxLength && pw.length > pr.maxLength) return `Mật khẩu phải ≤ ${pr.maxLength} ký tự`;
  if ((pr?.requireUpper ?? r.requireUpper) && !/[A-Z]/.test(pw)) return "Mật khẩu phải có ít nhất 1 chữ in hoa";
  if ((pr?.requireLower ?? r.requireLower) && !/[a-z]/.test(pw)) return "Mật khẩu phải có ít nhất 1 chữ thường";
  if ((pr?.requireDigit ?? r.requireDigit) && !/[0-9]/.test(pw)) return "Mật khẩu phải có ít nhất 1 chữ số";
  if ((pr?.requireSymbol ?? r.requireSymbol) && !/[^\w\s]/.test(pw)) return "Mật khẩu phải có ít nhất 1 ký tự đặc biệt";

  if (pr?.custom) {
    const msg = pr.custom(pw, allValues ?? {});
    if (msg) return msg;
  }
  return null;
}

function validateNewPasswordObject(value: any, def: FieldDef, allValues: Record<string, any>): string | null {
  const pw = value?.password ?? "";
  const cf = value?.confirm ?? "";

  const reqMsg = def.rules?.required ? getReqMsg(def.rules.required) : null;
  if (reqMsg && (!pw || !cf)) return reqMsg!;

  if (pw) {
    const msg = checkPasswordRules(pw, def.passwordRules, allValues);
    if (msg) return msg;
  }
  if (pw !== cf) return "Xác nhận mật khẩu không khớp";
  return null;
}

function validateChangePasswordObject(value: any, def: FieldDef, allValues: Record<string, any>): string | null {
  const cur = value?.current ?? "";
  const pw = value?.password ?? "";
  const cf = value?.confirm ?? "";

  const reqMsg = def.rules?.required ? getReqMsg(def.rules.required) : null;
  if (reqMsg && (!cur || !pw || !cf)) return reqMsg!;

  if (pw) {
    const msg = checkPasswordRules(pw, def.passwordRules, allValues);
    if (msg) return msg;
  }
  if ((def.passwordRules?.disallowReuseCurrent ?? true) && !!cur && pw === cur)
    return "Mật khẩu mới phải khác mật khẩu hiện tại";
  if (pw !== cf) return "Xác nhận mật khẩu không khớp";
  return null;
}

export function validateOneSync(value: any, rules?: FieldRules, label?: string, kind?: string): string | null {
  if (!rules) return null;

  const reqMsg = getReqMsg(rules.required);
  if (reqMsg) {
    if (typeof value === "boolean") {
      if (!value) return reqMsg;
    } else if (Array.isArray(value)) {
      if (value.length === 0) return reqMsg;
    } else if (value === "" || value === null || value === undefined) {
      return reqMsg;
    }
  }

  if (typeof value === "string" && String(value).trim() !== '') {
    if (rules.minLength != null && value.length < rules.minLength)
      return `${label ?? "This field"} must be at least ${rules.minLength} characters`;
    if (rules.maxLength != null && value.length > rules.maxLength)
      return `${label ?? "This field"} must be at most ${rules.maxLength} characters`;
  }

  if (kind === "email" && value && !emailRegex.test(value)) {
    return "Định dạng email không đúng";
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (rules.min != null && value < rules.min) return `${label ?? "Value"} must be ≥ ${rules.min}`;
    if (rules.max != null && value > rules.max) return `${label ?? "Value"} must be ≤ ${rules.max}`;
  }

  if (rules.pattern) {
    const { regex, message } =
      rules.pattern instanceof RegExp ? { regex: rules.pattern, message: undefined } : rules.pattern;
    if (typeof value === "string" && !regex.test(value)) {
      return message ?? `${label ?? "Value"} has an invalid format`;
    }
  }

  if (rules.minDateTime && value) {
    if (new Date(value).getTime() < new Date(rules.minDateTime).getTime())
      return `${label ?? "Date"} must be after ${new Date(rules.minDateTime).toLocaleString()}`;
  }
  if (rules.maxDateTime && value) {
    if (new Date(value).getTime() > new Date(rules.maxDateTime).getTime())
      return `${label ?? "Date"} must be before ${new Date(rules.maxDateTime).toLocaleString()}`;
  }

  if (rules.custom) {
    const msg = rules.custom(value);
    if (msg) return msg;
  }
  return null;
}

function toInputString(value: any): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map((v) => (v == null ? "" : String(v))).join(",");
  if (typeof value === "string") return value;
  return String(value);
}

function validateSearchSingle(value: any, def: FieldDef): string | null {
  const msg = validateOneSync(value, def.rules, def.label, def.kind);
  if (msg) return msg;
  if (!def.validate) return null;
  return def.validate(toInputString(value), null, null) ?? null;
}

function validateSearchList(value: any, def: FieldDef): string | null {
  const msg = validateOneSync(value, def.rules, def.label, def.kind);
  if (msg) return msg;
  if (!def.validate) return null;
  return def.validate(toInputString(value), null, null) ?? null;
}

function debounce<F extends (...args: any[]) => void>(fn: F, ms: number) {
  let t: any;
  return (...args: Parameters<F>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// --- Normalize initial values for schema kinds ---
// TODO: expose schema.normalizeInitial for kind `custom`
function normalizeInitialBySchema(schema: FieldDef[], raw?: Record<string, any>) {
  const source = normalizeCustomInitial(raw);

  const obj: Record<string, any> = {};
  for (const f of schema) {
    const defaultFallback =
      f.kind === "currency" ? 0 :
        f.kind === "number" ? 0 :
          f.kind === "checkbox" || f.kind === "switch" ? false :
            f.kind === "multiselect" ? [] : "";

    let v =
      source && f.name in (source ?? {})
        ? source![f.name]
        : (f as any).defaultValue ?? defaultFallback;

    if (f.kind === "custom" && typeof (f as any).normalizeInitial === "function") {
      const custom = (f as any).normalizeInitial(v, source ?? {});
      if (custom !== undefined) v = custom;
    }

    switch (f.kind) {
      case "fileupload":
      case "imageupload": {
        const isMulti = (f as any).multipleFiles ?? true;
        if (isMulti) {
          if (v == null) v = [];
          else if (typeof v === "string") v = [v];
          else if (!Array.isArray(v)) v = [];
        } else {
          if (Array.isArray(v)) {
            const firstStr = v.find((x: any) => typeof x === "string");
            const firstFile = v.find((x: any) => x instanceof File);
            v = firstStr ?? firstFile ?? "";
          } else if (v == null) {
            v = "";
          }
        }
        break;
      }
      case "select": {
        if (f.multiple) v = Array.isArray(v) ? v : [];
        else if (v == null) v = "";
        break;
      }
      case "multiselect": {
        v = Array.isArray(v) ? v : [];
        break;
      }
      case "autocomplete": {
        v = v ?? (f.freeSolo ? "" : "");
        break;
      }
      case "searchlist": {
        v = Array.isArray(v) ? v : [];
        break;
      }
      case "searchsingle": {
        if (v === undefined || v === null || v === "") v = null;
        break;
      }
      case "date": {
        if (v == null || v === "") v = "";
        else {
          const d = new Date(v);
          v = isNaN(+d) ? "" : dayjs(d).toISOString();
        }
        break;
      }
      case "datetime": {
        if (v == null || v === "") v = "";
        else {
          const d = new Date(v);
          v = isNaN(+d) ? "" : d.toISOString();
        }
        break;
      }
      case "currency":
      case "number": {
        if (v == null || v === "") v = 0;
        else {
          const n = Number(v);
          v = Number.isFinite(n) ? n : 0;
        }
        break;
      }
      case "checkbox":
      case "switch": {
        v = !!v;
        break;
      }
      case "color": {
        v = v ?? "#000000";
        break;
      }
      case "new-password": {
        const v0 = v ?? {};
        v = {
          password: typeof v0.password === "string" ? v0.password : "",
          confirm: typeof v0.confirm === "string" ? v0.confirm : "",
        };
        break;
      }
      case "change-password": {
        const v0 = v ?? {};
        v = {
          current: typeof v0.current === "string" ? v0.current : "",
          password: typeof v0.password === "string" ? v0.password : "",
          confirm: typeof v0.confirm === "string" ? v0.confirm : "",
        };
        break;
      }
      default:
        if (v == null) v = "";
    }

    obj[f.name] = v;
  }
  return obj;
}

/**
 * AUTO-EXTRAS: Tự động giữ các field không có trong schema (vd: id) vào `values`
 * - Không validate các field này
 * - Tự hydrate khi `initial` đổi
 * 
 * Support: derive (fullname -> slug, ...):
 * - FieldDef.derive = { field, map, mode?: "always" | "whenEmpty" | "untilManual" }
 * - setValue(name, v, { user: true }) để đánh dấu “đã chỉnh tay” (chặn untilManual)
 */
export function useAutoForm(
  schema: FieldDef[],
  initial?: Record<string, any>,
  options?: AutoFormOptions & { hydrateOnInitialChange?: boolean }
) {
  const asyncDebounceMs = options?.asyncDebounceMs ?? 300;
  const hydrateOnInitialChange = options?.hydrateOnInitialChange ?? true;

  const schemaNames = React.useMemo(() => new Set(schema.map(s => s.name)), [schema]);

  // index derive rules: target -> derive config
  const deriveRules = React.useMemo(() => {
    const map = new Map<string, NonNullable<FieldDef["derive"]>>();
    for (const f of schema) {
      if (f.derive) map.set(f.name, f.derive);
    }
    return map;
  }, [schema]);

  // split initial → schemaValues + extras
  const computeInit = React.useCallback(() => {
    const base = normalizeInitialBySchema(schema, initial);
    const extras: Record<string, any> = {};
    if (initial) {
      for (const [k, v] of Object.entries(initial)) {
        if (!schemaNames.has(k)) extras[k] = v; // id, createdAt, ...
      }
    }
    return { base, extras };
  }, [schema, schemaNames, initial]);

  const { base: initBase, extras: initExtras } = React.useMemo(() => computeInit(), [computeInit]);

  const [formValues, setFormValues] = React.useState<Record<string, any>>(initBase);
  const extrasRef = React.useRef<Record<string, any>>(initExtras);
  const [extrasTick, setExtrasTick] = React.useState(0);

  const [errors, setErrors] = React.useState<Record<string, string | null>>({});
  const [validating, setValidating] = React.useState<Record<string, boolean>>({});

  const hardErrorsRef = React.useRef<Record<string, string | null>>({});
  const manualEditedRef = React.useRef<Set<string>>(new Set());

  // hydrate
  React.useEffect(() => {
    if (!hydrateOnInitialChange) return;
    const { base, extras } = computeInit();
    setFormValues(base);
    extrasRef.current = extras;
    setExtrasTick((t) => t + 1);
    setErrors({});
    setValidating({});
    manualEditedRef.current.clear();
  }, [computeInit, hydrateOnInitialChange]);

  // setters
  const setValue = React.useCallback((name: string, v: any, meta?: { user?: boolean }) => {
    if (schemaNames.has(name)) {
      setFormValues((s) => ({ ...s, [name]: v }));
      if (meta?.user) manualEditedRef.current.add(name);
    } else {
      extrasRef.current = { ...extrasRef.current, [name]: v };
      setExtrasTick((t) => t + 1);
    }
  }, [schemaNames]);

  const setAllValues = React.useCallback((next: Record<string, any>) => {
    const normalized = normalizeCustomInitial(next);

    const base: Record<string, any> = {};
    const extras: Record<string, any> = {};
    for (const [k, v] of Object.entries(normalized)) {
      if (schemaNames.has(k)) base[k] = v;
      else extras[k] = v;
    }
    setFormValues(base);
    extrasRef.current = extras;
    setExtrasTick((t) => t + 1);
  }, [schemaNames]);

  const setFieldError = React.useCallback((name: string, msg: string | null) => {
    if (msg) {
      hardErrorsRef.current = {
        ...hardErrorsRef.current,
        [name]: msg,
      };
    } else {
      if (name in hardErrorsRef.current) {
        const copy = { ...hardErrorsRef.current };
        delete copy[name];
        hardErrorsRef.current = copy;
      }
    }
    setErrors((e) => ({ ...e, [name]: msg }));
  }, []);


  const values = React.useMemo(
    () => ({ ...extrasRef.current, ...formValues }),
    [formValues, extrasTick]
  );

  // ==========================================
  // DERIVE ENGINE
  // ==========================================
  React.useEffect(() => {
    if (deriveRules.size === 0) return;

    setFormValues((prev) => {
      let next = prev;

      for (const [target, derive] of deriveRules.entries()) {
        const source = derive.field;
        if (!source || source === target) continue;

        const mode = derive.mode ?? "untilManual";

        const srcVal = prev[source];
        const curVal = prev[target];

        let shouldWrite = false;
        if (mode === "always") {
          shouldWrite = true;
        } else if (mode === "whenEmpty") {
          shouldWrite = curVal == null || curVal === "";
        } else {
          shouldWrite = !manualEditedRef.current.has(target);
        }

        if (!shouldWrite) continue;

        const mapped = derive.map(srcVal, { ...extrasRef.current, ...prev });
        if (mapped !== curVal) {
          if (next === prev) next = { ...prev };
          next[target] = mapped;
        }
      }

      return next;
    });
  }, [deriveRules, values]);

  // validations
  const validate = React.useCallback(() => {
    const err: Record<string, string | null> = {};

    for (const f of schema) {
      let msg: string | null = null;

      if (f.kind === "new-password") {
        msg = validateNewPasswordObject(formValues[f.name], f, values);
      } else if (f.kind === "change-password") {
        msg = validateChangePasswordObject(formValues[f.name], f, values);
      } else if (f.kind === "searchsingle") {
        msg = validateSearchSingle(formValues[f.name], f);
      } else if (f.kind === "searchlist") {
        msg = validateSearchList(formValues[f.name], f);
      } else {
        msg = validateOneSync(formValues[f.name], f.rules, f.label, f.kind);
      }

      err[f.name] = msg ?? null;
    }

    const merged: Record<string, string | null> = {
      ...err,
      ...hardErrorsRef.current,
    };

    setErrors(merged);
    return Object.values(merged).every((x) => !x);
  }, [schema, formValues, values]);


  const validateFieldAsync = React.useCallback(async (name: string) => {
    const def = schema.find((x) => x.name === name);
    if (!def) return true;

    let syncMsg: string | null = null;
    if (def.kind === "new-password") {
      syncMsg = validateNewPasswordObject(formValues[name], def, values);
    } else if (def.kind === "change-password") {
      syncMsg = validateChangePasswordObject(formValues[name], def, values);
    } else {
      syncMsg = validateOneSync(formValues[name], def.rules, def.label, def.kind);
    }

    if (syncMsg) {
      setFieldError(name, syncMsg);
      return false;
    }
    if (!def.rules?.async) {
      setFieldError(name, null);
      return true;
    }

    try {
      setValidating((v) => ({ ...v, [name]: true }));
      const msg = await def.rules.async(formValues[name], values);
      setFieldError(name, msg ?? null);
      return !msg;
    } catch (e: any) {
      setFieldError(name, e?.message ?? "Validation failed");
      return false;
    } finally {
      setValidating((v) => ({ ...v, [name]: false }));
    }
  }, [schema, formValues, values, setFieldError]);

  const validateFieldAsyncDebounced = React.useMemo(() => {
    return debounce((name: string) => {
      validateFieldAsync(name);
    }, asyncDebounceMs);
  }, [validateFieldAsync, asyncDebounceMs]);

  const validateAsyncGlobal = React.useCallback(async () => {
    if (!options?.asyncValidate) return true;
    try {
      const res = await options.asyncValidate(values);
      if (res && Object.keys(res).length > 0) {
        const normalized = normalizeErrors(res);
        setErrors((e) => ({ ...e, ...normalized }));
        return Object.values(normalized).every((x) => x == null);
      }
      return true;
    } catch (e: any) {
      setErrors((er) => ({ ...er, _form: e?.message ?? "Server validation failed" }));
      return false;
    }
  }, [options, values]);

  const validateAll = React.useCallback(async () => {
    if (!validate()) return false;

    const asyncNames = schema.filter((f) => f.rules?.async).map((f) => f.name);
    const results = await Promise.all(asyncNames.map((n) => validateFieldAsync(n)));
    if (!results.every(Boolean)) return false;

    const okGlobal = await validateAsyncGlobal();
    return okGlobal;
  }, [schema, validate, validateFieldAsync, validateAsyncGlobal]);

  return {
    values,
    setValue,
    setAllValues,
    errors,
    setErrors,
    setFieldError,
    validating,
    validate,
    validateFieldAsync,
    validateFieldAsyncDebounced,
    validateAll,
    reset: React.useCallback(() => {
      setFormValues(initBase);
      extrasRef.current = initExtras;
      setExtrasTick((t) => t + 1);
      setErrors({});
      setValidating({});
      manualEditedRef.current.clear();
    }, [initBase, initExtras]),
  };
}
