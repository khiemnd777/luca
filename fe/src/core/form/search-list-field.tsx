import * as React from "react";
import {
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  FormHelperText,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddCircleOutlineRounded from "@mui/icons-material/AddCircleOutlineRounded";
import DragIndicatorRounded from "@mui/icons-material/DragIndicatorRounded";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import type { FormContext } from "./types";

type Size = "small" | "medium";

export type SearchListFieldProps<T> = {
  // UI
  label?: string;
  placeholder?: string;
  size?: Size;
  fullWidth?: boolean;
  disabled?: boolean;
  error?: string | null;
  helperText?: string;

  // Controlled (IDs-based)
  selectedIds?: Array<string | number>;
  onIdsChange?: (nextIds: Array<string | number>) => void;

  // Back-compat: vẫn emit IDs vào onChange nếu không có onIdsChange
  value?: any;
  onChange?: (next: any) => void;

  // Server / client actions
  /** Search “không phân trang” (fallback). kw="" -> load ALL/top-N */
  search: (keyword: string, ctx?: FormContext) => Promise<T[]>;
  /** Search “có phân trang” (khuyến nghị để bật infinite scroll) */
  searchPage?: (keyword: string, page: number, limit: number, ctx?: FormContext) => Promise<T[]>;
  /** Hydrate danh sách hiện có theo ngữ cảnh (uncontrolled) */
  fetchList?: (values: Record<string, any>, ctx?: FormContext) => Promise<T[]>;
  /** Map IDs -> T (controlled) */
  hydrateByIds?: (ids: Array<string | number>, values: Record<string, any>) => Promise<T[]>;

  onAdd?: (item: T) => Promise<void> | void;
  onDelete?: (item: T) => Promise<void> | void;
  onDragEnd?: (items: T[]) => void;

  // Extractors
  getOptionLabel: (item: T, items?: T[]) => string;
  getOptionValue: (item: T) => string | number;

  // Custom render (không chứa nút delete)
  renderItem?: (item: T, index: number) => React.ReactNode;

  // Behavior
  allowDuplicate?: boolean;
  dedupeFn?: (a: T, b: T) => boolean;
  maxItems?: number;

  // Delete control
  disableDelete?: (item: T) => boolean;

  // Create flow
  onOpenCreate?: () => Promise<unknown> | void;

  // Context for fetch/hydrate
  values: Record<string, any>;

  refreshKey?: any;
  autoLoadAllOnMount?: boolean;

  fetchDeps?: any[];

  pageLimit?: number;

  // Context
  ctx?: FormContext;
};

function makeEquality<T>(
  getOptionValue: (t: T) => string | number,
  dedupeFn?: (a: T, b: T) => boolean
) {
  if (dedupeFn) return dedupeFn;
  return (a: T, b: T) => getOptionValue(a) === getOptionValue(b);
}

// ✅ normalize IDs to string for stable compare
const normalizeIds = (ids: Array<string | number>) => ids.map((x) => String(x));
const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export function SearchListField<T>(props: SearchListFieldProps<T>) {
  const {
    label,
    placeholder,
    size = "small",
    fullWidth = true,
    disabled,
    error,
    helperText,

    selectedIds,
    onIdsChange,
    onChange,

    search,
    searchPage,
    fetchList,
    hydrateByIds,

    onAdd,
    onDelete,
    onDragEnd,

    getOptionLabel,
    getOptionValue,
    renderItem,
    allowDuplicate = false,
    dedupeFn,
    maxItems,
    disableDelete,

    onOpenCreate,
    values,
    refreshKey,
    autoLoadAllOnMount = false,
    fetchDeps,
    pageLimit = 20,
    ctx,
  } = props;

  // ✅ FIX: controlled phải dựa vào việc prop tồn tại, không phụ thuộc length>0
  const isControlledByIds = Array.isArray(selectedIds) && typeof hydrateByIds === "function";

  const listInset = 3; // 14px

  const [items, setItems] = React.useState<T[]>([]);
  const itemsRef = React.useRef(items);

  const deriveIds = React.useCallback((arr: T[]) => arr.map((x) => getOptionValue(x)), [getOptionValue]);

  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // ✅ Emit only when IDs change (always normalize)
  const lastEmittedIdsRef = React.useRef<string[]>([]);
  const emitIdsIfChanged = React.useCallback(
    (arr: T[]) => {
      const rawIds = deriveIds(arr);
      const ids = normalizeIds(rawIds);
      if (!sameIds(ids, lastEmittedIdsRef.current)) {
        lastEmittedIdsRef.current = ids;
        if (onIdsChange) {
          onIdsChange(rawIds);
        } else if (onChange) {
          onChange(rawIds as any);
        }
      }
    },
    [deriveIds, onIdsChange, onChange]
  );

  // ✅ Controlled by IDs: hydrate selectedIds -> items
  // Fix nháy revert:
  //  - ignore stale async response (requestId)
  //  - skip overwrite nếu items hiện tại đã match selectedIds (do vừa add xong)
  const hydrateReqIdRef = React.useRef(0);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!isControlledByIds || !hydrateByIds) return;

      const reqId = ++hydrateReqIdRef.current;

      try {
        const idsWanted = normalizeIds(selectedIds ?? []);
        const idsCurrent = normalizeIds(deriveIds(itemsRef.current));

        // Nếu UI đã đúng theo selectedIds thì khỏi hydrate overwrite
        if (sameIds(idsWanted, idsCurrent)) {
          lastEmittedIdsRef.current = idsWanted;
          return;
        }

        const hydrated = await hydrateByIds(selectedIds ?? [], values);

        if (cancelled) return;
        // Ignore stale response
        if (reqId !== hydrateReqIdRef.current) return;

        const order = new Map(idsWanted.map((id, i) => [id, i]));
        const sorted = [...(hydrated ?? [])].sort((a, b) => {
          const ia = order.get(String(getOptionValue(a))) ?? 0;
          const ib = order.get(String(getOptionValue(b))) ?? 0;
          return ia - ib;
        });

        setItems(sorted);
        lastEmittedIdsRef.current = idsWanted;
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isControlledByIds, selectedIds, hydrateByIds, values, getOptionValue, deriveIds]);

  // Uncontrolled hydrate: dùng fetchDeps (hoặc mặc định values.id) để tránh loop
  const defaultFetchKey = values && "id" in values ? (values as any).id : "__NO_ID__";
  const depsForFetch = fetchDeps ?? [defaultFetchKey, isControlledByIds, fetchList];

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isControlledByIds) return;
        if (!fetchList) return;
        const data = await fetchList(values, ctx);
        if (!cancelled) {
          setItems(data ?? []);
          emitIdsIfChanged(data ?? []);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, depsForFetch);

  // refreshKey → refetch list hiện có
  const doFetchList = React.useCallback(async () => {
    if (!fetchList) return;
    const data = await fetchList(values, ctx);
    setItems(data ?? []);
    emitIdsIfChanged(data ?? []);
  }, [fetchList, values, ctx, emitIdsIfChanged]);

  React.useEffect(() => {
    if (refreshKey === undefined) return;
    doFetchList().catch(() => void 0);
  }, [refreshKey, doFetchList]);

  // Search state & options (paging)
  const [keyword, setKeyword] = React.useState("");
  const [options, setOptions] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);

  const eq = React.useMemo(() => makeEquality(getOptionValue, dedupeFn), [getOptionValue, dedupeFn]);

  const filterOutSelected = React.useCallback(
    (arr: T[]) => {
      if (allowDuplicate) return arr;
      return arr.filter((o) => !items.some((x) => eq(x, o)));
    },
    [allowDuplicate, items, eq]
  );

  const dedupById = React.useCallback(
    (arr: T[]) => {
      const seen = new Set<string>();
      const out: T[] = [];
      for (const it of arr) {
        const key = String(getOptionValue(it));
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(it);
      }
      return out;
    },
    [getOptionValue]
  );

  const loadFirstPage = React.useCallback(
    async (kw: string) => {
      setLoading(true);
      setPage(1);
      try {
        if (searchPage) {
          const data = await searchPage(kw, 1, pageLimit, ctx);
          const filtered = filterOutSelected(data ?? []);
          setOptions(filtered);
          setHasMore((data?.length ?? 0) >= pageLimit);
        } else {
          const data = await search(kw, ctx);
          const filtered = filterOutSelected(data ?? []);
          setOptions(filtered);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
      }
    },
    [searchPage, pageLimit, ctx, filterOutSelected, search, ctx]
  );

  // Load trang kế tiếp
  const loadNextPage = React.useCallback(async () => {
    if (!searchPage) return;
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await searchPage(keyword, nextPage, pageLimit, ctx);
      const filtered = filterOutSelected(data ?? []);
      setOptions((prev) => dedupById([...prev, ...filtered]));
      setPage(nextPage);
      setHasMore((data?.length ?? 0) >= pageLimit);
    } finally {
      setLoadingMore(false);
    }
  }, [searchPage, loadingMore, hasMore, page, keyword, pageLimit, ctx, filterOutSelected, dedupById]);

  // Auto load ALL (first page) on mount
  React.useEffect(() => {
    if (!autoLoadAllOnMount) return;
    loadFirstPage("").catch(() => void 0);
  }, [autoLoadAllOnMount, loadFirstPage]);

  // onInputChange: reset paging và load First page
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleInputChange = React.useCallback(
    (_e: React.SyntheticEvent, v: string, reason: string) => {
      if (reason !== "input" && reason !== "clear") return;
      setKeyword(v);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (v === "" || reason === "clear") {
        loadFirstPage("").catch(() => void 0);
        return;
      }

      debounceRef.current = setTimeout(() => {
        loadFirstPage(v).catch(() => void 0);
      }, 300);
    },
    [loadFirstPage]
  );

  // Khi add/remove item → reload lại trang hiện tại theo từ khoá (đảm bảo ẩn item đã chọn)
  const reloadCurrentAfterSelectionChange = React.useCallback(() => {
    loadFirstPage(keyword).catch(() => void 0);
  }, [keyword, loadFirstPage]);

  const setItemsAndEmit = React.useCallback(
    (next: T[]) => {
      itemsRef.current = next;
      setItems(next);
      emitIdsIfChanged(next);
    },
    [emitIdsIfChanged]
  );

  const canAddMore = maxItems == null || items.length < maxItems;

  const addItem = React.useCallback(
    async (item: T) => {
      if (!canAddMore) return;
      if (!allowDuplicate && items.some((x) => eq(x, item))) return;

      if (onAdd) await onAdd(item);

      setItemsAndEmit([...items, item]);
      reloadCurrentAfterSelectionChange();
    },
    [canAddMore, allowDuplicate, items, eq, onAdd, setItemsAndEmit, reloadCurrentAfterSelectionChange]
  );

  const removeItem = React.useCallback(
    async (item: T) => {
      if (onDelete) await onDelete(item);
      const next = items.filter((x) => !eq(x, item));
      setItemsAndEmit(next);
      reloadCurrentAfterSelectionChange();
    },
    [items, onDelete, eq, setItemsAndEmit, reloadCurrentAfterSelectionChange]
  );

  const defaultItemContent = React.useCallback(
    (item: T) => <Chip label={getOptionLabel(item, options)} size="small" />,
    [getOptionLabel, options]
  );

  const handleOpenCreate = React.useCallback(async () => {
    try {
      if (onOpenCreate) {
        await onOpenCreate();
        await doFetchList();
        loadFirstPage(keyword).catch(() => void 0);
      }
    } catch {
      // ignore
    }
  }, [onOpenCreate, doFetchList, loadFirstPage, keyword]);

  // Drag to reorder selected items
  const dragIndexRef = React.useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  const handleDragStart = React.useCallback(
    (index: number) => (event: React.DragEvent<HTMLDivElement>) => {
      dragIndexRef.current = index;
      setDraggingIndex(index);
      setDragOverIndex(index);

      const rowEl = (event.currentTarget as HTMLElement).closest("[data-drag-row]") as
        | HTMLElement
        | null;

      if (rowEl) {
        const rect = rowEl.getBoundingClientRect();
        event.dataTransfer.setDragImage(rowEl, event.clientX - rect.left, event.clientY - rect.top);
      }

      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
    },
    []
  );

  const handleDragOver = React.useCallback(
    (index: number) => (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDragOverIndex(index);
    },
    []
  );

  const handleDrop = React.useCallback(
    (index: number) => (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const from = dragIndexRef.current;
      dragIndexRef.current = null;
      if (from == null || from === index) return;

      const next = [...items];
      const [moved] = next.splice(from, 1);
      if (!moved) return;
      next.splice(index, 0, moved);

      setItemsAndEmit(next);
      setDragOverIndex(null);
      setDraggingIndex(null);
    },
    [items, setItemsAndEmit]
  );

  const handleDragEnd = React.useCallback(() => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
    setDraggingIndex(null);
    if (onDragEnd) onDragEnd(itemsRef.current);
  }, [onDragEnd]);

  // ListboxProps: detect scroll near bottom để loadNextPage()
  const listboxProps = React.useMemo(
    () => ({
      onScroll: (e: React.UIEvent<HTMLUListElement>) => {
        const el = e.currentTarget;
        const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 32;
        if (nearBottom) {
          loadNextPage();
        }
      },
    }),
    [loadNextPage]
  );

  return (
    <FormControl error={!!error} fullWidth={fullWidth} disabled={disabled}>
      <Stack spacing={1}>
        {/* Search row */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Autocomplete
            sx={{ flex: 1 }}
            options={options}
            loading={loading || loadingMore}
            value={null}
            onChange={async (_e, newVal) => {
              if (newVal) await addItem(newVal as T);
            }}
            onInputChange={handleInputChange}
            getOptionLabel={(o) => getOptionLabel(o as T, options)}
            isOptionEqualToValue={(a, b) => eq(a as T, b as T)}
            onOpen={() => {
              if (options.length === 0) {
                loadFirstPage("").catch(() => void 0);
              }
            }}
            filterOptions={(opts) => filterOutSelected(opts as T[])}
            ListboxProps={listboxProps}
            renderInput={(params) => (
              <TextField
                {...params}
                label={label}
                placeholder={placeholder}
                size={size}
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

          {onOpenCreate != null ? (
            <Tooltip title="Tạo mới">
              <span>
                <IconButton
                  color="primary"
                  onClick={handleOpenCreate}
                  disabled={!onOpenCreate}
                  size={size === "medium" ? "medium" : "small"}
                >
                  <AddCircleOutlineRounded />
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
        </Stack>

        {/* Helper / Error */}
        {error ? <FormHelperText>{error}</FormHelperText> : helperText ? <FormHelperText>{helperText}</FormHelperText> : null}

        {/* List đã chọn */}
        <Box
          sx={(t) => ({
            alignSelf: "flex-end",
            ml: listInset,
            width: `calc(100% - ${t.spacing(listInset)})`,
          })}
        >
          {items.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {`Chưa có ${label?.toLocaleLowerCase()} nào.`}
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {items.map((item, idx) => {
                const key = String(getOptionValue(item));
                const disabledDel = disableDelete?.(item) ?? false;
                const isDragging = draggingIndex === idx;
                const isOverlayVisible = draggingIndex != null && dragOverIndex === idx && draggingIndex !== idx;

                return (
                  <Stack
                    data-drag-row
                    key={key}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={(t) => ({
                      position: "relative",
                      p: 1,
                      borderRadius: 1,
                      border: `1px solid ${t.palette.divider}`,
                      opacity: isDragging ? 0.6 : 1,
                      transition: "opacity 80ms linear",
                    })}
                    onDragOver={handleDragOver(idx)}
                    onDrop={handleDrop(idx)}
                  >
                    {isOverlayVisible ? (
                      <Box
                        sx={(t) => ({
                          position: "absolute",
                          inset: 0,
                          borderRadius: 1,
                          border: `2px dashed ${t.palette.primary.main}`,
                          bgcolor: t.palette.action.hover,
                          opacity: 0.6,
                          pointerEvents: "none",
                        })}
                      />
                    ) : null}

                    <Box
                      draggable={!disabled}
                      onDragStart={handleDragStart(idx)}
                      onDragEnd={handleDragEnd}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        pr: 1,
                        color: "text.secondary",
                        cursor: disabled ? "default" : "grab",
                        "&:active": {
                          cursor: disabled ? "default" : "grabbing",
                        },
                      }}
                      aria-label="Kéo để sắp xếp"
                    >
                      <DragIndicatorRounded fontSize="small" />
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {renderItem ? renderItem(item, idx) : defaultItemContent(item)}
                    </Box>

                    <Tooltip title={disabledDel ? "Không thể xoá" : "Xoá"}>
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={disabledDel}
                          onClick={() => !disabledDel && removeItem(item)}
                          aria-label={`Xoá ${getOptionLabel(item, options)}`}
                        >
                          <DeleteRounded fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                );
              })}
            </Box>
          )}
        </Box>
      </Stack>
    </FormControl>
  );
}

export default SearchListField;
