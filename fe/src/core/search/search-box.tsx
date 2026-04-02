import { useMemo, useState, useEffect, useRef } from "react";
import {
  Autocomplete,
  TextField,
  CircularProgress,
  Box,
  Stack,
} from "@mui/material";
import type { SearchModel } from "@core/search/search.model";
import { getSearchRenderer } from "@core/search/search-renderer";
import { search } from "@core/search/search.api";

type SearchBoxProps = {
  placeholder?: string;
  autoFocus?: boolean;
  minChars?: number;
  debounceMs?: number;
  onSelect?: (item: SearchModel, href: string) => void;
  fullWidth?: boolean;
  entityType?: string;
};

export default function SearchBox({
  placeholder = "Tìm kiếm…",
  autoFocus,
  minChars = 2,
  debounceMs = 300,
  onSelect,
  fullWidth = true,
  entityType,
}: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SearchModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const reqCounter = useRef(0);
  const debouncedQuery = useDebounce(query, debounceMs);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < minChars) {
      setOptions([]);
      setLoading(false);
      return;
    }
    let isActive = true;
    const cur = ++reqCounter.current;

    setLoading(true);
    search(debouncedQuery.trim(), entityType)
      .then((rs) => {
        if (!isActive || cur !== reqCounter.current) return;
        const items = rs.items ?? [];
        setOptions(entityType ? items.filter((item) => item.entityType === entityType) : items);
      })
      .catch(() => {
        if (!isActive) return;
        setOptions([]);
      })
      .finally(() => {
        if (!isActive) return;
        setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [debouncedQuery, minChars, entityType]);

  const highlight = useMemo(() => makeHighlighter(debouncedQuery), [debouncedQuery]);

  return (
    <Autocomplete<SearchModel, false, false, false>
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={options}
      loading={loading}
      filterOptions={(x) => x}
      getOptionLabel={(o) => o?.title ?? ""}
      isOptionEqualToValue={(a, b) => a.entityType === b.entityType && a.entityId === b.entityId}
      groupBy={(o) => {
        const entry =
          getSearchRenderer(o.entityType) ||
          getSearchRenderer("__default__");
        return entry?.label ?? o.entityType;
      }}
      onChange={(_e, val) => {
        if (!val) return;
        const entry =
          getSearchRenderer(val.entityType) ||
          getSearchRenderer("__default__");
        const href = entry?.getHref?.(val);
        if (typeof href === "string" && href.trim() !== "") {
          onSelect?.(val, href);
        }
      }}
      renderOption={(props, option) => {
        const entry =
          getSearchRenderer(option.entityType) ||
          getSearchRenderer("__default__");

        const renderer =
          entry?.renderer ??
          ((opt: SearchModel, ctx: { q: string; highlight: (t: string) => React.ReactNode }) =>
            ctx.highlight(opt.title ?? ""));

        const icon = entry?.icon;

        return (
          <li {...props} key={`${option.entityType}:${option.entityId}`}>
            <Stack direction="row" spacing={1} alignItems="center">
              {icon ? <Box sx={{ display: "flex", alignItems: "center" }}>{icon}</Box> : null}
              <Box sx={{ flex: 1 }}>
                {renderer(option, { q: debouncedQuery, highlight })}
              </Box>
            </Stack>
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          autoFocus={autoFocus}
          fullWidth={fullWidth}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      noOptionsText={
        query.trim().length < minChars
          ? `Nhập ít nhất ${minChars} ký tự`
          : "Không có kết quả"
      }
    />
  );
}

function useDebounce<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function removeAccents(str: string) {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function makeHighlighter(q: string) {
  if (!q) return (text: string) => text ?? "";

  const qNorm = removeAccents(q.toLowerCase());

  return (text: string) => {
    if (!text) return "";

    const raw = text;
    const norm = removeAccents(text).toLowerCase();

    const idx = norm.indexOf(qNorm);
    if (idx < 0) return raw;

    const before = raw.slice(0, idx);
    const match = raw.slice(idx, idx + qNorm.length);
    const after = raw.slice(idx + qNorm.length);

    return (
      <>
        {before}
        <mark>{match}</mark>
        {after}
      </>
    );
  };
}
