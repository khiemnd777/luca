import { useCallback, useEffect, useRef, useState } from "react";
import type { UIEvent } from "react";
import { Box, CircularProgress, IconButton, List, ListItem, Stack } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import type { NotificationModel } from "@core/notification/notification.model";
import { deleteNotification, listPaginated, markAsRead } from "@core/notification/notification.api";
import { navigate } from "@core/navigation/navigate";
import { useAsync } from "@core/hooks/use-async";
import { ConfirmDialog } from "@shared/components/dialog/confirm-dialog";
import { getNotificationRenderer } from "./notification-renderer";

type NotificationListProps = {
  onSelect?: (notification: NotificationModel) => void;
};

export default function NotificationList({ onSelect }: NotificationListProps) {
  const pageSize = 20;
  const [notifications, setNotifications] = useState<NotificationModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const reqCounter = useRef(0);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const mountedRef = useRef(true);
  const [confirmDelete, setConfirmDelete] = useState<NotificationModel | null>(null);
  const [request, setRequest] = useState<{ page: number; replace: boolean; token: number } | null>(
    null
  );

  const loadPage = useCallback(
    (nextPage: number, replace: boolean) => {
      if (loadingRef.current || loadingMoreRef.current) return;
      const token = ++reqCounter.current;

      if (replace) {
        loadingRef.current = true;
        setLoading(true);
      } else {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      }

      setRequest({ page: nextPage, replace, token });
    },
    [pageSize]
  );

  useAsync(
    () => {
      if (!request) return Promise.resolve(null);
      return listPaginated({ limit: pageSize, page: request.page });
    },
    [request, pageSize],
    {
      key: "notification-list",
      onSuccess: (result) => {
        if (!request || !result) return;
        if (!mountedRef.current || request.token !== reqCounter.current) return;
        const items = result?.items ?? [];
        const total = result?.total;
        setNotifications((prev) => {
          const next = request.replace ? items : [...prev, ...items];
          const loadedAll =
            typeof total === "number" ? next.length >= total : items.length < pageSize;
          setHasMore(!loadedAll);
          return next;
        });
        setPage(request.page);
        setLoading(false);
        setLoadingMore(false);
        loadingRef.current = false;
        loadingMoreRef.current = false;
      },
      onError: () => {
        if (!request) return;
        if (!mountedRef.current || request.token !== reqCounter.current) return;
        if (request.replace) setNotifications([]);
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        loadingRef.current = false;
        loadingMoreRef.current = false;
      },
    }
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    loadPage(0, true);
  }, [loadPage]);

  const loadNextPage = useCallback(() => {
    if (!hasMore || loading || loadingMore) return;
    loadPage(page + 1, false);
  }, [hasMore, loadPage, loading, loadingMore, page]);

  const handleScroll = useCallback(
    (event: UIEvent<HTMLUListElement>) => {
      const el = event.currentTarget;
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 32;
      if (nearBottom) {
        loadNextPage();
      }
    },
    [loadNextPage]
  );

  const handleMarkAsRead = (notification: NotificationModel) => {
    if (!notification.id) return;
    markAsRead(notification.id)
      .then((updated) => {
        if (!updated) return;
        setNotifications((prev) =>
          prev.map((item) => (item.id === notification.id ? { ...item, ...updated } : item))
        );
      })
      .catch(() => undefined);
  };

  const handleNavigate = (notification: NotificationModel, action?: string) => {
    const data = notification.data as { href?: string; action?: string } | undefined;
    const target = action ?? data?.href ?? data?.action;
    if (typeof target !== "string" || target.trim() === "") return;
    navigate(target);
  };

  const handleClick = (notification: NotificationModel) => {
    handleMarkAsRead(notification);
    handleNavigate(notification);
    onSelect?.(notification);
  };

  const handleDelete = (notification: NotificationModel) => {
    if (!notification.id) return;
    deleteNotification(notification.id)
      .then(() => {
        setNotifications((prev) => prev.filter((item) => item.id !== notification.id));
      })
      .catch(() => undefined);
  };

  return (
    <List disablePadding onScroll={handleScroll}>
      {loading ? (
        <ListItem disableGutters>
          <Box sx={{ display: "flex", justifyContent: "center", width: "100%", py: 2 }}>
            <CircularProgress size={20} />
          </Box>
        </ListItem>
      ) : null}
      {notifications.map((notification, index) => {
        const entry =
          getNotificationRenderer(notification.type ?? "") ||
          getNotificationRenderer("__default__");

        const renderer =
          entry?.renderer ??
          ((_item: NotificationModel) => <span>{"Thông báo"}</span>);

        const content = renderer(notification, {
          markAsRead: () => handleMarkAsRead(notification),
          onAction: (action) => handleNavigate(notification, action),
          onClick: () => handleClick(notification),
          icon: entry?.icon,
        });

        const key =
          notification.id ??
          `${notification.type ?? "notification"}:${notification.createdAt ?? ""}:${index}`;

        return (
          <ListItem
            key={key}
            disablePadding
            sx={{ mb: index === notifications.length - 1 ? 0 : 1 }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
              <Box sx={{ flex: 1, minWidth: 0 }} onClick={() => handleClick(notification)}>
                {content}
              </Box>
              <IconButton
                size="small"
                aria-label="Delete notification"
                onClick={(event) => {
                  event.stopPropagation();
                  setConfirmDelete(notification);
                }}
              >
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>
          </ListItem>
        );
      })}
      {loadingMore ? (
        <ListItem disableGutters>
          <Box sx={{ display: "flex", justifyContent: "center", width: "100%", py: 2 }}>
            <CircularProgress size={20} />
          </Box>
        </ListItem>
      ) : null}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Xóa?"
        content="Bạn có chắc muốn xóa?"
        confirmText="Xóa"
        cancelText="Hủy"
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) handleDelete(confirmDelete);
          setConfirmDelete(null);
        }}
      />
    </List>
  );
}
