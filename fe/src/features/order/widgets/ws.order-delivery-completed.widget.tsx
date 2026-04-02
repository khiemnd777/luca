import { useEffect } from "react";
import { Stack, Typography } from "@mui/material";
import { invalidate } from "@core/hooks/use-async";
import { mapper } from "@root/core/mapper/auto-mapper";
import { useWebSocket } from "@root/core/network/websocket/use-web-socket";
import { stack } from "@root/core/network/websocket/ws-stack";
import { registerWS } from "@root/core/network/websocket/ws-widgets";

type OrderDeliveryCompletedNotificationData = {
  departmentId?: number | string;
  adminId?: number | string;
  orderItemId?: number | string;
  orderItemCode?: string;
  sectionName?: string;
  processName?: string;
  href?: string;
};

function NotificationStackWidget(msg: any) {
  if (!msg) return null;

  const result = mapper.map<any, OrderDeliveryCompletedNotificationData>(
    "Common",
    msg.payload.payload,
    "dto_to_model"
  );

  return (
    <Stack spacing={0.5}>
      <Typography variant="subtitle2">
        Đơn hàng #{result.orderItemCode} đã giao hoàn tất
      </Typography>
    </Stack>
  );
}

function NotificationWSWidget() {
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage?.type === "order:delivery:completed") {
      stack(<NotificationStackWidget payload={lastMessage} />);
      invalidate("notification-unread-count");
      invalidate("notification-list");
      invalidate("notification-list-for-clear-all");
    }
  }, [lastMessage]);

  return null;
}

registerWS(<NotificationWSWidget />);
