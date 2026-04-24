import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import { registerSlot } from "@root/core/module/registry";
import { SectionCard } from "@root/shared/components/ui/section-card";
import {
  deletePushSubscription,
  listPushSubscriptions,
  sendPushTestNotification,
} from "@root/core/notification/push-notification.api";
import {
  detectPlatform,
  enablePushNotifications,
  getInstallMode,
  isStandaloneMode,
  supportsPushNotifications,
  syncCurrentPushSubscription,
} from "@root/core/notification/push-notification.manager";
import type { PushSubscriptionRecord } from "@root/core/notification/push-notification.types";
import toast from "react-hot-toast";

function formatDate(value?: string | null): string {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";
  return date.toLocaleString();
}

function PushNotificationWidget() {
  const [items, setItems] = useState<PushSubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const supported = supportsPushNotifications();
  const platform = detectPlatform();
  const standalone = isStandaloneMode();
  const permissionState =
    typeof Notification === "undefined" ? "default" : Notification.permission;

  const load = async () => {
    setLoading(true);
    try {
      const synced = await syncCurrentPushSubscription().catch(() => ({ synced: false }));
      const data = await listPushSubscriptions();
      setItems(data);
      if (synced?.synced) {
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleEnable = async () => {
    setPending(true);
    try {
      await enablePushNotifications();
      toast.success("Đã bật nhận notification trên thiết bị này.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể bật notification.");
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async (item: PushSubscriptionRecord) => {
    setPending(true);
    try {
      await deletePushSubscription(item.id);
      toast.success("Đã gỡ thiết bị khỏi danh sách nhận notification.");
      await load();
    } catch {
      toast.error("Không thể gỡ thiết bị này.");
    } finally {
      setPending(false);
    }
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    try {
      const stats = await sendPushTestNotification();
      if ((stats.sent ?? 0) > 0) {
        toast.success("Đã gửi notification thử nghiệm.");
      } else {
        toast.error("Không có subscription khả dụng để gửi thử.");
      }
      await load();
    } catch {
      toast.error("Gửi notification thử nghiệm thất bại.");
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <SectionCard
      title="Notification thiết bị"
      extra={
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={sendingTest ? <CircularProgress size={14} /> : <SendOutlinedIcon />}
            disabled={sendingTest || pending || items.length === 0}
            onClick={handleSendTest}
          >
            Gửi thử
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={pending ? <CircularProgress size={14} color="inherit" /> : <NotificationsActiveOutlinedIcon />}
            disabled={pending || !supported}
            onClick={handleEnable}
          >
            Bật thông báo
          </Button>
        </Stack>
      }
    >
      <Stack spacing={2}>
        {!supported && (
          <Alert severity="warning">
            Thiết bị hoặc trình duyệt hiện tại không hỗ trợ Web Push. Hãy dùng Safari/Chrome mới hơn trên HTTPS.
          </Alert>
        )}

        {supported && platform === "ios" && !standalone && (
          <Alert severity="info">
            Trên iPhone/iPad, bạn cần dùng <strong>Add to Home Screen</strong> rồi mở webapp ở chế độ standalone trước khi bật notification.
          </Alert>
        )}

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip label={`Platform: ${platform}`} size="small" />
          <Chip label={`Mode: ${getInstallMode()}`} size="small" />
          <Chip label={`Permission: ${permissionState}`} size="small" />
        </Stack>

        <Typography variant="body2" color="text.secondary">
          Notification device dùng để nhận thông báo khi webapp đang ở nền hoặc đã đóng. In-app notification hiện tại vẫn tiếp tục là nguồn hiển thị chính trong ứng dụng.
        </Typography>

        {loading ? (
          <Stack direction="row" alignItems="center" spacing={1}>
            <CircularProgress size={18} />
            <Typography variant="body2">Đang tải danh sách thiết bị...</Typography>
          </Stack>
        ) : items.length === 0 ? (
          <Alert severity="info">
            Chưa có thiết bị nào đăng ký nhận notification cho tài khoản này.
          </Alert>
        ) : (
          <List disablePadding>
            {items.map((item) => (
              <ListItem
                key={item.id}
                divider
                disableGutters
                secondaryAction={
                  <Button
                    color="error"
                    size="small"
                    startIcon={<DeleteOutlineOutlinedIcon />}
                    disabled={pending}
                    onClick={() => void handleDelete(item)}
                  >
                    Gỡ
                  </Button>
                }
              >
                <ListItemText
                  primary={item.deviceLabel || item.platform}
                  secondary={
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Install mode: {item.installMode} | Permission: {item.permissionState}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Cập nhật gần nhất: {formatDate(item.updatedAt)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Gửi thành công gần nhất: {formatDate(item.lastSentAt)}
                      </Typography>
                      {item.lastError && (
                        <Typography variant="caption" color="error.main">
                          Lỗi gần nhất: {item.lastError}
                        </Typography>
                      )}
                    </Stack>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Stack>
    </SectionCard>
  );
}

registerSlot({
  id: "account-push-notification",
  name: "auth:right",
  priority: 1,
  render: () => <PushNotificationWidget />,
});
