import type { ModuleDescriptor } from "@root/core/module/types";
import { registerModule } from "@root/core/module/registry";
import NotificationsIcon from '@mui/icons-material/Notifications';
import { NotificationChip } from "./components/notification-chip.component";

const mod: ModuleDescriptor = {
  id: "notification",
  routes: [
    {
      key: "notification",
      label: "Thông báo",
      title: "Thông báo",
      path: "/notification",
      icon: <NotificationsIcon />,
      chip: <NotificationChip />,
      hidden: true,
      priority: 9998,
    },
  ],
};

registerModule(mod);
