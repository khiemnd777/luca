import { useAsync } from "@root/core/hooks/use-async";
import { countUnread } from "@core/notification/notification.api";
import { NotifierChip } from "@root/shared/components/notification/notifier-chip";

type NotificationChipProps = {
  collapsed?: boolean;
};

export function NotificationChip({ collapsed = false }: NotificationChipProps) {
  const { data: count } = useAsync<number>(() => countUnread(), [], {
    key: "notification-unread-count",
  });

  return (
    <>
      <NotifierChip count={count} collapsed={collapsed} />
    </>
  )
}
