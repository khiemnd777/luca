import React from "react";
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { SectionCard } from "@shared/components/ui/section-card";
import type {
  ProductionPlanningBottleneck,
  ProductionPlanningConfig,
  ProductionPlanningOverview,
  ProductionPlanningRecommendation,
  ProductionPlanningRiskItem,
} from "../model/dashboard.model";
import { formatDateTime12 } from "@root/shared/utils/datetime.utils";
import { formatPlanningMinutes, planningRiskColor, planningRiskLabel } from "@root/shared/utils/order.utils";
import { navigate } from "@root/core/navigation/navigate";
import { applyProductionPlanningRecommendation, saveProductionPlanningConfig } from "../api/dashboard.api";
import { invalidate } from "@root/core/hooks/use-async";
import { hasAnyPermissions } from "@root/core/auth/rbac-utils";
import { OrderCodeText } from "@features/order/components/order-code-text.component";

type Props = {
  overview: ProductionPlanningOverview | null;
  loading?: boolean;
};

const RISK_ITEM_LIMIT = 6;
const BOTTLENECK_LIMIT = 5;
const RECOMMENDATION_LIMIT = 3;
const EMPTY_RISK_ITEMS: ProductionPlanningRiskItem[] = [];
const EMPTY_BOTTLENECKS: ProductionPlanningBottleneck[] = [];
const EMPTY_RECOMMENDATIONS: ProductionPlanningRecommendation[] = [];

export function ProductionPlanningOverviewCard({ overview, loading }: Props) {
  const [applyingId, setApplyingId] = React.useState<string | null>(null);
  const [configOpen, setConfigOpen] = React.useState(false);
  const [draftConfig, setDraftConfig] = React.useState<ProductionPlanningConfig | null>(null);
  const [savingConfig, setSavingConfig] = React.useState(false);
  const [, tick] = React.useReducer((v) => v + 1, 0);

  React.useEffect(() => {
    const timer = window.setInterval(() => tick(), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const applyRecommendation = React.useCallback(async (recommendation: ProductionPlanningRecommendation) => {
    setApplyingId(recommendation.id);
    try {
      await applyProductionPlanningRecommendation(recommendation.id);
      invalidate("dashboard:production-planning");
    } finally {
      setApplyingId(null);
    }
  }, []);

  const summary = overview?.summary;
  const riskItems = overview?.riskItems ?? EMPTY_RISK_ITEMS;
  const visibleRiskItems = React.useMemo(
    () => riskItems.slice(0, RISK_ITEM_LIMIT),
    [riskItems],
  );
  const bottlenecks = overview?.bottlenecks ?? EMPTY_BOTTLENECKS;
  const visibleBottlenecks = React.useMemo(
    () => bottlenecks.slice(0, BOTTLENECK_LIMIT),
    [bottlenecks],
  );
  const recommendations = overview?.recommendations ?? EMPTY_RECOMMENDATIONS;
  const visibleRecommendations = React.useMemo(
    () => recommendations.slice(0, RECOMMENDATION_LIMIT),
    [recommendations],
  );
  const canManage = hasAnyPermissions("production_planning.manage");

  const openConfig = () => {
    setDraftConfig(overview?.config ?? null);
    setConfigOpen(true);
  };

  const saveConfig = async () => {
    if (!draftConfig) return;
    setSavingConfig(true);
    try {
      await saveProductionPlanningConfig(draftConfig);
      invalidate("dashboard:production-planning");
      setConfigOpen(false);
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <SectionCard
      title="Điều hành sản xuất"
      extra={
        <>
          {loading ? <Chip size="small" label="Đang cập nhật" /> : null}
          {canManage ? <Button size="small" variant="outlined" onClick={openConfig}>Cấu hình</Button> : null}
        </>
      }
    >
      <Stack spacing={2}>
        {overview && !overview.config.configComplete ? (
          <Alert severity="warning">
            Chưa cấu hình duration/capacity sản xuất. Hệ thống vẫn hiển thị đơn sắp trễ, nhưng ETA dự báo chưa được kích hoạt.
          </Alert>
        ) : null}

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <MetricChip label="Trễ" value={summary?.overdue ?? 0} color="error" />
          <MetricChip label="<= 2h" value={summary?.due2h ?? 0} color="error" />
          <MetricChip label="<= 4h" value={summary?.due4h ?? 0} color="warning" />
          <MetricChip label="<= 6h" value={summary?.due6h ?? 0} color="warning" />
          <MetricChip label="Dự báo trễ" value={summary?.predictedLate ?? 0} color="secondary" />
          <MetricChip label="Có thể điều phối" value={summary?.recoverable ?? 0} color="success" />
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" fontWeight={700}>Top rủi ro</Typography>
          {riskItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Chưa có dữ liệu rủi ro sản xuất.</Typography>
          ) : (
            <RiskItemList items={visibleRiskItems} />
          )}
        </Stack>

        <Divider />

        <Stack spacing={1}>
          <Typography variant="subtitle2" fontWeight={700}>Bottleneck</Typography>
          <BottleneckList items={visibleBottlenecks} />
        </Stack>

        {recommendations.length > 0 ? (
          <>
            <Divider />
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={700}>Đề xuất điều phối</Typography>
              <RecommendationList
                applyingId={applyingId}
                items={visibleRecommendations}
                onApply={applyRecommendation}
              />
            </Stack>
          </>
        ) : null}
      </Stack>

      <Dialog open={configOpen} onClose={() => setConfigOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Cấu hình kế hoạch sản xuất</DialogTitle>
        <DialogContent dividers>
          {draftConfig ? (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="body2">Kích hoạt planning engine</Typography>
                <Switch
                  checked={draftConfig.enabled}
                  onChange={(_, checked) => setDraftConfig({ ...draftConfig, enabled: checked })}
                />
              </Stack>
              <TextField
                size="small"
                type="number"
                label="Thời lượng mặc định mỗi công đoạn (phút)"
                value={draftConfig.defaultDurationMin ?? 0}
                onChange={(event) => setDraftConfig({
                  ...draftConfig,
                  defaultDurationMin: Math.max(0, Number(event.target.value) || 0),
                })}
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Giờ bắt đầu"
                  value={draftConfig.businessHours.startHour}
                  onChange={(event) => setDraftConfig({
                    ...draftConfig,
                    businessHours: {
                      ...draftConfig.businessHours,
                      startHour: Math.max(0, Math.min(23, Number(event.target.value) || 0)),
                    },
                  })}
                />
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Giờ kết thúc"
                  value={draftConfig.businessHours.endHour}
                  onChange={(event) => setDraftConfig({
                    ...draftConfig,
                    businessHours: {
                      ...draftConfig.businessHours,
                      endHour: Math.max(1, Math.min(24, Number(event.target.value) || 1)),
                    },
                  })}
                />
              </Stack>
              <Alert severity="info">
                Bản đầu dùng duration mặc định và business hours để kích hoạt ETA. Duration/capacity chi tiết theo process/section có thể cập nhật qua API config.
              </Alert>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigOpen(false)}>Hủy</Button>
          <Button variant="contained" disabled={savingConfig || !draftConfig} onClick={saveConfig}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>
    </SectionCard>
  );
}

function MetricChip({ label, value, color }: { label: string; value: number; color: "error" | "warning" | "success" | "secondary" }) {
  return <Chip size="small" color={color} label={`${label}: ${value}`} />;
}

function useFlipListAnimation(rowIds: string[]) {
  const rowElementsRef = React.useRef(new Map<string, HTMLElement>());
  const previousRowRectsRef = React.useRef(new Map<string, DOMRect>());

  React.useLayoutEffect(() => {
    const reduceMotion = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const currentRowIds = new Set(rowIds);
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
    rowElementsRef.current.forEach((_, rowId) => {
      if (!currentRowIds.has(rowId)) {
        rowElementsRef.current.delete(rowId);
      }
    });
  }, [rowIds]);

  return React.useCallback((rowId: string) => (element: HTMLElement | null) => {
    if (element) {
      rowElementsRef.current.set(rowId, element);
    } else {
      rowElementsRef.current.delete(rowId);
    }
  }, []);
}

function riskItemKey(item: ProductionPlanningRiskItem) {
  return `${item.orderId}:${item.orderItemId}:${item.inProgressId ?? 0}`;
}

function recommendationEqual(
  previous: ProductionPlanningRecommendation,
  next: ProductionPlanningRecommendation,
) {
  return previous.id === next.id
    && previous.targetName === next.targetName
    && previous.status === next.status
    && previous.reason === next.reason;
}

function riskItemEqual(previous: ProductionPlanningRiskItem, next: ProductionPlanningRiskItem) {
  return previous.orderId === next.orderId
    && previous.orderItemId === next.orderItemId
    && previous.inProgressId === next.inProgressId
    && previous.orderCode === next.orderCode
    && previous.orderItemCode === next.orderItemCode
    && previous.processName === next.processName
    && previous.sectionName === next.sectionName
    && previous.assignedName === next.assignedName
    && previous.eta === next.eta
    && previous.deliveryAt === next.deliveryAt
    && previous.remainingMinutes === next.remainingMinutes
    && previous.riskBucket === next.riskBucket;
}

function bottleneckEqual(previous: ProductionPlanningBottleneck, next: ProductionPlanningBottleneck) {
  return previous.key === next.key
    && previous.label === next.label
    && previous.activeCount === next.activeCount
    && previous.topRiskScore === next.topRiskScore;
}

function RiskItemList({ items }: { items: ProductionPlanningRiskItem[] }) {
  const rowIds = React.useMemo(() => items.map(riskItemKey), [items]);
  const setRowElement = useFlipListAnimation(rowIds);

  return (
    <>
      {items.map((item) => {
        const rowId = riskItemKey(item);
        return (
          <Box key={rowId} ref={setRowElement(rowId)}>
            <RiskItemRow item={item} />
          </Box>
        );
      })}
    </>
  );
}

const RiskItemRow = React.memo(function RiskItemRow({ item }: { item: ProductionPlanningRiskItem }) {
  return (
    <Stack
      spacing={0.75}
      sx={(theme) => ({
        cursor: "pointer",
        mx: -1,
        px: 1,
        py: 0.75,
        borderRadius: 1,
        transition: "background-color 120ms ease",
        "&:hover": {
          bgcolor: alpha(theme.palette.primary.main, 0.06),
        },
      })}
      onClick={() => navigate(`/order/${item.orderId}`)}
    >
      <Stack direction="row" justifyContent="space-between" spacing={1}>
        <Typography variant="body2" fontWeight={700}>
          <OrderCodeText code={item.orderItemCode || item.orderCode} fallback={`#${item.orderId}`} />
        </Typography>
        <Chip
          size="small"
          label={`${planningRiskLabel(item.riskBucket)} · ${formatPlanningMinutes(item.remainingMinutes)}`}
          sx={{ bgcolor: planningRiskColor(item.riskBucket), color: "#fff" }}
        />
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {[item.sectionName, item.processName, item.assignedName].filter(Boolean).join(" • ") || "Chưa có công đoạn"}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        ETA {item.eta ? formatDateTime12(item.eta) : "chưa đủ cấu hình"} · Giao {item.deliveryAt ? formatDateTime12(item.deliveryAt) : "––"}
      </Typography>
    </Stack>
  );
}, (previous, next) => riskItemEqual(previous.item, next.item));

function BottleneckList({ items }: { items: ProductionPlanningBottleneck[] }) {
  const rowIds = React.useMemo(() => items.map((item) => item.key), [items]);
  const setRowElement = useFlipListAnimation(rowIds);

  return (
    <>
      {items.map((item) => (
        <Box key={item.key} ref={setRowElement(item.key)}>
          <BottleneckRow item={item} />
        </Box>
      ))}
    </>
  );
}

const BottleneckRow = React.memo(function BottleneckRow({ item }: { item: ProductionPlanningBottleneck }) {
  const progressColor = item.topRiskScore >= 80 ? "error" : item.topRiskScore >= 50 ? "warning" : "primary";

  return (
    <Stack spacing={0.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
        <Typography variant="body2">{item.label}</Typography>
        <Stack direction="row" spacing={0.75} flexShrink={0}>
          <Chip size="small" variant="outlined" label={`${item.activeCount} việc`} />
          <Chip
            size="small"
            label={`risk ${item.topRiskScore}%`}
            color={progressColor}
          />
        </Stack>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, item.topRiskScore)}
        color={progressColor}
      />
    </Stack>
  );
}, (previous, next) => bottleneckEqual(previous.item, next.item));

function RecommendationList({
  applyingId,
  items,
  onApply,
}: {
  applyingId: string | null;
  items: ProductionPlanningRecommendation[];
  onApply: (item: ProductionPlanningRecommendation) => void;
}) {
  const rowIds = React.useMemo(() => items.map((item) => item.id), [items]);
  const setRowElement = useFlipListAnimation(rowIds);

  return (
    <>
      {items.map((item) => (
        <Box key={item.id} ref={setRowElement(item.id)}>
          <RecommendationRow
            applying={applyingId === item.id}
            item={item}
            onApply={onApply}
          />
        </Box>
      ))}
    </>
  );
}

const RecommendationRow = React.memo(function RecommendationRow({
  applying,
  item,
  onApply,
}: {
  applying: boolean;
  item: ProductionPlanningRecommendation;
  onApply: (item: ProductionPlanningRecommendation) => void;
}) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
      <Typography variant="body2">
        Gán cho {item.targetName}
      </Typography>
      <Button
        size="small"
        variant="outlined"
        disabled={applying}
        onClick={() => onApply(item)}
      >
        Áp dụng
      </Button>
    </Stack>
  );
}, (previous, next) => previous.applying === next.applying
  && previous.onApply === next.onApply
  && recommendationEqual(previous.item, next.item));
