import type { FieldDef } from "@core/form/types";

export type HttpMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export type SubmitHttp = {
  type: "http";
  url: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  pick?: string[];
  omit?: string[];
  transform?: (values: Record<string, any>) => any;
  parseResponse?: (res: any) => any;
  fetcher?: (input: string, init: RequestInit) => Promise<Response>;
};

export type Notifier = {
  success?: (msg: string) => void;
  error?: (msg: string) => void;
  info?: (msg: string) => void;
};

export type SubmitFn = {
  type: "fn";
  run: (
    values: Record<string, any>,
    meta?: { meta: FieldDef; fields: FieldDef[]; deps: string[] }[]
  ) => Promise<any>;
};

export type SubmitDef = SubmitHttp | SubmitFn;

export type FormHooks = {
  mapToDto?: (values: Record<string, any>) => any;
  mapFromDto?: (dto: any) => Record<string, any>;
  asyncValidate?: (values: Record<string, any>) => Promise<Partial<Record<string, string | null>>>;
  onChange?: (values: Record<string, any>) => void;
};

export type FormMode = "create" | "update";

export type ModeText =
  | string
  | { create: string; update: string }
  | ((ctx: { mode: FormMode; values: any; result?: any }) => string);

export type GroupConfig = { name: string; label?: string; col?: number };

export type SubmitButton = {
  name: string;
  label?: string;
  color?:
  | "primary"
  | "secondary"
  | "error"
  | "warning"
  | "info"
  | "success";

  icon?: React.ReactNode;

  visible?: (ctx: { mode: FormMode; values: any }) => boolean;

  submit: (ctx: {
    values: Record<string, any>;
    mode: FormMode;
    meta?: { meta: FieldDef; fields: FieldDef[]; deps: string[] }[];
  }) => void | Promise<any>;

  toasts?: {
    saved?: ModeText;
    failed?: ModeText;
  };

  afterSaved?: (result: any) => void | Promise<void>;
};

export type FormSchema = {
  fields: FieldDef[];
  submit?: SubmitDef | { create: SubmitDef | null; update: SubmitDef | null };
  submitButtons?: SubmitButton[];
  mergeSubmitButtons?: boolean;
  idField?: string; // mặc định "id"
  modeResolver?: (initial: Record<string, any>) => FormMode;
  hooks?: FormHooks;
  toasts?: {
    saved?: ModeText;   // vd: "Lưu xong!" | { create:"Tạo xong!", update:"Cập nhật xong!" } | (ctx)=>string
    failed?: ModeText;
  };

  showReset?: boolean;
  initialResolver?: (initial?: any) => Promise<Record<string, any> | null> | Record<string, any> | null;
  afterSaved?: (result: any, ctx?: any) => Promise<void> | void;

  onChange?: (name: string, value: any, ctx: {
    values: Record<string, any>;
    setValue: (name: string, v: any) => void;
    setAllValues: (obj: Record<string, any>) => void;
    reset: () => void;
    // Event Emitter
    emit: (event: string, payload?: any) => void;
    on: (event: string, handler: (payload: any) => void) => void;
    off: (event: string, handler: (payload: any) => void) => void;
  }, source: "user" | "programmatic") => void;


  // Groups
  groups?: GroupConfig[] | null;
};

export type AutoFormProps = {
  schema?: FormSchema;
  initial?: Record<string, any> | null;
  onSaved?: (result?: any) => void;
  notifier?: Notifier;
};

export type AutoFormRef = {
  schema: FormSchema;
  values: Record<string, any>;
  submit: () => Promise<boolean>;
  runSubmitButton: (btn: SubmitButton, mode: FormMode) => Promise<boolean>;
  getSubmitButtons: () => SubmitButton[]
  reset: () => void;
  setValue: (name: string, v: any) => void;
  setAllValues: (obj: Record<string, any>) => void
};

