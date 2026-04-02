import { NotificationList } from "@core/notification";
import { registerSlot } from "@root/core/module/registry";

function NotificationListWidget() {
  return (
    <>
      <NotificationList />
    </>
  );
}

registerSlot({
  id: "notification",
  name: "notification:left",
  render: () => <NotificationListWidget />,
});
