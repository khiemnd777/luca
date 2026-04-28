import * as React from "react";
import {
  Autocomplete,
  CircularProgress,
  FormControl,
  FormHelperText,
  IconButton,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import AddCircleOutlineRounded from "@mui/icons-material/AddCircleOutlineRounded";
import type { FormContext } from "./types";
import { normalizeVietnamese } from "@root/shared/utils/string.utils";


type Size = "small" | "medium";
type ValidateTrigger = "blur" | "select" | "input" | "clear";

export type SearchSingleFieldProps<T> = {
  // Field basics
  name: string;
  label?: string;
  placeholder?: string;
  size?: Size;
  fullWidth?: boolean;
  disabled?: boolean;
  allowUnmatched?: boolean;
  error?: string | null;
  helperText?: string;

  /** Controlled mode */
  selectedId?: string | number | null;
  onChange?: (value: string | number | null, obj: T | null) => void;

  /** Events */
  onSelect?: (item: T | null) => void;
  onBlur?: (input: string, matched: T | null, ctx?: FormContext | null) => void;
  onInputChange?: (text: string) => void;
  resolveDefaultInput?: (
    values: Record<string, any>,
    ctx?: FormContext
  ) => Promise<{ inputValue?: string; value?: T | null } | null>;

  /** Data fetchers */
  search: (keyword: string, ctx?: FormContext) => Promise<T[]>;
  searchPage?: (keyword: string, page: number, limit: number, ctx?: FormContext) => Promise<T[]>;
  fetchOne?: (values: Record<string, any>, ctx?: FormContext) => Promise<T | null>;
  hydrateById?: (id: string | number, values: Record<string, any>, ctx?: FormContext) => Promise<T | null>;

  /** Create */
  onOpenCreate?: () => Promise<void> | void;

  /** Rendering */
  getOptionLabel: (item: T, items?: T[]) => string;
  getOptionValue: (item: T) => string | number;
  getInputLabel?: (item: T) => string;
  renderItem?: (item: T) => React.ReactNode;

  /** Validation */
  validate?: (input: string, matched: T | null, ctx?: FormContext | null) => string | null | undefined;
  validateAsync?: (input: string, matched: T | null, ctx?: FormContext | null) => Promise<string | null | undefined>;
  validateOn?: ValidateTrigger | ValidateTrigger[];
  onValidate?: (message: string | null, input: string, matched: T | null, ctx?: FormContext | null) => void;

  /** Paging */
  autoLoadAllOnMount?: boolean;
  pageLimit?: number;

  values: Record<string, any>;
  refreshKey?: any;
  ctx?: FormContext;
};

export type SearchSingleFieldHandle = {
  resetToDefault: () => void;
};

/* ============================================================
   HELPERS
============================================================ */
const useDebounce = () => {
  const ref = React.useRef<any>(null);
  return (fn: () => void, ms = 300) => {
    clearTimeout(ref.current);
    ref.current = setTimeout(fn, ms);
  };
};

/* ============================================================
   MAIN COMPONENT
============================================================ */
function SearchSingleFieldInner<T>(
  props: SearchSingleFieldProps<T>,
  ref: React.ForwardedRef<SearchSingleFieldHandle>
) {
  const {
    name,
    label,
    placeholder,
    size = "small",
    fullWidth = true,
    disabled,
    allowUnmatched,
    error,
    helperText,

    selectedId,
    onChange,
    onSelect,
    onBlur,
    onInputChange,
    resolveDefaultInput,

    search,
    searchPage,
    fetchOne,
    hydrateById,

    onOpenCreate,

    getOptionLabel,
    getOptionValue,
    renderItem,
    validate,
    validateAsync,
    validateOn,
    onValidate,

    values,
    refreshKey,

    autoLoadAllOnMount = false,
    pageLimit = 20,
    ctx,
  } = props;

  /* ======================================================
     INTERNAL STATE
  ====================================================== */
  const [value, setValue] = React.useState<T | null>(null);
  const [options, setOptions] = React.useState<T[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [keyword, setKeyword] = React.useState("");
  const [defaultInput, setDefaultInput] = React.useState<string | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [cachedOptions, setCachedOptions] = React.useState<T[]>([]);
  const [internalError, setInternalError] = React.useState<string | null>(null);

  const debounce = useDebounce();
  const defaultInputRef = React.useRef<string | null>(null);
  const lastInputReasonRef = React.useRef<string | null>(null);
  const userInteractedRef = React.useRef(false);
  const inputValueRef = React.useRef(inputValue);
  const valueRef = React.useRef(value);
  const validationSeqRef = React.useRef(0);
  const mountedRef = React.useRef(true);

  /* ======================================================
     Controlled mode → hydrateById
  ====================================================== */
  const valuesRef = React.useRef(values);
  React.useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  React.useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  React.useEffect(() => {
    valueRef.current = value;
  }, [value]);

  React.useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const validateOnSet = React.useMemo(() => {
    const base = validateOn
      ? (Array.isArray(validateOn) ? validateOn : [validateOn])
      : ["blur", "select"];
    return new Set(base);
  }, [validateOn]);

  const isErrorControlled = typeof error !== "undefined";
  const mergedError = isErrorControlled ? error : internalError;

  const reportValidation = React.useCallback((
    message: string | null,
    input: string,
    matched: T | null
  ) => {
    if (ctx?.setFieldError) {
      ctx.setFieldError(name, message ?? null);
    }
    onValidate?.(message ?? null, input, matched, ctx);
    if (!isErrorControlled) {
      setInternalError(message ?? null);
    }
  }, [ctx, name, onValidate, isErrorControlled]);

  const runValidation = React.useCallback(async (
    trigger: ValidateTrigger,
    input: string,
    matched: T | null
  ) => {
    if (!validate && !validateAsync) return;
    if (!validateOnSet.has(trigger)) return;

    const seq = ++validationSeqRef.current;
    const syncMsg = validate?.(input, matched, ctx) ?? null;
    if (syncMsg) {
      reportValidation(syncMsg, input, matched);
      return;
    }

    if (!validateAsync) {
      reportValidation(null, input, matched);
      return;
    }

    try {
      const asyncMsg = await validateAsync(input, matched, ctx);
      if (!mountedRef.current || seq !== validationSeqRef.current) return;
      reportValidation(asyncMsg ?? null, input, matched);
    } catch (e: any) {
      if (!mountedRef.current || seq !== validationSeqRef.current) return;
      reportValidation(e?.message ?? "Validation failed", input, matched);
    }
  }, [validate, validateAsync, validateOnSet, ctx, reportValidation]);

  /* ======================================================
     Resolve default input (initial)
  ====================================================== */
  const resolvingRef = React.useRef<Promise<any> | null>(null);

  React.useEffect(() => {
    if (!resolveDefaultInput) return;

    // ⛔ chặn tuyệt đối
    if (resolvingRef.current) return;

    resolvingRef.current = (async () => {
      const resolved = await resolveDefaultInput(valuesRef.current, ctx);
      if (!resolved) return;

      if (
        resolved.inputValue !== undefined &&
        defaultInputRef.current === null
      ) {
        defaultInputRef.current = resolved.inputValue;
        setDefaultInput(resolved.inputValue);
      }

      if (!userInteractedRef.current && inputValueRef.current === "") {
        if (resolved.inputValue !== undefined) {
          setInputValue(resolved.inputValue);
          setKeyword(resolved.inputValue);
        } else if (resolved.value) {
          const label = getOptionLabel(resolved.value);
          setInputValue(label);
          setKeyword(label);
        }
      }

      if (
        !userInteractedRef.current &&
        valueRef.current == null &&
        resolved.value !== undefined
      ) {
        setValue(resolved.value ?? null);
      }
    })();
  }, [resolveDefaultInput, ctx]);


  React.useEffect(() => {
    if (selectedId == null) {
      setValue(null);
      setInputValue("");
      setKeyword("");
      setOptions([]);
      setCachedOptions([]);
      return;
    }

    if (!hydrateById) return;

    let cancelled = false;

    (async () => {
      const obj = await hydrateById(selectedId, valuesRef.current, ctx);
      if (cancelled) return;
      setValue(obj);
      setInputValue(obj ? getOptionLabel(obj) : "");
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId, hydrateById, getOptionLabel]);

  /* ======================================================
     FetchOne (initial)
  ====================================================== */
  React.useEffect(() => {
    if (!fetchOne) return;
    let cancelled = false;

    (async () => {
      const obj = await fetchOne(valuesRef.current, ctx);
      if (cancelled) return;
      if (obj) {
        setValue(obj);
        setInputValue(getOptionLabel(obj));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchOne, getOptionLabel]);

  /* ======================================================
     Cache options
  ====================================================== */
  React.useEffect(() => {
    if (options.length > 0) {
      setCachedOptions(options);
      return;
    }
    setCachedOptions([]);
  }, [options]);

  /* ======================================================
     Paging search
  ====================================================== */
  const loadFirstPage = React.useCallback(
    async (kw: string) => {
      setLoading(true);
      setPage(1);
      try {
        if (searchPage) {
          const data = await searchPage(kw, 1, pageLimit, ctx);
          setOptions(data ?? []);
          setHasMore((data?.length ?? 0) >= pageLimit);
        } else {
          const data = await search(kw, ctx);
          setOptions(data ?? []);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
      }
    },
    [search, searchPage, pageLimit, ctx]
  );

  const loadNextPage = React.useCallback(async () => {
    if (!searchPage || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await searchPage(keyword, next, pageLimit, ctx);
      setOptions((prev) => [...prev, ...(data ?? [])]);
      setPage(next);
      setHasMore((data?.length ?? 0) >= pageLimit);
    } finally {
      setLoadingMore(false);
    }
  }, [searchPage, keyword, page, pageLimit, loadingMore, hasMore, ctx]);

  /* ======================================================
     AutoLoad options on mount
  ====================================================== */
  React.useEffect(() => {
    if (autoLoadAllOnMount) loadFirstPage("");
  }, [autoLoadAllOnMount]);

  /* ======================================================
     refreshKey → fetchOne again
  ====================================================== */
  React.useEffect(() => {
    if (!refreshKey || !fetchOne) return;

    (async () => {
      const obj = await fetchOne(values, ctx);
      setValue(obj ?? null);
      setInputValue(obj ? getOptionLabel(obj, options) : "");
    })();
  }, [refreshKey]);

  /* ======================================================
     Fallback to default input on empty
  ====================================================== */
  React.useEffect(() => {
    if (inputValue !== "") return;
    if (lastInputReasonRef.current === "input") return;
    const fallback = defaultInput ?? defaultInputRef.current;
    if (fallback == null || fallback === "") return;
    setInputValue(fallback);
    setKeyword(fallback);
  }, [inputValue, defaultInput]);

  React.useImperativeHandle(
    ref,
    () => ({
      resetToDefault: () => {
        const fallback = defaultInput ?? defaultInputRef.current;
        if (fallback == null) return;
        setInputValue(fallback);
        setKeyword(fallback);
      },
    }),
    []
  );

  /* ======================================================
     Input change
  ====================================================== */
  const handleInput = (_: any, text: string, reason: string) => {
    if (
      allowUnmatched &&
      (reason === "blur" || reason === "reset")
    ) {
      return;
    }

    lastInputReasonRef.current = reason;
    if (reason === "input" || reason === "clear") {
      userInteractedRef.current = true;
    }
    const v = text;
    setInputValue(v);
    setKeyword(v);

    onInputChange?.(v);
    if (reason === "input") runValidation("input", v, null);
    if (reason === "clear") runValidation("clear", v, null);

    if (reason !== "input" && reason !== "clear") {
      return;
    }

    if (v === "" || reason === "clear") {
      debounce(() => loadFirstPage(""), 0);
      return;
    }

    debounce(() => loadFirstPage(v), 300);
  };

  /* ======================================================
     Select option
  ====================================================== */
  const handleSelect = async (obj: T | null) => {
    setValue(obj);
    setInputValue(obj ? getOptionLabel(obj, options) : "");

    const val = obj ? getOptionValue(obj) : null;
    onChange?.(val, obj);
    onSelect?.(obj);
    const nextInput = obj ? getOptionLabel(obj, options) : inputValueRef.current;
    runValidation("select", nextInput ?? "", obj);
  };

  /* ======================================================
     Render
  ====================================================== */
  const listboxProps = {
    onScroll: (e: React.UIEvent<HTMLUListElement>) => {
      const el = e.currentTarget;
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 32;
      if (nearBottom) loadNextPage();
    },
  };

  const getRawLabel = React.useCallback(
    (o: T) => (props.getInputLabel ? props.getInputLabel(o) : getOptionLabel(o, options)),
    [props.getInputLabel, getOptionLabel, options]
  );
  const selectedOptionValue = value ? getOptionValue(value) : selectedId;
  const visibleOptions = React.useMemo(() => {
    if (selectedOptionValue == null) return options;
    const selectedKey = String(selectedOptionValue);
    return options.filter((option) => String(getOptionValue(option)) !== selectedKey);
  }, [getOptionValue, options, selectedOptionValue]);

  return (
    <FormControl fullWidth={fullWidth} disabled={disabled} error={!!mergedError}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Autocomplete
            sx={{ flex: 1 }}
            options={visibleOptions}
            loading={loading || loadingMore}
            value={value}
            filterOptions={(x) => x}
            getOptionLabel={(o) => (o ? getOptionLabel(o as T, options) : "")}
            isOptionEqualToValue={(a, b) =>
              getOptionValue(a as T) === getOptionValue(b as T)
            }
            inputValue={inputValue}
            onInputChange={handleInput}
            ListboxProps={listboxProps}
            renderOption={(props, opt) => {
              return (
                <li {...props} key={getOptionValue(opt as T)}>
                  {renderItem ? renderItem(opt as T) : getOptionLabel(opt as T, options)}
                </li>
              );
            }}
            onChange={(_, newVal) => handleSelect(newVal as T)}
            onOpen={() => loadFirstPage("")}
            renderInput={(params) => (
              <TextField
                {...params}
                label={label}
                placeholder={placeholder}
                size={size}
                onBlur={() => {
                  const t = inputValue.trim();

                  const matched = (() => {
                    if (!t) return null;
                    const nt = normalizeVietnamese(t);
                    if (!nt) return null;
                    const sourceOptions = (options.length > 0 ? options : cachedOptions)
                      .slice()
                      .reverse();

                    return (
                      sourceOptions.find((o) => {
                        const raw = getRawLabel(o)?.trim();
                        const optionLabel = getOptionLabel(o, options)?.trim();

                        const candidates = [raw, optionLabel]
                          .filter((label): label is string => !!label)
                          .map((label) => normalizeVietnamese(label))
                          .filter((label): label is string => !!label);

                        return candidates.some(
                          (label) => nt.includes(label) || label.includes(nt)
                        );
                      }) ?? null
                    );
                  })();

                  onBlur?.(t, matched, ctx);
                  runValidation("blur", t, matched);

                  if (!matched) {
                    return;
                  }

                  handleSelect(matched);
                }}

                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading || loadingMore ? <CircularProgress size={16} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />

          {onOpenCreate && (
            <Tooltip title="Tạo mới">
              <span>
                <IconButton color="primary" onClick={onOpenCreate} size={size}>
                  <AddCircleOutlineRounded />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Stack>

        {mergedError ? (
          <FormHelperText>{mergedError}</FormHelperText>
        ) : helperText ? (
          <FormHelperText>{helperText}</FormHelperText>
        ) : null}
      </Stack>
    </FormControl>
  );
}

const SearchSingleField = React.forwardRef(SearchSingleFieldInner) as (<T>(
  props: SearchSingleFieldProps<T> & React.RefAttributes<SearchSingleFieldHandle>
) => React.ReactElement | null) & { displayName?: string };

SearchSingleField.displayName = "SearchSingleField";

export default SearchSingleField;
