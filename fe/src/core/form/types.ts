export type FieldKind =
  | "text"
  | "password"
  | "new-password"
  | "change-password"
  | "email"
  | "textarea"
  | "date"
  | "datetime"
  | "color"
  | "currency"
  | "currency-equation"
  | "select"
  | "checkbox"
  | "switch"
  | "number"
  | "multiselect"
  | "autocomplete"
  | "fileupload"
  | "imageupload"
  | "qr"
  | "custom"
  | "searchlist"
  | "searchsingle"
  | "metadata"
  | "relation" // ghost -> searchlist or searchsingle
  ;

export type DeriveMode = "always" | "whenEmpty" | "untilManual";

export type FormContext = {
  formSessionId: string | null;
  metadataBlocks: { meta: FieldDef; fields: FieldDef[]; deps: string[]; collections: string[] }[];
  values: Record<string, any>;
  setValue: (name: string, v: any) => void;
  setAllValues: (obj: Record<string, any>) => void;
  setFieldError: (name: string, msg: string | null) => void;
  reset: () => void;
  setInitial: (obj: Record<string, any>) => void;
  clear: () => void;

  // Event Emitter
  emit: (event: string, payload?: any) => void;
  on: (event: string, handler: (payload: any) => void) => void;
  off: (event: string, handler: (payload: any) => void) => void;
}

// Password rules
export type PasswordRules = {
  minLength?: number;          // default 8
  maxLength?: number;          // optional
  requireUpper?: boolean;      // default true
  requireLower?: boolean;      // default true
  requireDigit?: boolean;      // default true
  requireSymbol?: boolean;     // default false
  disallowSpaces?: boolean;    // default true
  disallowReuseCurrent?: boolean; // chỉ áp cho change-password, default true
  custom?: (pw: string, allValues: Record<string, any>) => string | null | undefined;
};

export type FieldRules = {
  required?: boolean | string; // true | "custom message"
  minLength?: number;
  maxLength?: number;
  min?: number; // number/currency
  max?: number; // number/currency
  pattern?: RegExp | { regex: RegExp; message?: string };
  minDateTime?: string; // ISO string
  maxDateTime?: string; // ISO string
  custom?: (value: any) => string | null | undefined; // sync: return message if invalid

  // async validation (per-field)
  // Trả về message lỗi hoặc null/undefined nếu hợp lệ.
  async?: (value: any, allValues: Record<string, any>) => Promise<string | null | undefined>;

};

export type Option = {
  label: string;
  value: string | number | boolean;
};

export type SearchSingleValidateTrigger = "blur" | "select" | "input" | "clear";

export type QROptions = {
  size?: number;
  tooltipSize?: number;
  level?: "L" | "M" | "Q" | "H";
  fgColor?: string;
  bgColor?: string;
};

export type CustomRenderCtx = {
  value: any;
  setValue: (v: any) => void;
  error?: string | null;
  field: FieldDef;
  values: Record<string, any>;
  ctx?: FormContext | null;
};

// searchlist
export type SearchListSearchFn = (keyword: string, ctx?: FormContext) => Promise<any[]>;
export type SearchListSearchPageFn = (
  keyword: string,
  page: number,
  limit: number,
  ctx?: FormContext
) => Promise<any[]>;
export type SearchListFetchListFn = (values: Record<string, any>, ctx?: FormContext) => Promise<any[]>;
export type SearchListHydrateFn = (
  ids: Array<string | number>,
  values: Record<string, any>,
  ctx?: FormContext
) => Promise<any[]>;

// metadata def
export type MiniFieldOverride = {
  name: string;
  col?: number;
  label?: string;
  placeholder?: string;
  helperText?: string;
  defaultNowOnInteract?: boolean;
  rules?: FieldRules;
  showIf?: (values: Record<string, any>, ctx?: FormContext) => boolean;
  disableIf?: (values: Record<string, any>, ctx?: FormContext) => boolean;
  asText?: boolean;

  onBlur?: (text: string, matched: any, ctx?: FormContext | null) => void;
  onSelect?: (item: any) => void;
  onChange?: (value: any, ctx?: FormContext) => void;
  onInputChange?: (text: string) => void;
  validate?: (input: string, matched: any | null, ctx?: FormContext | null) => string | null | undefined;
  validateAsync?: (input: string, matched: any | null, ctx?: FormContext | null) => Promise<string | null | undefined>;
  validateOn?: SearchSingleValidateTrigger | SearchSingleValidateTrigger[];
  onValidate?: (message: string | null, input: string, matched: any | null, ctx?: FormContext | null) => void;
  onDragEnd?: (items: any[]) => void;

  // searchlist, autocomplete, relation
  where?: (values: Record<string, any>, ctx?: FormContext) => string[];
  searchPage?: SearchListSearchPageFn;
  fetchOne?: (values: Record<string, any>) => Promise<any | null>;
  hydrateById?: (id: string | number, values: Record<string, any>) => Promise<any | null>;
  hydrateOrderField?: string;
  getOptionLabel?: (item: any) => string;
  getInputLabel?: (item: any) => string;
  renderItem?: (item: any, index?: number) => React.ReactNode;
};

export type MetadataFieldPlacement = {
  group: string;
  section?: string;
  fields?: string[];
};


export type FieldDef = {
  name: string;
  altName?: string;
  label: string;
  kind: FieldKind;
  group?: string;                                                           // default: "general"
  section?: string;
  col?: number;
  placeholder?: string;
  rows?: number;                                                            // for textarea
  defaultValue?: any;
  defaultNowOnInteract?: boolean;
  helperText?: string;
  fullWidth?: boolean;
  size?: "small" | "medium";
  rules?: FieldRules;
  qr?: QROptions;
  step?: number;                                                            // for number
  showIf?: (values: Record<string, any>, ctx?: FormContext) => boolean;
  disableIf?: (values: Record<string, any>, ctx?: FormContext) => boolean;
  asTextFn?: (values: Record<string, any>, ctx?: FormContext) => boolean;
  asText?: boolean;                                                         // readonly text mode

  // select / multiselect / autocomplete
  options?: Option[];                                                       // for select
  loadOptions?: (keyword: string) => Promise<Option[]>;                     // async loader cho autocomplete
  freeSolo?: boolean;                                                       // autocomplete free text
  multiple?: boolean;                                                       // multiselect flag
  debounceMs?: number;                                                      // debounce for async option loading

  // fileupload | imageupload
  accept?: string;                                                          // ví dụ: "image/*,.pdf"
  uploader?: (files: File[], onProgress?: (p: { index: number; progress: number }) => void) => Promise<string[]>; // trả về URLs sau upload
  maxFiles?: number;
  multipleFiles?: boolean;                                                  // nếu không set, suy ra từ rules.required hoặc defaultValue
  imagePreviewAspectRatio?: string;
  imagePreviewHeight?: number;

  // password
  passwordRules?: PasswordRules;
  // change-password labels
  currentLabel?: string;  // default: "Mật khẩu hiện tại"
  newLabel?: string;      // default: "Mật khẩu mới" (hoặc "Mật khẩu" cho new-password)
  confirmLabel?: string;  // default: "Xác nhận mật khẩu mới" / "Xác nhận mật khẩu"

  // custom
  render?: (ctx: CustomRenderCtx) => React.ReactNode;
  normalizeInitial?: (value: any, allValues?: Record<string, any>) => any;

  // derive value từ field khác (vd: fullname -> slug)
  derive?: {
    /** Field nguồn (vd: "fullname") */
    field: string;
    /** Ánh xạ từ giá trị nguồn -> giá trị đích */
    map: (sourceValue: any, values: Record<string, any>) => any;
    /** Cơ chế ghi đè:
     *  - "always": luôn sync theo nguồn
     *  - "whenEmpty": chỉ điền nếu hiện đang rỗng
     *  - "untilManual": tự động cho đến khi người dùng chỉnh tay field đích
     **/
    mode?: DeriveMode; // default: "untilManual"
  };

  // searchlist
  where?: (values: Record<string, any>, ctx?: FormContext) => string[];
  search?: SearchListSearchFn;                                   // search(kw): T[]
  searchPage?: SearchListSearchPageFn;                           // searchPage(kw, page, limit): T[]
  fetchList?: SearchListFetchListFn;                             // hydrate list hiện có theo ngữ cảnh (values): T[]
  hydrateByIds?: SearchListHydrateFn;                            // map IDs -> T[] khi field đã có sẵn IDs
  resolveDefaultInput?: (
    values: Record<string, any>,
    ctx?: FormContext
  ) => Promise<{ inputValue?: string; value?: any | null } | null>;
  onSelect?: (item: any) => void;
  onBlur?: (text: string, matched: any, ctx?: FormContext | null) => void;
  onAdd?: (item: any) => Promise<void> | void;                   // khi add item từ search
  onDelete?: (item: any) => Promise<void> | void;
  onDragEnd?: (items: any[]) => void;
  // Extractors (áp dụng cho searchlist)
  getOptionLabel?: (item: any, items?: any[]) => string;                        // T -> label
  getOptionValue?: (item: any) => string | number;               // T -> ID
  getInputLabel?: (item: any) => string;
  prop?: string;

  // searchsingle
  allowUnmatched?: boolean;
  fetchOne?: (values: Record<string, any>) => Promise<any | null>;
  hydrateById?: (id: string | number, values: Record<string, any>) => Promise<any | null>;
  validate?: (input: string, matched: any | null, ctx?: FormContext | null) => string | null | undefined;
  validateAsync?: (input: string, matched: any | null, ctx?: FormContext | null) => Promise<string | null | undefined>;
  validateOn?: SearchSingleValidateTrigger | SearchSingleValidateTrigger[];
  onValidate?: (message: string | null, input: string, matched: any | null, ctx?: FormContext | null) => void;

  // metadata
  metadata?: {
    collection?: string;
    collectionFn?: (ctx: FormContext) => string;
    group?: string;
    tag?: string | null;
    mode?: "whole" | "partial";
    fields?: string[];
    ignoreFields?: string[];
    showIfFields?: string[];
    groups?: MetadataFieldPlacement[];
    def?: MiniFieldOverride[];
  };

  // UI render item (không chứa nút delete)
  renderItem?: (item: any, index?: number) => React.ReactNode;

  // Behavior
  allowDuplicate?: boolean;                                      // default false (ẩn item đã chọn)
  dedupeFn?: (a: any, b: any) => boolean;                        // custom so sánh
  maxItems?: number;
  disableDelete?: (item: any) => boolean;

  // Create flow via FormDialog
  onOpenCreate?: () => void;                                     // mở FormDialog tạo mới
  refreshKey?: any;                                              // trigger refetch list hiện có
  autoLoadAllOnMount?: boolean;                                  // rỗng → load ALL ngay từ mount (default false)
  pageLimit?: number;
  hydrateOrderField?: string;

  // equation
  currencyEquation?: string; // price_original * vat
};

export type AutoFormOptions = {
  asyncValidate?: (values: Record<string, any>) => Promise<Partial<Record<string, string | null>>>;
  asyncDebounceMs?: number;
};
