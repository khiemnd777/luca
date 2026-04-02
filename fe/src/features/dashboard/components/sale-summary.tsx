import { Grid, Card, CardContent, Typography, Stack } from "@mui/material";
import { ResponsiveGrid } from "@root/shared/components/ui/responsive-grid";

type SalesKPIs = {
  totalRevenue: number;
  orderItemsCount: number;
  growthPercent?: number | null;
};

type Props = {
  data: SalesKPIs;
  rangeText: string;
};

export function SalesSummary({ data, rangeText }: Props) {
  const { totalRevenue, orderItemsCount, growthPercent } = data;

  const growthColor =
    growthPercent == null
      ? "text.secondary"
      : growthPercent >= 0
        ? "success.main"
        : "error.main";

  return (
    <ResponsiveGrid xs={1} sm={1} md={3} lg={3} xl={3}>
      <Grid spacing={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Tổng doanh số {rangeText}
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {totalRevenue.toLocaleString()} ₫
            </Typography>
            <Typography variant="caption" color="text.secondary">
              &nbsp;
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid spacing={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Số đơn mới {rangeText}
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {orderItemsCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              tính cả đơn làm lại
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid spacing={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Tăng / giảm doanh số
            </Typography>
            <Stack direction="row" alignItems="baseline" spacing={0.5}>
              <Typography variant="h5" fontWeight={700} color={growthColor}>
                {growthPercent == null
                  ? "—"
                  : `${growthPercent > 0 ? "+" : ""}${growthPercent}%`}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              so với kỳ trước
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </ResponsiveGrid>
  );
}

/* TODO: Generate:
  SaleKPISection.tsx
import { Grid, Card, CardContent, Typography, Stack } from "@mui/material";

type SalesKPIs = {
  totalRevenue: number;
  orderItemsCount: number;
  growthPercent?: number | null;
};

type Props = {
  kpis: SalesKPIs;
};

export function SalesKPISection({ kpis }: Props) {
  const { totalRevenue, orderItemsCount, growthPercent } = kpis;

  const growthColor =
    growthPercent == null
      ? "text.secondary"
      : growthPercent >= 0
      ? "success.main"
      : "error.main";

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Tổng doanh số
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {totalRevenue.toLocaleString()} ₫
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Số đơn
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {orderItemsCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              (theo order items)
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Tăng / giảm
            </Typography>
            <Stack direction="row" alignItems="baseline" spacing={0.5}>
              <Typography
                variant="h5"
                fontWeight={700}
                color={growthColor}
              >
                {growthPercent == null
                  ? "—"
                  : `${growthPercent > 0 ? "+" : ""}${growthPercent}%`}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              so với kỳ trước
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

  SaleLineChart.tsx
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, Typography } from "@mui/material";

type LineItem = {
  date: string;   // yyyy-mm-dd
  revenue: number;
};

type Props = {
  data: LineItem[];
};

export function SalesLineChart({ data }: Props) {
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>
          Doanh số theo ngày
        </Typography>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(v) =>
                new Date(v).toLocaleDateString("vi-VN")
              }
            />
            <YAxis
              tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}tr`}
            />
            <Tooltip
              formatter={(value: number) =>
                `${value.toLocaleString()} ₫`
              }
              labelFormatter={(label) =>
                new Date(label).toLocaleDateString("vi-VN")
              }
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#1976d2"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
  
  API from backend:
app.RouterGet(router, "/:dept_id<int>/dashboard/case-daily-sales-stats/summary", h.Summary)
app.RouterGet(router, "/:dept_id<int>/dashboard/case-daily-sales-stats/daily", h.Daily)
app.RouterGet(router, "/:dept_id<int>/dashboard/case-daily-sales-stats/report", h.GetReport) //?range=7d Supported range values: today, 7d, 30d.

func (h *CaseDailySalesStatsHandler) Summary(c *fiber.Ctx) error {
  if err := rbac.GuardAnyPermission(c, h.deps.Ent.(*generated.Client), "order.view"); err != nil {
    return client_error.ResponseError(c, fiber.StatusForbidden, err, err.Error())
  }

  deptID, err := resolveDepartmentID(c)
  if err != nil {
    return client_error.ResponseError(c, fiber.StatusBadRequest, err, err.Error())
  }

  fromDateRaw := utils.GetQueryAsString(c, "from_date")
  if fromDateRaw == "" {
    return client_error.ResponseError(c, fiber.StatusBadRequest, nil, "invalid from_date")
  }
  fromDate, err := utils.ParseDate(fromDateRaw)
  if err != nil {
    return client_error.ResponseError(c, fiber.StatusBadRequest, err, "invalid from_date")
  }

  toDateRaw := utils.GetQueryAsString(c, "to_date")
  if toDateRaw == "" {
    return client_error.ResponseError(c, fiber.StatusBadRequest, nil, "invalid to_date")
  }
  toDate, err := utils.ParseDate(toDateRaw)
  if err != nil {
    return client_error.ResponseError(c, fiber.StatusBadRequest, err, "invalid to_date")
  }

  previousFromRaw := utils.GetQueryAsString(c, "previous_from_date")
  if previousFromRaw == "" {
    return client_error.ResponseError(c, fiber.StatusBadRequest, nil, "invalid previous_from_date")
  }
  previousFrom, err := utils.ParseDate(previousFromRaw)
  if err != nil {
    return client_error.ResponseError(c, fiber.StatusBadRequest, err, "invalid previous_from_date")
  }

  previousToRaw := utils.GetQueryAsString(c, "previous_to_date")
  if previousToRaw == "" {
    return client_error.ResponseError(c, fiber.StatusBadRequest, nil, "invalid previous_to_date")
  }
  previousTo, err := utils.ParseDate(previousToRaw)
  if err != nil {
    return client_error.ResponseError(c, fiber.StatusBadRequest, err, "invalid previous_to_date")
  }

  res, err := h.svc.Summary(
    c.UserContext(),
    deptID,
    fromDate,
    toDate,
    previousFrom,
    previousTo,
  )
  if err != nil {
    return client_error.ResponseError(c, fiber.StatusInternalServerError, err, err.Error())
  }

  return c.Status(fiber.StatusOK).JSON(res)
}

func (h *CaseDailySalesStatsHandler) Daily(c *fiber.Ctx) error {
  if err := rbac.GuardAnyPermission(c, h.deps.Ent.(*generated.Client), "order.view"); err != nil {
    return client_error.ResponseError(c, fiber.StatusForbidden, err, err.Error())
  }

  deptID, err := resolveDepartmentID(c)
  if err != nil {
    return client_error.ResponseError(c, fiber.StatusBadRequest, err, err.Error())
  }

  fromDateRaw := utils.GetQueryAsString(c, "from_date")
  if fromDateRaw == "" {
    return client_error.ResponseError(c, fiber.StatusBadRequest, nil, "invalid from_date")
  }
  fromDate, err := utils.ParseDate(fromDateRaw)
  if err != nil {
    return client_error.ResponseError(c, fiber.StatusBadRequest, err, "invalid from_date")
  }

  toDateRaw := utils.GetQueryAsString(c, "to_date")
  if toDateRaw == "" {
    return client_error.ResponseError(c, fiber.StatusBadRequest, nil, "invalid to_date")
  }
  toDate, err := utils.ParseDate(toDateRaw)
  if err != nil {
    return client_error.ResponseError(c, fiber.StatusBadRequest, err, "invalid to_date")
  }

  res, err := h.svc.Daily(c.UserContext(), deptID, fromDate, toDate)
  if err != nil {
    return client_error.ResponseError(c, fiber.StatusInternalServerError, err, err.Error())
  }

  return c.Status(fiber.StatusOK).JSON(res)
}
func (h *CaseDailySalesStatsHandler) GetReport(c *fiber.Ctx) error {
  if err := rbac.GuardAnyPermission(c, h.deps.Ent.(*generated.Client), "order.view"); err != nil {
    return client_error.ResponseError(c, fiber.StatusForbidden, err, err.Error())
  }

  deptID, err := resolveDepartmentID(c)
  if err != nil {
    return client_error.ResponseError(c, fiber.StatusBadRequest, err, err.Error())
  }

  rangeRaw := utils.GetQueryAsString(c, "range")
  if rangeRaw == "" {
    return client_error.ResponseError(c, fiber.StatusBadRequest, nil, "invalid range")
  }

  r := model.Range(rangeRaw)
  switch r {
  case model.RangeToday, model.Range7d, model.Range30d:
  default:
    return client_error.ResponseError(c, fiber.StatusBadRequest, nil, "invalid range")
  }

  res, err := h.svc.GetReport(c.UserContext(), deptID, r)
  if err != nil {
    return client_error.ResponseError(c, fiber.StatusInternalServerError, err, err.Error())
  }

  return c.Status(fiber.StatusOK).JSON(res)
}

  Model:
type SalesSummary struct {
  TotalRevenue    float64  `json:"total_revenue,omitempty"`
  OrderItemsCount int      `json:"order_items_count,omitempty"`
  PrevRevenue     float64  `json:"prev_revenue,omitempty"`
  GrowthPercent   *float64 `json:"growth_percent,omitempty"`
}

type SalesDailyItem struct {
  Date    time.Time `json:"date,omitempty"`
  Revenue float64   `json:"revenue,omitempty"`
}
*/
