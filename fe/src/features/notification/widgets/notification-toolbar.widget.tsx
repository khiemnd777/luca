import { registerSlot } from "@root/core/module/registry";
import NotificationIcon from "@root/features/notification/components/notification-icon.component"


function NotificationToolbarWidget() {
  return (
    <>
      <NotificationIcon />
    </>
  );
}

registerSlot({
  id: "notification",
  name: "toolbar",
  render: () => <NotificationToolbarWidget />,
  priority: 99,
});
