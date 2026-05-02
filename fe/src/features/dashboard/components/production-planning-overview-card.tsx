import React from "react";
import {
  Alert,
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
import type { ProductionPlanningConfig, ProductionPlanningOverview, ProductionPlanningRecommendation } from "../model/dashboard.model";
import { formatDateTime12 } from "@root/shared/utils/datetime.utils";
import { formatPlanningMinutes, planningRiskColor, planningRiskLabel } from "@root/shared/utils/order.utils";
import { navigate } from "@root/core/navigation/navigate";
import { applyProductionPlanningRecommendation, saveProductionPlanningConfig } from "../api/dashboard.api";
import { invalidate } from "@root/core/hooks/use-async";
import { hasAnyPermissions } from "@root/core/auth/rbac-utils";

type Props = {
  overview: ProductionPlanningOverview | null;
  loading?: boolean;
};

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

  const applyRecommendation = async (recommendation: ProductionPlanningRecommendation) => {
    setApplyingId(recommendation.id);
    try {
      await applyProductionPlanningRecommendation(recommendation.id);
      invalidate("dashboard:production-planning");
    } finally {
      setApplyingId(null);
    }
  };

  const summary = overview?.summary;
  const items = overview?.riskItems ?? [];
  const bottlenecks = overview?.bottlenecks ?? [];
  const recommendations = overview?.recommendations ?? [];
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
          {items.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Chưa có dữ liệu rủi ro sản xuất.</Typography>
          ) : items.slice(0, 6).map((item) => (
            <Stack
              key={`${item.orderId}:${item.orderItemId}:${item.inProgressId ?? 0}`}
              spacing={0.75}
              sx={{ cursor: "pointer" }}
              onClick={() => navigate(`/order/${item.orderId}`)}
            >
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Typography variant="body2" fontWeight={700}>
                  {item.orderItemCode || item.orderCode || `#${item.orderId}`}
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
          ))}
        </Stack>

        <Divider />

        <Stack spacing={1}>
          <Typography variant="subtitle2" fontWeight={700}>Bottleneck</Typography>
          {bottlenecks.slice(0, 5).map((item) => (
            <Stack key={item.key} spacing={0.5}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">{item.label}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.activeCount} việc · risk {item.topRiskScore}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, item.topRiskScore)}
                color={item.topRiskScore >= 80 ? "error" : item.topRiskScore >= 50 ? "warning" : "primary"}
              />
            </Stack>
          ))}
        </Stack>

        {recommendations.length > 0 ? (
          <>
            <Divider />
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={700}>Đề xuất điều phối</Typography>
              {recommendations.slice(0, 3).map((item) => (
                <Stack key={item.id} direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Typography variant="body2">
                    Gán cho {item.targetName}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={applyingId === item.id}
                    onClick={() => applyRecommendation(item)}
                  >
                    Áp dụng
                  </Button>
                </Stack>
              ))}
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
