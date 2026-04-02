import { useAsync } from "@root/core/hooks/use-async";
import { countUnread } from "@core/notification/notification.api";
import { NotifierChip } from "@root/shared/components/notification/notifier-chip";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { Box } from "@mui/material";
import { navigate } from "@root/core/navigation/navigate";

export default function NotificationIcon() {
  const { data: count } = useAsync<number>(() => countUnread(), [], {
    key: "notification-unread-count",
  });

  return (
    <Box
      onClick={() => navigate("/notification")}
      sx={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <NotificationsIcon />
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          transform: "translate(50%, -50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          pointerEvents: "none",
        }}
      >
        <NotifierChip count={count} />
      </Box>
    </Box>
  );
}
