import { useParams } from "react-router-dom";
import { SectionCard } from "@shared/components/ui/section-card";
import EventNoteIcon from '@mui/icons-material/EventNote';

import {
  Stack,
  Typography,
  CircularProgress,
  Chip,
} from "@mui/material";

import { processes } from "../api/order-item-process.api";
import { id, updateStatus } from "../api/order.api";
import { useAsync } from "@root/core/hooks/use-async";
import { openFormDialog } from "@root/core/form/form-dialog.service";
import { priorityColor } from "@root/shared/utils/order.utils";
import ResponsiveStatusBoard from "@root/shared/components/status-board/responsive-status-board";
import {
  buildProcessNameLabel,
  buildProductNameLabel,
  buildSectionNameLabel,
} from "../utils/order.utils";

export function OrderDetailProcessesStatusBoardWidget() {
  const { orderId, orderItemId } = useParams();

  const { data: list, loading } = useAsync(() => {
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

      const data = await processes(Number(orderId), realOrderItemId);
      return data;
    })();
  }, [orderId, orderItemId],
    {
      key: `order-processes-board`,
    });

  return (
    <SectionCard title="Công đoạn gia công">
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

      <ResponsiveStatusBoard
        items={(list ?? []).map(it => ({
          id: it.id!,
          status: it.customFields?.status || "waiting",
          priority: it.customFields?.priority || "normal",
          obj: it,
        }))}
        statuses={[
          { label: "Đang chờ", value: "waiting" },
          { label: "Đang gia công", value: "in_progress" },
          { label: "Chờ nha sĩ kiểm tra", value: "waiting_dentist_review", disableDrop: true, disableDrag: true },
          { label: "Kiểm thử", value: "qc" },
          { label: "Làm lại", value: "rework" },
          { label: "Hoàn thành", value: "completed" },
        ]}
        priorityToColor={(priority) => priorityColor(priority)}
        renderCard={(_id, _status, o) => (
          <Stack spacing={1}>
            {buildProductNameLabel(o) ? (
              <Typography fontWeight={700}>{buildProductNameLabel(o)}</Typography>
            ) : null}
            {buildSectionNameLabel(o) ? (
              <Typography variant="body2" color="text.secondary">
                {buildSectionNameLabel(o)}
              </Typography>
            ) : null}
            {buildProcessNameLabel(o) ? (
              <Typography variant="body2" fontWeight={600} color="text.secondary">
                {buildProcessNameLabel(o)}
              </Typography>
            ) : null}
            <Stack direction="row" alignItems="left" spacing={1}>
              {o.assignedName &&
                <Chip size="small" label={o.assignedName} />
              }
            </Stack>
            <Stack direction="column" alignItems="left" spacing={1}>
              {o.customFields?.note && (
                <EventNoteIcon
                  fontSize="small"
                  color="action"
                  style={{ opacity: 0.8 }}
                />
              )}
            </Stack>
          </Stack>
        )}
        onCardClick={(_id, _status, obj) => {
          openFormDialog("order-processes", { initial: obj });
        }}
        onStatusChange={async (id, newStatus) => {
          await updateStatus(Number(orderId ?? 0), id, newStatus);

        }}
      />

    </SectionCard>
  );
}

// registerSlot({
//   id: "order-detail-processes-status-board",
//   name: "order-detail:left",
//   priority: 98,
//   render: () => <OrderDetailProcessesStatusBoardWidget />,
// });

// registerSlot({
//   id: "order-detail-processes-status-board",
//   name: "order-detail-historical:left",
//   priority: 98,
//   render: () => <OrderDetailProcessesStatusBoardWidget />,
// });
