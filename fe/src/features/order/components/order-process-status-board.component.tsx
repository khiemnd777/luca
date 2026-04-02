import React from "react";
import { useParams } from "react-router-dom";
import EventNoteIcon from '@mui/icons-material/EventNote';
import MapsHomeWorkIcon from '@mui/icons-material/MapsHomeWork';
import FactCheckIcon from '@mui/icons-material/FactCheck';

import {
  Stack,
  Typography,
  CircularProgress,
  Chip,
} from "@mui/material";

import { processes } from "../api/order-item-process.api";
import { id, updateStatus } from "../api/order.api";
import { useAsync } from "@root/core/hooks/use-async";
import { priorityColor } from "@root/shared/utils/order.utils";
import ResponsiveStatusBoard from "@root/shared/components/status-board/responsive-status-board";
import { Section } from "@root/shared/components/ui/section";
import { OrderProcessInProgressDialog } from "./order-process-inprogress-dialog.component";

export function OrderProcessesStatusBoard() {
  const { orderId, orderItemId } = useParams();
  const [inProgressOpen, setInProgressOpen] = React.useState(false);
  const [selectedProcessId, setSelectedProcessId] = React.useState<number | null>(null);

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
    <Section>
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
          color: it.color,
          obj: it,
        }))}
        statuses={[
          { label: "Đang chờ", value: "waiting" },
          { label: "Đang gia công", value: "in_progress" },
          { label: "Kiểm thử", value: "qc" },
          { label: "Làm lại", value: "rework" },
          { label: "Hoàn thành", value: "completed" },
        ]}
        priorityToColor={(priority) => priorityColor(priority)}
        renderCard={(_id, _status, o) => (
          <Stack spacing={1}>
            {o.sectionName && (
              <Stack direction="row" alignItems="left" spacing={1}>
                <MapsHomeWorkIcon fontSize="small" />
                <Typography fontWeight={600} color={o.color ?? undefined}>{o.sectionName}</Typography>
              </Stack>
            )}
            <Stack direction="row" alignItems="left" spacing={1}>
              <FactCheckIcon fontSize="small" />
              <Typography fontWeight={700}>{o.processName}</Typography>
            </Stack>
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
          const processId = (obj as { id?: number; Id?: number }).id ?? (obj as { Id?: number }).Id;
          if (!processId) return;
          setSelectedProcessId(processId);
          setInProgressOpen(true);
        }}
        onStatusChange={async (id, newStatus, _oldStatus) => {
          await updateStatus(Number(orderId ?? 0), id, newStatus);

        }}
      />

      <OrderProcessInProgressDialog
        open={inProgressOpen}
        processId={selectedProcessId}
        onClose={() => setInProgressOpen(false)}
      />
    </Section>
  );
}
