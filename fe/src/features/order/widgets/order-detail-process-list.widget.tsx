import { registerSlot } from "@root/core/module/registry";
import { useParams } from "react-router-dom";
import { SectionCard } from "@shared/components/ui/section-card";
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';

import {
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  CircularProgress,
} from "@mui/material";

import { formatDateTime } from "@root/shared/utils/datetime.utils";
import type { OrderItemProcessModel } from "../model/order-item-process.model";
import { processes } from "../api/order-item-process.api";
import { id } from "../api/order.api";
import { AutoForm } from "@root/core/form/auto-form";
import { IfPermission } from "@root/core/auth/if-permission";
import { SafeButton } from "@root/shared/components/button/safe-button";
import { useAsync } from "@root/core/hooks/use-async";
import { buildProductProcessLabel, buildProductLabel } from "../utils/order.utils";

export function OrderDetailProcessesListWidget() {
  const { orderId, orderItemId } = useParams();

  const { data: list, loading } = useAsync<OrderItemProcessModel[]>(() => {
    return (async () => {
      if (!orderId) return [];

      let realOrderItemId: number;

      if (!orderItemId) {
        const detail = await id(Number(orderId));
        realOrderItemId = detail.latestOrderItem?.id;
      } else {
        realOrderItemId = Number(orderItemId);
      }

      if (!realOrderItemId) {
        return [];
      }

      return processes(Number(orderId), realOrderItemId);
    })();
  }, [orderId, orderItemId], { key: "order-detail-processes-list" });

  return (
    <SectionCard title="Công đoạn gia công" extra={
      <>
        <IfPermission permissions={["order.create"]}>
          <SafeButton
            variant="outlined"
            startIcon={<SaveOutlinedIcon />}
          >
            Lưu
          </SafeButton>
        </IfPermission>
      </>
    }>
      {loading && (
        <Stack alignItems="center" py={2}>
          <CircularProgress size={22} />
        </Stack>
      )}

      {!loading && list && list.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          Không có công đoạn nào.
        </Typography>
      )}

      {!loading && list && list.length > 0 && (
        <List dense>
          {list.map((it) => (
            <ListItem
              key={it.id}
              sx={{
                flexDirection: "column",
                alignItems: "stretch",
                borderBottom: "1px solid #3333",
                py: 2,
              }}
            >
              <ListItemText
                sx={{ mb: 1 }}
                primary={
                  <Stack spacing={0.5}>
                    <Typography fontWeight={600}>
                      {buildProductProcessLabel(it) || "—"}
                    </Typography>
                    {buildProductLabel(it) ? (
                      <Typography variant="caption" color="text.secondary">
                        Sản phẩm: {buildProductLabel(it)}
                      </Typography>
                    ) : null}
                  </Stack>
                }
                secondary={
                  <Stack spacing={0.5}>
                    <Typography variant="caption">
                      Bắt đầu: {formatDateTime(it.startedAt)}
                    </Typography>
                    <Typography variant="caption">
                      Hoàn thành: {formatDateTime(it.completedAt)}
                    </Typography>
                  </Stack>
                }
              />

              {/* Form Assignee */}
              <Stack width="100%">
                <AutoForm
                  name={`order-processes`}
                  initial={it}
                />
              </Stack>
            </ListItem>

          ))}
        </List>
      )}
    </SectionCard>
  );
}

registerSlot({
  id: "order-detail-processes-list",
  name: "_order-detail:right",
  priority: 99,
  render: () => <OrderDetailProcessesListWidget />,
});

registerSlot({
  id: "order-detail-processes-list",
  name: "_order-detail-historical:right",
  priority: 99,
  render: () => <OrderDetailProcessesListWidget />,
});
