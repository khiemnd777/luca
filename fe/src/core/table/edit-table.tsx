import * as React from "react";
import {
  Box,
  Button,
  Paper,
  Stack,
  Typography,
  Tooltip,
  IconButton,
  Chip,
  TablePagination,
  TableSortLabel,
} from "@mui/material";
import { alpha, darken, lighten, useTheme } from "@mui/material/styles";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import QRCode from "react-qr-code";
import type { ColumnDef, ImageShape, SortDir, TableRowAction, TableViewMode } from "@core/table/table.types";
import { useDisplayUrl } from "@core/photo/use-display-url";
import { camelToSnake } from "@shared/utils/string.utils";
import { formatDate, formatDateTime } from "@root/shared/utils/datetime.utils";
import { NumericFormat } from "react-number-format";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getContrastText } from "@root/shared/utils/color.utils";
import { navigate } from "@root/core/navigation/navigate";
import { resolveLocalizedText } from "@root/core/i18n/localized-text";
import { useI18n } from "@root/core/i18n/use-i18n";

export type EditTableProps<T> = {
  rows: T[];
  columns: ColumnDef<T>[];
  page: number;            // 0-based
  pageSize: number;
  total?: number | null;   // nếu có
  loading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onView?: (row: T) => void;
  onRowClick?: (row: T) => void;
  onEdit?: (row: T) => void;
  canEdit?: (row: T) => boolean;
  onDelete?: (row: T) => void;
  canDelete?: (row: T) => boolean;
  rowActions?: TableRowAction<T>[];
  error?: string | null;
  /** Header dính khi scroll dọc */
  stickyHeader?: boolean;
  /** Bảng dense */
  dense?: boolean;

  /** ==== Sorting (server-side optional) ==== */
  onSortChange?: (orderBy: string, direction: SortDir) => void;
  sortBy?: string | null;
  sortDirection?: SortDir;

  /** Khoảng offset top cho header sticky (ví dụ có appbar) */
  stickyTopOffset?: number;
  hidePagination?: boolean;
  view?: TableViewMode;
  verticalHeaderExtra?: React.ReactNode;

  /** Drag & Drop reorder (client-side) */
  onReorder?: (newRows: T[], from: number, to: number) => void;
};

/* ================= Components ================= */
export function ImageCell(props: { src: string; shape?: ImageShape }) {
  const { src, shape } = props;
  const displayUrl = useDisplayUrl(src);

  let initialsSeed = "user";
  if (src) {
    try {
      const parts = src.split(/[\/\\]/);
      const last = parts[parts.length - 1];
      initialsSeed = last?.split(".")[0] || "user";
    } catch {
      initialsSeed = "user";
    }
  }

  const fallbackUrl = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
    initialsSeed
  )}`;
  const finalUrl = displayUrl || fallbackUrl;

  const rectW = 48,
    rectH = 36;
  const squareSize = 40;

  const isSquare = shape === "square";
  const isCircle = shape === "circle";

  return (
    <Tooltip
      placement="right"
      componentsProps={{
        tooltip: {
          sx: {
            bgcolor: "transparent",
            p: 0,
            m: 0,
          },
        },
      }}
      title={
        <Box
          component="img"
          src={finalUrl}
          alt="preview"
          sx={{
            width: 200,
            height: "auto",
            objectFit: "contain",
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
          }}
        />
      }
    >
      <Box
        component="img"
        src={finalUrl}
        alt=""
        sx={{
          width: isSquare || isCircle ? squareSize : rectW,
          height: isSquare || isCircle ? squareSize : rectH,
          objectFit: "cover",
          borderRadius: isCircle ? "50%" : 0.75,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.default",
          cursor: "pointer",
        }}
      />
    </Tooltip>
  );
}

function LinkCell({ label, url }: { label: React.ReactNode; url?: string | null }) {
  if (!url) return <>{label}</>;
  return (
    <Box
      role="link"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        navigate(url);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          navigate(url);
        }
      }}
      sx={{
        color: "primary.main",
        cursor: "pointer",
        textDecoration: "underline",
        textUnderlineOffset: "2px",
        display: "block",
        width: "100%",
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Box>
  );
}

function TruncatedCell({
  content,
  tooltip,
}: {
  content: React.ReactNode;
  tooltip?: string;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [isTruncated, setIsTruncated] = React.useState(false);

  React.useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const measure = () => {
      setIsTruncated(node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight);
    };

    measure();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure);
      observer.observe(node);
      return () => observer.disconnect();
    }
  }, [content, tooltip]);

  return (
    <Tooltip title={tooltip ?? ""} disableHoverListener={!isTruncated || !tooltip}>
      <Box
        ref={ref}
        sx={{
          display: "block",
          width: "100%",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {content}
      </Box>
    </Tooltip>
  );
}

function QRCell({
  value,
  size = 64,
  tooltipSize = 200,
  level = "M",
  fgColor,
  bgColor,
}: {
  value: string;
  size?: number;
  tooltipSize?: number;
  level?: "L" | "M" | "Q" | "H";
  fgColor?: string;
  bgColor?: string;
}) {
  if (!value) return null;
  const small = (
    <Box
      sx={{
        p: 0.5,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        display: "inline-flex",
        bgcolor: bgColor ?? "background.paper",
      }}
    >
      <QRCode value={value} size={size} level={level} fgColor={fgColor} bgColor={bgColor} />
    </Box>
  );

  return (
    <Tooltip
      title={
        <Box sx={{ p: 1, bgcolor: "background.paper", borderRadius: 1, border: "1px solid", borderColor: "divider" }}>
          <QRCode value={value} size={tooltipSize} level={level} fgColor={fgColor} bgColor={bgColor} />
        </Box>
      }
      arrow
      placement="top"
    >
      {small}
    </Tooltip>
  );
}

/* ================= Core ================= */

function getCellValue<T>(row: T, col: ColumnDef<T>) {
  if (col.accessor) return col.accessor(row);
  const k = col.key as string;
  return (row as any)[k];
}

type RenderRow = { id?: string | number } & Record<string, unknown>;
type RenderColumn = ColumnDef<RenderRow>;
type VerticalDetailGroup = {
  key: string;
  label: string | null;
  order: number;
  columns: RenderColumn[];
};

function getRenderRowID(row: unknown, fallbackIndex: number): string {
  const id = typeof row === "object" && row !== null && "id" in row
    ? (row as { id?: string | number }).id
    : undefined;
  return String(id ?? fallbackIndex);
}

function TableBodyRow({
  row,
  rowId,
  columns,
  gridTemplateColumns,
  hasActions,
  baseLeftOffset,
  leftOffsets,
  rightOffsets,
  dense,
  isClickableRow,
  rowHoverBackground,
  stickyCellBackground,
  stickyHoverBackground,
  stickyBoundaryColor,
  bodyCellBorderSx,
  fontSize,
  renderActionButtons,
  renderCell,
  getRowA11yProps,
  registerRowElement,
}: {
  row: RenderRow;
  rowId: string;
  columns: RenderColumn[];
  gridTemplateColumns: string;
  hasActions: boolean;
  baseLeftOffset: number;
  leftOffsets: number[];
  rightOffsets: number[];
  dense: boolean;
  isClickableRow: boolean;
  rowHoverBackground: string;
  stickyCellBackground: string;
  stickyHoverBackground: string;
  stickyBoundaryColor: string;
  bodyCellBorderSx: Record<string, unknown>;
  fontSize: React.CSSProperties["fontSize"];
  renderActionButtons: (row?: RenderRow) => React.ReactNode;
  renderCell: (row: RenderRow, col: RenderColumn) => React.ReactNode;
  getRowA11yProps: (row: RenderRow) => Record<string, unknown>;
  registerRowElement: (rowId: string) => (node: HTMLElement | null) => void;
}) {
  return (
    <Box
      role="row"
      data-row-id={rowId}
      ref={registerRowElement(rowId)}
      {...getRowA11yProps(row)}
      sx={{
        display: "grid",
        gridTemplateColumns,
        alignItems: "stretch",
        cursor: isClickableRow ? "pointer" : undefined,
        "&:hover > [role='cell']:not([data-sticky='true'])": {
          backgroundColor: rowHoverBackground,
        },
        "& > [role='cell'][data-sticky='true']": {
          backgroundColor: stickyCellBackground,
        },
        "&:hover > [role='cell'][data-sticky='true']": {
          backgroundColor: stickyHoverBackground,
        },
      }}
    >
      {hasActions && (
        <Box
          role="cell"
          data-sticky="true"
          sx={{
            position: "sticky",
            left: 0,
            zIndex: STICKY_Z_INDEX.actions,
            backgroundColor: stickyCellBackground,
            whiteSpace: "nowrap",
            px: 1.5,
            py: dense ? 0.75 : 1,
            ...bodyCellBorderSx,
            borderRight: "1px solid",
            borderRightColor: stickyBoundaryColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          {renderActionButtons(row)}
        </Box>
      )}

      {columns.map((c, colIdx) => {
        const left = c.stickyLeft ? baseLeftOffset + (leftOffsets[colIdx] ?? 0) : undefined;
        const right = c.stickyRight ? (rightOffsets[colIdx] ?? 0) : undefined;
        return (
          <Box
            key={String(c.key)}
            role="cell"
            data-sticky={c.stickyLeft || c.stickyRight ? "true" : undefined}
            sx={{
              position: (c.stickyLeft || c.stickyRight) ? "sticky" : "static",
              left,
              right,
              zIndex: (c.stickyLeft || c.stickyRight) ? STICKY_Z_INDEX.sticky : STICKY_Z_INDEX.normal,
              backgroundColor: (c.stickyLeft || c.stickyRight) ? stickyCellBackground : undefined,
              whiteSpace: "nowrap",
              minWidth: 0,
              px: 1.5,
              py: dense ? 0.75 : 1,
              ...bodyCellBorderSx,
              display: "flex",
              alignItems: "center",
              fontSize,
              lineHeight: 1.35,
            }}
          >
            {renderCell(row, c)}
          </Box>
        );
      })}
    </Box>
  );
}

const MemoTableBodyRow = React.memo(TableBodyRow, (prev, next) => (
  prev.row === next.row
  && prev.rowId === next.rowId
  && prev.columns === next.columns
  && prev.gridTemplateColumns === next.gridTemplateColumns
  && prev.hasActions === next.hasActions
  && prev.baseLeftOffset === next.baseLeftOffset
  && prev.leftOffsets === next.leftOffsets
  && prev.rightOffsets === next.rightOffsets
  && prev.dense === next.dense
  && prev.isClickableRow === next.isClickableRow
  && prev.rowHoverBackground === next.rowHoverBackground
  && prev.stickyCellBackground === next.stickyCellBackground
  && prev.stickyHoverBackground === next.stickyHoverBackground
  && prev.stickyBoundaryColor === next.stickyBoundaryColor
  && prev.fontSize === next.fontSize
  && prev.renderActionButtons === next.renderActionButtons
  && prev.renderCell === next.renderCell
  && prev.getRowA11yProps === next.getRowA11yProps
  && prev.registerRowElement === next.registerRowElement
));

function VerticalBodyRow({
  row,
  rowId,
  titleColumn,
  summaryColumns,
  detailColumns,
  detailGroups,
  hasActions,
  isClickableRow,
  rowHoverBackground,
  fontSize,
  renderActionButtons,
  renderCell,
  getColumnHeader,
  getRowA11yProps,
  stopRowClick,
  registerRowElement,
}: {
  row: RenderRow;
  rowId: string;
  titleColumn?: RenderColumn;
  summaryColumns: RenderColumn[];
  detailColumns: RenderColumn[];
  detailGroups: VerticalDetailGroup[] | null;
  hasActions: boolean;
  isClickableRow: boolean;
  rowHoverBackground: string;
  fontSize: React.CSSProperties["fontSize"];
  renderActionButtons: (row?: RenderRow) => React.ReactNode;
  renderCell: (row: RenderRow, col: RenderColumn) => React.ReactNode;
  getColumnHeader: (col: RenderColumn) => string;
  getRowA11yProps: (row: RenderRow) => Record<string, unknown>;
  stopRowClick: (event: React.SyntheticEvent) => void;
  registerRowElement: (rowId: string) => (node: HTMLElement | null) => void;
}) {
  return (
    <Box
      key={rowId}
      role="row"
      data-row-id={rowId}
      ref={registerRowElement(rowId)}
      {...getRowA11yProps(row)}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "background.paper",
        cursor: isClickableRow ? "pointer" : undefined,
        overflow: "hidden",
        "&:hover": {
          backgroundColor: rowHoverBackground,
        },
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 1,
          display: "flex",
          alignItems: "flex-start",
          gap: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ flex: 1, minWidth: 0 }}>
          {titleColumn ? (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
              <ReceiptLongRoundedIcon fontSize="small" color="primary" sx={{ flexShrink: 0 }} />
              <Typography component="div" variant="body2" sx={{ fontWeight: 700, minWidth: 0 }}>
                {renderCell(row, titleColumn)}
              </Typography>
            </Stack>
          ) : null}
          {summaryColumns.map((col) => (
            <Box key={String(col.key)} sx={{ display: "inline-flex" }}>
              {renderCell(row, col)}
            </Box>
          ))}
        </Stack>
        {hasActions ? (
          <Box onClick={stopRowClick} sx={{ flexShrink: 0 }}>
            {renderActionButtons(row)}
          </Box>
        ) : null}
      </Box>

      {detailGroups ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(4, minmax(0, 1fr))",
            },
            columnGap: 3,
            rowGap: 1.5,
            px: 1.5,
            py: 1.25,
          }}
        >
          {detailGroups.map((group) => (
            <Box key={group.key} sx={{ minWidth: 0 }}>
              {group.label ? (
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    mb: 0.75,
                    pb: 0.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    color: "text.primary",
                    fontWeight: 700,
                  }}
                >
                  {group.label.toLocaleUpperCase("vi-VN")}
                </Typography>
              ) : null}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  columnGap: 2,
                  rowGap: 1,
                }}
              >
                {group.columns.map((col) => (
                  <Box key={String(col.key)} role="cell" sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.25 }}>
                      {getColumnHeader(col)}
                    </Typography>
                    <Box sx={{ fontSize, minWidth: 0 }}>
                      {renderCell(row, col)}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(4, minmax(0, 1fr))",
            },
            columnGap: 2,
            rowGap: 1,
            px: 1.5,
            py: 1.25,
          }}
        >
          {detailColumns.map((col) => (
            <Box key={String(col.key)} role="cell" sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.25 }}>
                {getColumnHeader(col)}
              </Typography>
              <Box sx={{ fontSize, minWidth: 0 }}>
                {renderCell(row, col)}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

const MemoVerticalBodyRow = React.memo(VerticalBodyRow, (prev, next) => (
  prev.row === next.row
  && prev.rowId === next.rowId
  && prev.titleColumn === next.titleColumn
  && prev.summaryColumns === next.summaryColumns
  && prev.detailColumns === next.detailColumns
  && prev.detailGroups === next.detailGroups
  && prev.hasActions === next.hasActions
  && prev.isClickableRow === next.isClickableRow
  && prev.rowHoverBackground === next.rowHoverBackground
  && prev.fontSize === next.fontSize
  && prev.renderActionButtons === next.renderActionButtons
  && prev.renderCell === next.renderCell
  && prev.getColumnHeader === next.getColumnHeader
  && prev.getRowA11yProps === next.getRowA11yProps
  && prev.stopRowClick === next.stopRowClick
  && prev.registerRowElement === next.registerRowElement
));

type SortableRowRenderProps = {
  setNodeRef?: (node: HTMLElement | null) => void;
  transformStyle?: React.CSSProperties;
  handleProps?: Omit<React.HTMLAttributes<HTMLElement>, "color">;
  isDragging?: boolean;
};

function SortableRow({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled?: boolean;
  children: (props: SortableRowRenderProps) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <>
      {children({
        setNodeRef,
        transformStyle: style,
        handleProps: { ...attributes, ...listeners } as Omit<React.HTMLAttributes<HTMLElement>, "color">,
        isDragging,
      })}
    </>
  );
}

function defaultCompare(a: unknown, b: unknown) {
  const isDate = (v: unknown) => v instanceof Date || (typeof v === "string" && !isNaN(Date.parse(v)));
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (isDate(a) && isDate(b)) return new Date(a as any).getTime() - new Date(b as any).getTime();
  return String(a ?? "").localeCompare(String(b ?? ""), undefined, { sensitivity: "base" });
}

const STICKY_Z_INDEX = {
  dnd: 11,
  actions: 10,
  sticky: 5,
  normal: 1,
} as const;

function getNearestScrollContainer(element: HTMLElement | null): HTMLElement | Window {
  if (!element) return window;

  let parent = element.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") {
      return parent;
    }
    parent = parent.parentElement;
  }

  return window;
}

function getScrollTop(container: HTMLElement | Window): number {
  if (container instanceof Window) return window.scrollY;
  return container.scrollTop;
}

function getElementTopInScrollContainer(element: HTMLElement, container: HTMLElement | Window): number {
  const elementTop = element.getBoundingClientRect().top;
  if (container instanceof Window) {
    return elementTop + window.scrollY;
  }

  return elementTop - container.getBoundingClientRect().top + container.scrollTop;
}

export function EditTable<T extends { id?: string | number }>({
  rows, columns, page, pageSize, total = null, loading = false,
  onPageChange,
  onPageSizeChange,
  onView,
  onRowClick,
  onEdit,
  canEdit,
  onDelete,
  canDelete,
  rowActions = [],
  error = null,
  stickyHeader = true,
  dense = true,
  onSortChange,
  sortBy: controlledSortBy,
  sortDirection: controlledSortDir,
  stickyTopOffset = 0,
  hidePagination = false,
  view = "table",
  verticalHeaderExtra,
  onReorder,
}: EditTableProps<T>) {
  const { t } = useI18n();
  const theme = useTheme();
  const isClickableRow = typeof onRowClick === "function";
  const isDarkMode = theme.palette.mode === "dark";
  const headerBackground = isDarkMode
    ? "#0f2a43"
    : lighten(theme.palette.primary.light, 0.82);
  const headerTextColor = isDarkMode
    ? "#dceefb"
    : theme.palette.text.primary;
  const footerBackground = isDarkMode
    ? alpha(theme.palette.common.white, 0.04)
    : alpha(theme.palette.primary.main, 0.035);
  const footerBorderColor = isDarkMode
    ? alpha(theme.palette.common.white, 0.12)
    : alpha(theme.palette.primary.main, 0.12);
  const rowHoverBackground = isDarkMode
    ? alpha(theme.palette.primary.light, 0.08)
    : alpha(theme.palette.primary.main, 0.06);
  const stickyCellBackground = theme.palette.background.paper;
  const stickyHoverBackground = isDarkMode
    ? lighten(theme.palette.background.paper, 0.04)
    : darken(theme.palette.background.paper, 0.03);
  const headerCellSx = {
    backgroundColor: headerBackground,
    color: headerTextColor,
  } as const;
  const bodyCellBorderSx = {
    borderBottom: "1px solid",
    borderColor: "divider",
  } as const;
  const stickyBoundaryColor = isDarkMode
    ? alpha(theme.palette.common.white, 0.08)
    : alpha(theme.palette.primary.main, 0.12);
  const tableRadius = 2;
  const verticalHeaderSentinelRef = React.useRef<HTMLDivElement | null>(null);
  const verticalHeaderRef = React.useRef<HTMLDivElement | null>(null);
  const [isVerticalHeaderSticky, setIsVerticalHeaderSticky] = React.useState(false);
  const rowElementsRef = React.useRef(new Map<string, HTMLElement>());
  const previousRowRectsRef = React.useRef(new Map<string, DOMRect>());
  const verticalHeaderTopRadius = isVerticalHeaderSticky
    ? 0
    : Number(theme.shape.borderRadius) * tableRadius;
  const verticalHeaderTopOffset = isVerticalHeaderSticky
    ? `calc(${stickyTopOffset}px - ${theme.spacing(2)})`
    : stickyTopOffset;

  React.useEffect(() => {
    if (view !== "vertical" || !stickyHeader) {
      setIsVerticalHeaderSticky(false);
      return;
    }

    let rafId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const scrollContainer = getNearestScrollContainer(verticalHeaderRef.current);

    const measure = () => {
      rafId = null;
      const sentinelEl = verticalHeaderSentinelRef.current;
      if (!sentinelEl) {
        setIsVerticalHeaderSticky(false);
        return;
      }

      const scrollTop = getScrollTop(scrollContainer);
      const stickyStart = getElementTopInScrollContainer(sentinelEl, scrollContainer) - stickyTopOffset;
      setIsVerticalHeaderSticky(scrollTop > stickyStart + 0.5);
    };
    const scheduleMeasure = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(measure);
    };

    measure();
    scrollContainer.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure);
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(scheduleMeasure);
      if (scrollContainer instanceof Window) {
        resizeObserver.observe(document.documentElement);
      } else {
        resizeObserver.observe(scrollContainer);
      }
    }

    return () => {
      if (rafId != null) {
        window.cancelAnimationFrame(rafId);
      }
      scrollContainer.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
      resizeObserver?.disconnect();
    };
  }, [stickyHeader, stickyTopOffset, view]);

  const handleRowClick = React.useCallback((row: T) => {
    onRowClick?.(row);
  }, [onRowClick]);

  const stopRowClick = React.useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  const actionButtons = React.useMemo(() => {
    const actions: Array<{
      key: string;
      label: React.ReactNode;
      icon: React.ReactNode;
      color?: "inherit" | "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning";
      sx?: Record<string, unknown>;
      visible?: (row: T) => boolean;
      disabled?: (row: T) => boolean;
      onClick?: (row: T) => void | Promise<void>;
    }> = [];

    if (onView) {
      actions.push({
        key: "view",
        label: "View",
        icon: <VisibilityRoundedIcon fontSize="small" />,
        onClick: onView,
      });
    }

    if (onEdit) {
      actions.push({
        key: "edit",
        label: "Edit",
        icon: <EditRoundedIcon fontSize="small" />,
        visible: canEdit,
        onClick: onEdit,
        sx: {
          color: "#1976D2",
          "&:hover": {
            backgroundColor: alpha("#1976D2", 0.1),
          },
        },
      });
    }

    rowActions.forEach((action) => {
      actions.push({
        key: action.key,
        label: resolveLocalizedText(action.label, t),
        icon: action.icon,
        color: action.color,
        sx: action.sx as Record<string, unknown> | undefined,
        visible: action.visible,
        disabled: action.disabled,
        onClick: action.onClick,
      });
    });

    if (onDelete) {
      actions.push({
        key: "delete",
        label: "Delete",
        icon: <DeleteRoundedIcon fontSize="small" />,
        color: "error",
        visible: canDelete,
        onClick: onDelete,
      });
    }

    return actions;
  }, [canDelete, canEdit, onDelete, onEdit, onView, rowActions, t]);

  const renderActionButtons = React.useCallback((row?: T) => (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
      {actionButtons
        .filter((action) => !row || !action.visible || action.visible(row))
        .map((action) => {
        const disabled = !!(row && action.disabled?.(row));
        const button = (
          <IconButton
            size="small"
            tabIndex={row ? undefined : -1}
            color={action.color}
            disabled={disabled}
            onClick={row ? (event) => {
              stopRowClick(event);
              if (disabled) return;
              void action.onClick?.(row);
            } : undefined}
            sx={action.sx}
          >
            {action.icon}
          </IconButton>
        );

        if (!row) return <React.Fragment key={action.key}>{button}</React.Fragment>;

        return (
          <Tooltip key={action.key} title={action.label}>
            {button}
          </Tooltip>
        );
      })}
    </Stack>
  ), [actionButtons, stopRowClick]);

  const getRowA11yProps = React.useCallback((row: T) => {
    if (!isClickableRow) return {};
    return {
      tabIndex: 0,
      onClick: () => handleRowClick(row),
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleRowClick(row);
        }
      },
    };
  }, [handleRowClick, isClickableRow]);

  const registerRowElement = React.useCallback((rowId: string) => (node: HTMLElement | null) => {
    if (node) {
      rowElementsRef.current.set(rowId, node);
      return;
    }
    rowElementsRef.current.delete(rowId);
  }, []);


  // ==== sort state (uncontrolled for client-side) ====
  const [orderBy, setOrderBy] = React.useState<string | null>(controlledSortBy ?? null);
  const [order, setOrder] = React.useState<SortDir>(controlledSortDir ?? "asc");

  // sync controlled
  React.useEffect(() => {
    if (controlledSortBy !== undefined) setOrderBy(controlledSortBy);
  }, [controlledSortBy]);
  React.useEffect(() => {
    if (controlledSortDir !== undefined) setOrder(controlledSortDir);
  }, [controlledSortDir]);

  const handleSortClick = (col: ColumnDef<T>) => {
    let key = String(col.key);
    key = camelToSnake(key)
    let nextDir: SortDir = "asc";
    if ((controlledSortBy ?? orderBy) === key) {
      nextDir = (controlledSortDir ?? order) === "asc" ? "desc" : "asc";
    }
    if (onSortChange) {
      onSortChange(key, nextDir); // server-side
    } else {
      setOrderBy(key);
      setOrder(nextDir);
    }
  };

  // ==== actions column as first (sticky-left) ====
  const hasActions = actionButtons.length > 0;
  const enableDnd = typeof onReorder === "function";
  const dndWidth = 48;
  const [actionsMeasuredWidth, setActionsMeasuredWidth] = React.useState(0);
  const actionsHeaderRef = React.useRef<HTMLDivElement | null>(null);
  const baseLeftOffset = (enableDnd ? dndWidth : 0) + (hasActions ? actionsMeasuredWidth : 0);

  const baseGridTemplateColumns = React.useMemo(() => {
    const parts: string[] = [];
    if (enableDnd) parts.push(`${dndWidth}px`);
    if (hasActions) parts.push("max-content");
    columns.forEach((c) => {
      if (typeof c.width === "number") {
        parts.push(`${c.width}px`);
      } else if (typeof c.width === "string") {
        parts.push(c.width);
      } else {
        parts.push("minmax(160px,1fr)");
      }
    });
    return parts.join(" ");
  }, [columns, enableDnd, hasActions]);

  const [syncedGridTemplateColumns, setSyncedGridTemplateColumns] = React.useState(baseGridTemplateColumns);
  const [measuredColumnWidths, setMeasuredColumnWidths] = React.useState<number[] | null>(null);
  const headerRowRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setSyncedGridTemplateColumns(baseGridTemplateColumns);
  }, [baseGridTemplateColumns]);

  React.useLayoutEffect(() => {
    const headerEl = headerRowRef.current;
    if (!headerEl) return;

    const measure = () => {
      const cells = Array.from(headerEl.children) as HTMLElement[];
      if (!cells.length) return;

      const widths = cells.map((el) => Math.round(el.getBoundingClientRect().width));
      if (!widths.length || widths.some((w) => w === 0)) return;

      const template = widths.map((w) => `${w}px`).join(" ");
      setSyncedGridTemplateColumns((prev) => (prev !== template ? template : prev));

      const startIdx = (enableDnd ? 1 : 0) + (hasActions ? 1 : 0);
      const colWidths = widths.slice(startIdx, startIdx + columns.length);
      setMeasuredColumnWidths((prev) => {
        if (prev && prev.length === colWidths.length && prev.every((v, i) => v === colWidths[i])) {
          return prev;
        }
        return colWidths;
      });
    };

    measure();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => measure());
      observer.observe(headerEl);
      return () => observer.disconnect();
    }
  }, [columns, enableDnd, hasActions]);

  React.useLayoutEffect(() => {
    if (!hasActions) {
      setActionsMeasuredWidth(0);
      return;
    }
    const headerEl = actionsHeaderRef.current;
    if (!headerEl) return;

    const measure = () => {
      const next = Math.round(headerEl.getBoundingClientRect().width);
      if (!next) return;
      setActionsMeasuredWidth((prev) => (prev === next ? prev : next));
    };

    measure();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => measure());
      observer.observe(headerEl);
      return () => observer.disconnect();
    }
  }, [actionButtons.length, hasActions]);

  const resolveColWidth = React.useCallback(
    (col: ColumnDef<T>, idx: number) => {
      const measured = measuredColumnWidths?.[idx];
      if (typeof measured === "number" && measured > 0) return measured;

      if (typeof col.width === "number") return col.width;
      if (typeof col.width === "string") {
        const pxMatch = col.width.match(/([\d.]+)px/);
        if (pxMatch) return parseFloat(pxMatch[1]);
        const numeric = Number(col.width);
        if (!Number.isNaN(numeric)) return numeric;
      }
      return 0;
    },
    [measuredColumnWidths]
  );

  // ==== compute sticky offsets ====
  const { leftOffsets, rightOffsets } = React.useMemo(() => {
    const nextLeftOffsets: number[] = [];
    const nextRightOffsets: number[] = [];
    let acc = 0;
    columns.forEach((c, i) => {
      if (c.stickyLeft) {
        const w = resolveColWidth(c, i);
        nextLeftOffsets[i] = acc;
        acc += isNaN(w) ? 0 : w;
      }
    });
    acc = 0;
    for (let i = columns.length - 1; i >= 0; i--) {
      const c = columns[i];
      if (c.stickyRight) {
        const w = resolveColWidth(c, i);
        nextRightOffsets[i] = acc;
        acc += isNaN(w) ? 0 : w;
      }
    }
    return { leftOffsets: nextLeftOffsets, rightOffsets: nextRightOffsets };
  }, [columns, resolveColWidth]);

  const gridTemplateColumns = syncedGridTemplateColumns ?? baseGridTemplateColumns;

  const totalColumns = columns.length + (hasActions ? 1 : 0) + (enableDnd ? 1 : 0);

  // ==== client-side sorted rows (only when onSortChange is not provided) ====
  const sortedRows = React.useMemo(() => {
    if (onSortChange || !orderBy) return rows;
    const col = columns.find(c => String(c.key) === orderBy);
    if (!col || (!col.sortable && !col.comparator && !col.accessor)) return rows;
    const arr = [...rows];
    const cmp = col.comparator
      ? (a: T, b: T) => col.comparator!(a, b)
      : (a: T, b: T) => defaultCompare(getCellValue(a, col), getCellValue(b, col));
    arr.sort((a, b) => (order === "asc" ? cmp(a, b) : -cmp(a, b)));
    return arr;
  }, [rows, orderBy, order, onSortChange, columns]);

  // ==== DnD rows ====
  const [dndRows, setDndRows] = React.useState(sortedRows);
  React.useEffect(() => {
    if (enableDnd) {
      setDndRows(sortedRows);
    }
  }, [sortedRows, enableDnd]);

  const displayRows = enableDnd ? dndRows : sortedRows;

  const rowIds = React.useMemo(
    () => displayRows.map((r, idx) => getRenderRowID(r, idx)),
    [displayRows]
  );

  React.useLayoutEffect(() => {
    const reduceMotion = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const nextRects = new Map<string, DOMRect>();

    rowIds.forEach((rowId) => {
      const element = rowElementsRef.current.get(rowId);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      nextRects.set(rowId, rect);

      const previousRect = previousRowRectsRef.current.get(rowId);
      if (!previousRect || reduceMotion) return;

      const deltaX = previousRect.left - rect.left;
      const deltaY = previousRect.top - rect.top;
      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return;

      element.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px)` },
          { transform: "translate(0, 0)" },
        ],
        {
          duration: 220,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
        },
      );
    });

    previousRowRectsRef.current = nextRects;
  }, [rowIds, view]);

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      if (!enableDnd) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = rowIds.indexOf(String(active.id));
      const newIndex = rowIds.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;
      const newRows = arrayMove(dndRows, oldIndex, newIndex);
      setDndRows(newRows);
      const offset = (page - 1) * pageSize;
      onReorder?.(newRows, oldIndex + offset, newIndex + offset);
    },
    [enableDnd, rowIds, dndRows, onReorder, page, pageSize]
  );

  // ==== renderers for types ====
  const renderCell = React.useCallback((row: T, col: ColumnDef<T>) => {
    if (col.render) return col.render(row);

    const val = getCellValue(row, col);

    switch (col.type) {
      case "color": {
        // string hoặc { color: '#FFF', text?: 'Trắng' }
        let color = "";
        let text = "";
        if (typeof val === "string") {
          color = val;
          text = val; // fallback hiển thị mã màu
        } else if (val && typeof val === "object") {
          const v: any = val;
          color = String(v.color ?? "");
          text = String(v.text ?? v.color ?? "");
        }
        const txtColor = getContrastText(color);
        return (
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              px: 1,
              py: 0.25,
              borderRadius: 1,
              bgcolor: color || "transparent",
              color: color ? txtColor : "text.primary",
              border: "1px solid",
              borderColor: "divider",
              fontSize: 12,
              minHeight: 24,
            }}
          >
            {text}
          </Box>
        );
      }

      case "image": {
        const src = String(val ?? "");
        return <ImageCell src={src} shape={col.shape} />;
      }

      case "link": {
        const url = typeof col.url === "function" ? col.url(row) : col.url;
        const label = val == null || val === "" ? url ?? "" : val;
        const tooltip = typeof label === "string" ? label : typeof url === "string" ? url : undefined;
        return (
          <TruncatedCell
            content={<LinkCell label={label as React.ReactNode} url={url} />}
            tooltip={tooltip}
          />
        );
      }

      case "chips": {
        // Hỗ trợ:
        // - string[] 
        // - number[]
        // - string (có thể dạng "a,b,c" hoặc "a|b|c")
        // - number
        // - object { color?: string; text: string }
        // - array mix
        const toItems = (
          v: any
        ): Array<string | { color?: string; text: string }> => {
          if (Array.isArray(v)) return v as any[];

          if (v == null) return [];

          // object dạng { text, color }
          if (typeof v === "object" && "text" in v) return [v];

          // string: hỗ trợ tách bằng "," hoặc "|"
          if (typeof v === "string") {
            // Trim và split theo , hoặc |
            const parts = v
              .split(/[,|]/g)
              .map((s) => s.trim())
              .filter(Boolean); // loại bỏ rỗng
            return parts;
          }

          // number → convert to string
          if (typeof v === "number") return [String(v)];

          // fallback
          return [String(v)];
        };

        const items = toItems(val);

        return (
          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            {items.map((it, idx) => {
              if (typeof it === "string") {
                return <Chip key={idx} size="small" label={it} />;
              }

              // { color?: string; text: string }
              const bg = it.color ?? "";
              const fg = bg ? getContrastText(bg) : undefined;

              return (
                <Chip
                  key={idx}
                  size="small"
                  label={it.text}
                  sx={{
                    bgcolor: bg || undefined,
                    color: fg,
                    border: "1px solid",
                    borderColor: "divider",
                    "& .MuiChip-label": { px: 1 },
                  }}
                />
              );
            })}
          </Stack>
        );
      }


      case "qr": {
        const s = col.qr?.size ?? 64;
        const tooltipS = col.qr?.tooltipSize ?? 200;
        const level = col.qr?.level ?? "M";
        const fg = col.qr?.fgColor;
        const bg = col.qr?.bgColor;
        const v = String(val ?? "");
        if (!v) return null;
        return <QRCell value={v} size={s} tooltipSize={tooltipS} level={level} fgColor={fg} bgColor={bg} />;
      }

      case "boolean": {
        const v = Boolean(val);
        if (!v) return null;
        return (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckRoundedIcon fontSize="small" color="success" />
          </Box>
        );
      }

      case "date":
        return <TruncatedCell content={formatDate(val)} tooltip={formatDate(val)} />;
      case "datetime":
        return <TruncatedCell content={formatDateTime(val)} tooltip={formatDateTime(val)} />;
      case "currency":
        return (
          <TruncatedCell
            tooltip={String(val ?? "")}
            content={
          <NumericFormat
            value={String(val ?? "")}
            displayType="text"
            thousandSeparator={true}
            prefix={'đ '}
            readOnly={true}
          />
            }
          />
        );
      case "number":
        return (
          <TruncatedCell
            tooltip={String(val ?? "")}
            content={
          <NumericFormat
            value={String(val ?? "")}
            displayType="text"
            thousandSeparator={true}
            readOnly={true}
          />
            }
          />
        );
      case "text":
      default:
        return <TruncatedCell content={val as string} tooltip={String(val ?? "")} />;
    }
  }, []);

  const getColumnHeader = React.useCallback((col: ColumnDef<T>) => {
    return resolveLocalizedText(col.header, t) || String(col.key);
  }, [t]);

  const titleColumn = React.useMemo(
    () => columns.find((col) => col.labelField) ?? columns[0],
    [columns]
  );
  const summaryColumns = React.useMemo(
    () => columns
      .filter((col) => col !== titleColumn)
      .filter((col) => col.type === "color" || String(col.key) === "riskBucket")
      .slice(0, 3),
    [columns, titleColumn]
  );
  const detailColumns = React.useMemo(
    () => columns.filter((col) => col !== titleColumn && !summaryColumns.includes(col)),
    [columns, summaryColumns, titleColumn]
  );
  const verticalDetailGroups = React.useMemo<VerticalDetailGroup[] | null>(() => {
    if (!detailColumns.some((col) => col.verticalGroup)) return null;

    const groups: VerticalDetailGroup[] = [];
    const groupIndex = new Map<string, VerticalDetailGroup>();

    for (const col of detailColumns) {
      const resolvedGroup = resolveLocalizedText(col.verticalGroup, t);
      const key = resolvedGroup || "__ungrouped";
      let group = groupIndex.get(key);

      if (!group) {
        group = {
          key,
          label: resolvedGroup || null,
          order: col.verticalGroupOrder ?? Number.MAX_SAFE_INTEGER,
          columns: [],
        };
        groupIndex.set(key, group);
        groups.push(group);
      } else if (col.verticalGroupOrder != null && col.verticalGroupOrder < group.order) {
        group.order = col.verticalGroupOrder;
      }

      group.columns.push(col as unknown as RenderColumn);
    }

    groups.sort((a, b) => a.order - b.order);

    for (const group of groups) {
      group.columns.sort((a, b) => {
        const aOrder = a.verticalOrder ?? Number.MAX_SAFE_INTEGER;
        const bOrder = b.verticalOrder ?? Number.MAX_SAFE_INTEGER;
        return aOrder - bOrder;
      });
    }

    return groups;
  }, [detailColumns, t]);

  const renderPagination = () => {
    if (hidePagination) return null;

    return (
      <Box
        sx={{
          px: 1.5,
          py: 0.5,
          borderTop: "1px solid",
          borderColor: footerBorderColor,
          backgroundColor: footerBackground,
        }}
      >
        <TablePagination
          component="div"
          count={total ?? -1}
          page={page - 1}
          onPageChange={(_, p) => onPageChange(p + 1)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) =>
            onPageSizeChange?.(parseInt(e.target.value, 10))
          }
          rowsPerPageOptions={[10, 20, 50, 100]}
          sx={{
            color: "text.secondary",
            "& .MuiTablePagination-toolbar": {
              minHeight: 52,
              px: 0.5,
              gap: 1,
            },
            "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
              color: "text.secondary",
              fontSize: theme.typography.body2.fontSize,
              fontWeight: 500,
            },
            "& .MuiTablePagination-select": {
              borderRadius: 1,
              fontWeight: 600,
            },
            "& .MuiTablePagination-actions .MuiIconButton-root": {
              borderRadius: 1.5,
            },
          }}
        />
      </Box>
    );
  };

  if (view === "vertical") {
    const sortableColumns = columns.filter((col) => !!col.sortable || !!col.accessor || !!col.comparator);

    return (
      <Paper
        variant="outlined"
        sx={{
          borderRadius: tableRadius,
          borderTopLeftRadius: verticalHeaderTopRadius,
          borderTopRightRadius: verticalHeaderTopRadius,
          overflow: stickyHeader ? "visible" : "hidden",
        }}
      >
        <Box ref={verticalHeaderSentinelRef} sx={{ height: 0 }} />
        <Box
          ref={verticalHeaderRef}
          sx={{
            px: 1.5,
            py: 1,
            position: stickyHeader ? "sticky" : "static",
            top: stickyHeader ? verticalHeaderTopOffset : undefined,
            zIndex: 4,
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
            backgroundColor: headerBackground,
            color: headerTextColor,
            borderBottom: "1px solid",
            borderColor: stickyBoundaryColor,
            borderTopLeftRadius: verticalHeaderTopRadius,
            borderTopRightRadius: verticalHeaderTopRadius,
            overflow: "hidden",
            boxShadow: isVerticalHeaderSticky ? theme.shadows[2] : "none",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Sắp xếp:
            </Typography>
            {sortableColumns.map((col) => {
              const key = camelToSnake(String(col.key));
              const active = (controlledSortBy ?? orderBy) === key;
              const direction = active ? ((controlledSortDir ?? order) ?? "asc") : "asc";

              return (
                <Button
                  key={String(col.key)}
                  size="small"
                  variant={active ? "contained" : "outlined"}
                  color={active ? "primary" : "inherit"}
                  onClick={() => handleSortClick(col)}
                  endIcon={
                    active ? (
                      <Box component="span" sx={{ fontSize: 12, lineHeight: 1 }}>
                        {direction === "asc" ? "↑" : "↓"}
                      </Box>
                    ) : null
                  }
                  sx={{
                    minHeight: 30,
                    textTransform: "none",
                    borderRadius: 1,
                    bgcolor: active ? undefined : "background.paper",
                  }}
                >
                  {getColumnHeader(col)}
                </Button>
              );
            })}
          </Stack>
          {isVerticalHeaderSticky && verticalHeaderExtra ? (
            <Box sx={{ flexShrink: 0, ml: "auto" }}>
              {verticalHeaderExtra}
            </Box>
          ) : null}
        </Box>

        <Box sx={{ bgcolor: "background.default" }}>
          {loading ? (
            <Box sx={{ height: 48, display: "flex", alignItems: "center", justifyContent: "center", px: 2 }}>
              Đang tải…
            </Box>
          ) : error ? (
            <Box sx={{ minHeight: 56, display: "flex", alignItems: "center", justifyContent: "center", px: 2, color: "error.main" }}>
              {error}
            </Box>
          ) : sortedRows.length === 0 ? (
            <Box sx={{ height: 48, display: "flex", alignItems: "center", justifyContent: "center", px: 2 }}>
              {t("admin.general.no_data", "Không có dữ liệu")}
            </Box>
          ) : (
            <Stack spacing={1.25} sx={{ p: 1.5 }}>
              {sortedRows.map((row, rowIdx) => {
                const rowId = getRenderRowID(row, rowIdx);
                return (
                  <MemoVerticalBodyRow
                    key={rowId}
                    row={row as unknown as RenderRow}
                    rowId={rowId}
                    titleColumn={titleColumn as unknown as RenderColumn}
                    summaryColumns={summaryColumns as unknown as RenderColumn[]}
                    detailColumns={detailColumns as unknown as RenderColumn[]}
                    detailGroups={verticalDetailGroups}
                    hasActions={hasActions}
                    isClickableRow={isClickableRow}
                    rowHoverBackground={rowHoverBackground}
                    fontSize={theme.typography.body2.fontSize}
                    renderActionButtons={renderActionButtons as unknown as (row?: RenderRow) => React.ReactNode}
                    renderCell={renderCell as unknown as (row: RenderRow, col: RenderColumn) => React.ReactNode}
                    getColumnHeader={getColumnHeader as unknown as (col: RenderColumn) => string}
                    getRowA11yProps={getRowA11yProps as unknown as (row: RenderRow) => Record<string, unknown>}
                    stopRowClick={stopRowClick}
                    registerRowElement={registerRowElement}
                  />
                );
              })}
            </Stack>
          )}
        </Box>

        {renderPagination()}
      </Paper>
    );
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: tableRadius,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          overflow: "auto",
          maxHeight: stickyHeader ? 560 : "unset",
        }}
      >
        <Box sx={{ minWidth: "100%" }}>
          <Box
            role="row"
            ref={headerRowRef}
            sx={{
              display: "grid",
              gridTemplateColumns,
              position: stickyHeader ? "sticky" : "static",
              top: stickyHeader ? stickyTopOffset : undefined,
              zIndex: 4,
              alignItems: "stretch",
            }}
          >
            {enableDnd && (
              <Box
                role="columnheader"
                data-sticky="true"
                sx={{
                  position: "sticky",
                  left: 0,
                  zIndex: STICKY_Z_INDEX.dnd,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  alignSelf: "stretch",
                  px: 1,
                  py: dense ? 1.125 : 1.375,
                  ...headerCellSx,
                  width: dndWidth,
                  minWidth: dndWidth,
                }}
              />
            )}

            {hasActions && (
              <Box
                role="columnheader"
                data-sticky="true"
                ref={actionsHeaderRef}
                sx={{
                  position: "sticky",
                  left: enableDnd ? dndWidth : 0,
                  zIndex: STICKY_Z_INDEX.actions,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  alignSelf: "stretch",
                  px: 1.5,
                  py: dense ? 1.125 : 1.375,
                  ...headerCellSx,
                  whiteSpace: "nowrap",
                  borderRight: "1px solid",
                  borderRightColor: stickyBoundaryColor,
                }}
              >
                <Box sx={{ visibility: "hidden", pointerEvents: "none" }}>
                  {renderActionButtons()}
                </Box>
              </Box>
            )}

            {columns.map((c, idx) => {
              const k = String(c.key);
              const sortable = !!c.sortable || !!c.accessor || !!c.comparator;
              const isActive = (controlledSortBy ?? orderBy) === k;
              const dir = (controlledSortDir ?? order) ?? "asc";
              const headerLabel = resolveLocalizedText(c.header, t);
              const headerContent = (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  {c.headerIcon ? (
                    <Box
                      component="span"
                      sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    >
                      {c.headerIcon}
                    </Box>
                  ) : null}
                  {c.hideHeaderLabel ? null : <span>{headerLabel}</span>}
                </Stack>
              );

              const left = c.stickyLeft ? baseLeftOffset + (leftOffsets[idx] ?? 0) : undefined;
              const right = c.stickyRight ? (rightOffsets[idx] ?? 0) : undefined;

              return (
                <Box
                  key={k}
                  role="columnheader"
                  data-sticky={c.stickyLeft || c.stickyRight ? "true" : undefined}
                  sx={{
                    position: (c.stickyLeft || c.stickyRight) ? "sticky" : "static",
                    left,
                    right,
                    zIndex: (c.stickyLeft || c.stickyRight) ? STICKY_Z_INDEX.sticky : STICKY_Z_INDEX.normal,
                    ...headerCellSx,
                    display: "flex",
                    alignItems: "center",
                    px: 1.5,
                    py: dense ? 1.125 : 1.375,
                    whiteSpace: "nowrap",
                    fontSize: theme.typography.body2.fontSize,
                    fontWeight: 600,
                    letterSpacing: 0,
                  }}
                  title={c.hideHeaderLabel ? headerLabel : undefined}
                >
                  {sortable ? (
                    <TableSortLabel
                      active={isActive}
                      direction={isActive ? dir : "asc"}
                      onClick={() => handleSortClick(c)}
                      aria-label={headerLabel || undefined}
                      sx={{
                        color: `${headerTextColor} !important`,
                        textTransform: "none",
                        fontWeight: 600,
                        "& .MuiTableSortLabel-icon": {
                          color: `${isActive ? theme.palette.primary.main : alpha(headerTextColor, 0.72)} !important`,
                        },
                      }}
                    >
                      {headerContent}
                    </TableSortLabel>
                  ) : (
                    headerContent
                  )}
                </Box>
              );
            })}
          </Box>

          {loading ? (
            <Box
              role="row"
              sx={{
                display: "grid",
                gridTemplateColumns,
              }}
            >
              <Box
                role="cell"
                sx={{
                  gridColumn: `1 / span ${totalColumns}`,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "40px",
                  textAlign: "center",
                  px: 2,
                  borderTop: "none",
                  ...bodyCellBorderSx,
                }}
              >
                Đang tải…
              </Box>
            </Box>
          ) : error ? (
            <Box
              role="row"
              sx={{
                display: "grid",
                gridTemplateColumns,
              }}
            >
              <Box
                role="cell"
                sx={{
                  gridColumn: `1 / span ${totalColumns}`,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: "56px",
                  textAlign: "center",
                  px: 2,
                  borderTop: "none",
                  ...bodyCellBorderSx,
                  color: "error.main",
                }}
              >
                {error}
              </Box>
            </Box>
          ) : sortedRows.length === 0 ? (
            <Box
              role="row"
              sx={{
                display: "grid",
                gridTemplateColumns,
              }}
            >
              <Box
                role="cell"
                sx={{
                  gridColumn: `1 / span ${totalColumns}`,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "40px",
                  textAlign: "center",
                  px: 2,
                  borderTop: "none",
                  ...bodyCellBorderSx,
                }}
              >
                {t("admin.general.no_data", "Không có dữ liệu")}
              </Box>
            </Box>
          ) : (
            (enableDnd ? (
              <DndContext onDragEnd={handleDragEnd}>
                <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
                  {displayRows.map((r, rowIdx) => {
                    const rowId = rowIds[rowIdx];
                    return (
                      <SortableRow key={rowId} id={rowId}>
                        {({ setNodeRef, transformStyle, handleProps, isDragging }) => (
                          <Box
                            role="row"
                            ref={setNodeRef}
                            {...getRowA11yProps(r)}
                            sx={{
                              display: "grid",
                              gridTemplateColumns,
                              alignItems: "stretch",
                              cursor: isClickableRow ? "pointer" : undefined,
                              "& > [role='cell']:not([data-sticky='true'])": {
                                backgroundColor: isDragging ? rowHoverBackground : undefined,
                              },
                              "&:hover > [role='cell']:not([data-sticky='true'])": {
                                backgroundColor: rowHoverBackground,
                              },
                              "& > [role='cell'][data-sticky='true']": {
                                backgroundColor: isDragging ? stickyHoverBackground : stickyCellBackground,
                              },
                              "&:hover > [role='cell'][data-sticky='true']": {
                                backgroundColor: stickyHoverBackground,
                              },
                            }}
                            style={transformStyle}
                          >
                            {/* DnD handle */}
                            <Box
                              role="cell"
                              data-sticky="true"
                              sx={{
                                position: "sticky",
                                left: 0,
                                zIndex: STICKY_Z_INDEX.dnd,
                                backgroundColor: "background.paper",
                                width: dndWidth,
                                minWidth: dndWidth,
                                px: 1,
                                py: dense ? 0.75 : 1,
                                ...bodyCellBorderSx,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <IconButton
                                size="small"
                                aria-label="Drag to reorder"
                                {...handleProps}
                                onClick={stopRowClick}
                                sx={{
                                  cursor: isDragging ? "grabbing" : "grab",
                                }}
                              >
                                <DragIndicatorRoundedIcon fontSize="small" />
                              </IconButton>
                            </Box>

                            {/* Actions cell, sticky-left */}
                            {hasActions && (
                              <Box
                                role="cell"
                                data-sticky="true"
                                sx={{
                                position: "sticky",
                                left: enableDnd ? dndWidth : 0,
                                zIndex: STICKY_Z_INDEX.actions,
                                backgroundColor: stickyCellBackground,
                                whiteSpace: "nowrap",
                                  px: 1.5,
                                  py: dense ? 0.75 : 1,
                                  ...bodyCellBorderSx,
                                  borderRight: "1px solid",
                                  borderRightColor: stickyBoundaryColor,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "flex-end",
                                }}
                              >
                                {renderActionButtons(r)}
                              </Box>
                            )}

                            {/* Columns */}
                            {columns.map((c, colIdx) => {
                              const left = c.stickyLeft ? baseLeftOffset + (leftOffsets[colIdx] ?? 0) : undefined;
                              const right = c.stickyRight ? (rightOffsets[colIdx] ?? 0) : undefined;
                              return (
                                <Box
                                  key={String(c.key)}
                                  role="cell"
                                  data-sticky={c.stickyLeft || c.stickyRight ? "true" : undefined}
                                  sx={{
                                    position: (c.stickyLeft || c.stickyRight) ? "sticky" : "static",
                                    left,
                                    right,
                                    zIndex: (c.stickyLeft || c.stickyRight) ? STICKY_Z_INDEX.sticky : STICKY_Z_INDEX.normal,
                                    backgroundColor: (c.stickyLeft || c.stickyRight) ? stickyCellBackground : undefined,
                                    whiteSpace: "nowrap",
                                    minWidth: 0,
                                    px: 1.5,
                                    py: dense ? 0.75 : 1,
                                    ...bodyCellBorderSx,
                                    display: "flex",
                                    alignItems: "center",
                                    fontSize: theme.typography.body2.fontSize,
                                    lineHeight: 1.35,
                                  }}
                                >
                                  {renderCell(r, c)}
                                </Box>
                              );
                            })}
                          </Box>
                        )}
                      </SortableRow>
                    );
                  })}
                </SortableContext>
              </DndContext>
            ) : (
              sortedRows.map((r, rowIdx) => {
                const rowId = getRenderRowID(r, rowIdx);
                return (
                  <MemoTableBodyRow
                    key={rowId}
                    row={r as unknown as RenderRow}
                    rowId={rowId}
                    columns={columns as unknown as RenderColumn[]}
                    gridTemplateColumns={gridTemplateColumns}
                    hasActions={hasActions}
                    baseLeftOffset={baseLeftOffset}
                    leftOffsets={leftOffsets}
                    rightOffsets={rightOffsets}
                    dense={dense}
                    isClickableRow={isClickableRow}
                    rowHoverBackground={rowHoverBackground}
                    stickyCellBackground={stickyCellBackground}
                    stickyHoverBackground={stickyHoverBackground}
                    stickyBoundaryColor={stickyBoundaryColor}
                    bodyCellBorderSx={bodyCellBorderSx}
                    fontSize={theme.typography.body2.fontSize}
                    renderActionButtons={renderActionButtons as unknown as (row?: RenderRow) => React.ReactNode}
                    renderCell={renderCell as unknown as (row: RenderRow, col: RenderColumn) => React.ReactNode}
                    getRowA11yProps={getRowA11yProps as unknown as (row: RenderRow) => Record<string, unknown>}
                    registerRowElement={registerRowElement}
                  />
                );
              })
            ))
          )}
        </Box>
      </Box>

      {renderPagination()}
    </Paper>
  );
}
