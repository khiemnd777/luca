import { useEffect } from "react";
import { Stack, Typography } from "@mui/material";
import { useWebSocket } from "@root/core/network/websocket/use-web-socket";
import { invalidate } from "@core/hooks/use-async";
import { registerWS } from "@root/core/network/websocket/ws-widgets";
import { stack } from "@root/core/network/websocket/ws-stack";
import { mapper } from "@root/core/mapper/auto-mapper";

type OrderCheckinNotificationData = {
  leaderId?: number | string;
  leaderName?: string;
  orderItemId?: number | string;
  orderItemCode?: string;
  sectionName?: string;
  processName?: string;
  href?: string;
};

function NotificationStackWidget(msg: any) {
  if (msg) {
    console.log(msg);
    const result = mapper.map<any, OrderCheckinNotificationData>("Common", msg.payload.payload, "dto_to_model");
    return (
      <Stack spacing={0.5}>
        <Typography variant="subtitle2">Đơn hàng #{result.orderItemCode} đang chờ xử lý</Typography>
        {/* <Typography variant="body2" color="text.secondary">
          {message}
        </Typography> */}
      </Stack>
    );
  }
  return null;
}

function NotificationWSCheckinWidget() {
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage?.type === "order:checkin") {
      stack(<NotificationStackWidget payload={lastMessage} />);
      invalidate("notification-unread-count");
      invalidate("notification-list");
      invalidate("notification-list-for-clear-all");
    }
  }, [lastMessage]);

  return null;
}

registerWS(<NotificationWSCheckinWidget />);
