import { registerSlot } from "@root/core/module/registry";
import { SectionCard } from "@shared/components/ui/section-card";
import EventNoteIcon from '@mui/icons-material/EventNote';

import {
  Stack,
  Typography,
  CircularProgress,
  Chip,
} from "@mui/material";

import { processesForStaff } from "../api/order-item-process.api";
import { updateStatus } from "../api/order.api";
import { useAsync } from "@root/core/hooks/use-async";
import { openFormDialog } from "@root/core/form/form-dialog.service";
import { useAuth } from "@root/core/auth/use-auth";
import { priorityColor } from "@root/shared/utils/order.utils";
import ResponsiveStatusBoard from "@root/shared/components/status-board/responsive-status-board";
import {
  buildProcessNameLabel,
  buildProductNameLabel,
  buildSectionNameLabel,
} from "../utils/order.utils";

export function OrderProcessBoardWidget() {
  const { user: authUser } = useAuth();

  const { data: list, loading } = useAsync(() => {
    return (async () => {
      if (!authUser?.id) return [];
      const data = await processesForStaff(authUser.id);
      return data;
    })();
  }, [authUser?.id],
    {
      key: `order-process-board`,
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
          openFormDialog("order-process-staff", { initial: obj });
        }}
        onStatusChange={async (id, newStatus) => {
          await updateStatus(0, id, newStatus);
        }}
      />

    </SectionCard>
  );
}

registerSlot({
  id: "order-process-board",
  name: "order-process:left",
  priority: 99,
  render: () => <OrderProcessBoardWidget />,
});
